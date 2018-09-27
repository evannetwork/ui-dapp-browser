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
  let dappName = ensAddress.replace(/\-/g, '').slice(
    0,
    ensAddress.lastIndexOf('.' + domain)
  );

  if (utils.isDevAvailable(dappName) && ensAddress.indexOf('0x') !== 0) {
    // load json and resolve it as stringified
    return evanGlobals.System
      .import('external/' + dappName + '/dbcp.json!json')
      .then(dbcp => JSON.stringify(
        Object.assign(dbcp.public, dbcp.private)
      ));
  } else {
    const validEnsAddress = ensAddress.replace(/-/g, '');
    let loader;

    if (validEnsAddress.indexOf('Qm') === 0) {
      loader = ipfsCatPromise(validEnsAddress);
    } else {
      loader = utils.bccReady
        .then(() => evanGlobals.CoreRuntime.description.getDescription(validEnsAddress));
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
          ensCache[validEnsAddress] = combinedStringified;
          window.localStorage['evan-ens-cache'] = JSON.stringify(ensCache);
          
          return combinedStringified;
        } else {
          // if no dbcp was found, set it invalid
          ensCache[validEnsAddress] = 'invalid';

          throw new Error(`no valid dbcp on ${ validEnsAddress }`);
        }
      });

    if (ensCache[validEnsAddress] && ensCache[validEnsAddress] !== 'invalid') {
      return ensCache[validEnsAddress];
    } else {
      return loader;
    }
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

  // if the dapps dev domain is enabled, try to load the dapp from this url
  if (window.localStorage['evan-developer-mode'] === 'true' &&
      window.localStorage['evan-dev-dapps-domain']) {
    // replace the root domain at the end of the ens address with the dev domain
    const ensDevAddress = ensAddress.slice(
      0,
      ensAddress.lastIndexOf('.' + rootDomain)
    ) + '.' + window.localStorage['evan-dev-dapps-domain']

    // try to load from dev domain, if is 
    return Promise.resolve()
      .then(() => getDefinitionFromEns(ensDevAddress, window.localStorage['evan-dev-dapps-domain']))
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
