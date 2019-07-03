/*
  Copyright (C) 2018-present evan GmbH.

  This program is free software: you can redistribute it and/or modify it
  under the terms of the GNU Affero General Public License, version 3,
  as published by the Free Software Foundation.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  See the GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see http://www.gnu.org/licenses/ or
  write to the Free Software Foundation, Inc., 51 Franklin Street,
  Fifth Floor, Boston, MA, 02110-1301 USA, or download the license from
  the following URL: https://evan.network/license/

  You can be released from the requirements of the GNU Affero General Public
  License by purchasing a commercial license.
  Buying such a license is mandatory as soon as you use this software or parts
  of it on other blockchains than evan.network.

  For more information, please contact evan GmbH at this address:
  https://evan.network/license/
*/
// libraries that should be cached
let cachableDBCPs = [ ];
const utils = require('../app/utils');
const ipfsCatPromise = require('../app/ipfs').ipfsCatPromise;
let ensCache = { };

// check if any ens entries were loaded before
try {
  ensCache = JSON.parse(window.localStorage['evan-ens-cache']);
} catch (ex) { }

/**
 * Wrap data handling to be able to switch between dev and production mode =>
 * default load ens, development load from external
 *
 * @param      {string}  ensAddress  ens address to load the definition for
 * @return     {any}     The definition from ens.
 */
const getDefinitionFromEns = function(ensAddress, domain) {
  // remove domain from the end of the ensAddress to get the dapp name
  let dappName = ensAddress.split('.');
  dappName = dappName.slice(0, dappName.length - 1).join('.');

  // get correct ens address and check if a cached ens is availabled
  const validEnsAddress = ensAddress;
  const cacheAvailable = ensCache[validEnsAddress] && ensCache[validEnsAddress] !== 'invalid';

  // loading chain used to reload the ens data after 3 seconds, when cached
  let loader = Promise.resolve();

  // delay loading for 3 seconds, to wait the heavy page load is over
  if (cacheAvailable) {
    loader = new Promise(resolve => setTimeout(() => resolve(), 3000));
  }

  if (utils.isDevAvailable(dappName) && ensAddress.indexOf('0x') !== 0) {
    // load json and resolve it as stringified
    loader = loader.then(() => evanGlobals.System
      .import('external/' + dappName + '/dbcp.json!json')
      .then(dbcp => JSON.stringify(dbcp))
    );
  } else {
    // trigger the loader
    if (validEnsAddress.indexOf('Qm') === 0) {
      loader = loader.then(() => ipfsCatPromise(validEnsAddress));
    } else {
      loader = loader
        .then(utils.bccReady)
        .then(() => evanGlobals.CoreRuntime.description.getDescription(validEnsAddress));
    }
  }

  // use api to load dbcp json from ens
   loader = loader
    .then(dbcp => {
      if (dbcp) {
        try {
          dbcp = JSON.parse(dbcp);
        } catch(ex) { }

        const combinedStringified = JSON.stringify(Object.assign(dbcp.public, dbcp.private));

        // set ens cache to speed up initial loading
        if (dbcp.public && dbcp.public.dapp && dbcp.public.dapp.type === 'cached-dapp') {
          ensCache[validEnsAddress] = combinedStringified;
        } else {
          delete ensCache[validEnsAddress];
        }

        // save ens cache
        window.localStorage['evan-ens-cache'] = JSON.stringify(ensCache);

        return combinedStringified;
      } else {
        if (ensCache[validEnsAddress]) {
          // if no dbcp was found, set it invalid
          ensCache[validEnsAddress] = 'invalid';
        }

        throw new Error(`no valid dbcp on ${ validEnsAddress }`);
      }
    });

  if (cacheAvailable) {
    return ensCache[validEnsAddress];
  } else {
    return loader;
  }
};

/**
 * Handle data handling for requested files params.
 *
 * @param      {any}           params  SystemJS parameters
 * @param      {Function}  originalFetch  SystemJS original fetch function
 * @return     {Promise<any>}  resolved when everything is loaded
 */
const fetchEns = function(params) {
  // parse ens address from requested url source
  const ensAddress = params.address.split('/').pop();
  const rootDomain = ensAddress.split('.').pop();
  // check if dev domain is enabled, check for localStorage params or check for quer params
  const devDomain = window.localStorage['evan-dev-dapps-domain'] ||
    evanGlobals.queryParams['dev-domain'];
  // enable devMode automatically, when queryparams for dev domain is enabled
  const devMode = !!evanGlobals.queryParams['dev-domain'] ||
    window.localStorage['evan-developer-mode'] === 'true';

  // if the dapps dev domain is enabled, try to load the dapp from this url
  if (devMode && devDomain && ensAddress.indexOf('Qm') !== 0) {
    // replace the root domain at the end of the ens address with the dev domain
    const ensDevAddress = ensAddress.slice(
      0,
      ensAddress.lastIndexOf('.' + rootDomain)
    ) + '.' + devDomain

    // try to load from dev domain, if is 
    return Promise.resolve()
      .then(() => getDefinitionFromEns(ensDevAddress, devDomain))
      .catch(() => getDefinitionFromEns(ensAddress, rootDomain));
  } else {
    return getDefinitionFromEns(ensAddress, rootDomain);
  }
};

/**
 * use translate to handle json results => format result as common js and
   prepend an module.exports, so the json will be returned

 @param      {<type>}  load    original load function
 @return     {string}  module.exports + source, call SystemJS to return JSON
*/
const translate = function(load) {
  load.metadata.format = 'cjs';

  return 'module.exports = ' + load.source;
};

exports.fetch = fetchEns;
exports.translate = translate;
