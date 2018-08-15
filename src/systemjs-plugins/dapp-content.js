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
const browserIpfs = require('../libs/browser-ipfs.js');

/**
 * add css from ipfs to the current browser
 *
 * @param      {string}  origin  ifps folder path
 * @param      {string}  file    file name
 * @param      {string}  isIpns  Indicates if ipns should be used
 */
const addCSS = function(origin, file, isIpns) {
  const fileID = (origin + file).replace(/^[^a-z]+|[^\w:.-]+/gi, '');

  // add the css only if it was not applied before
  if (file.indexOf('.css') !== -1 && !document.getElementById('#' + fileID)) {
    var head  = document.getElementsByTagName('head')[0];
    var link  = document.createElement('link');

    link.id   = fileID;
    link.rel  = 'stylesheet';

    // dev mode checks
    if (utils.isDevAvailable(origin.replace('external/', '')) && origin.indexOf('Qm') !== 0) {
      link.href = `${ origin }/${ file }`;
    } else {
      link.href = browserIpfs.api_url(`/${ isIpns ? 'ipns' : 'ipfs' }/${ origin }/${ file }`);
    }

    head.appendChild(link);
  }
}

/**
 * load file content including dev switch
 *
 * @param      {any}       dbcp    dbcp description of the dapp
 * @param      {string}    file    file to load from the description
 * @param      {Function}  fetch   SystemJS original fetch function
 * @return     {any}       return value of the imported ipfs hash, if css,
 *                         returns nothing
 */
const importIpfs = function(dbcp, file, fetch) {
  let dappName = dbcp.ensAddress;

  try {
    dappName = /^(.*)\.[^.]+$/.exec(dappName)[1];
  } catch (ex) { }

  if (utils.isDevAvailable(dappName) && dappName.indexOf('0x') !== 0) {
    // load js files
    if (file.indexOf('.css') === -1) {
      return `external/${dappName}/${file}`;
    } else {
      addCSS(`external/${dappName}`, file);
    }
  } else {
    if (file.indexOf('.css') === -1) {
      return evanGlobals.restIpfs.api_url(`/${ dbcp.dapp.isIpns ? 'ipns' : 'ipfs' }/${dbcp.dapp.origin}/${file}`);
    } else {
      addCSS(dbcp.dapp.origin, file, dbcp.dapp.isIpns);
    }
  }
};

/**
 * Loads a predefined library. (bcc / smart-contracts) using a specific
 * pattern.
 *
 * @param      {string}    ensAddress     ens address of the DApp
 * @param      {string}    fileOrigin     ipfs folder hash
 * @param      {Function}  originalFetch  SystemJS original fetch
 * @return     {any}       result of the ipfs import
 */
const loadPredefinedLib = function(ensAddress, fileOrigin, originalFetch) {
  const origin = fileOrigin.split('/')[0];
  const file = fileOrigin.split('/')[1];

  // bccsystemjs will replace with correct ipfs hash before prod deployment
  return importIpfs({
      ensAddress: ensAddress,
      dapp: {
        origin: origin,
        isIpns: true
      }
    },
    file,
    originalFetch
  );
}

/**
 * Load the bcc. Includes devChecks to load local dev files, or from ipns
 * if devMode but no bcc dev files are available or from a inserted ipfs hash,
 * when it was deployed.
 *
 * @param      {Function}  originalFetch  SystemJS original import
 * @return     {any}  result of the ipfs import
 */
const loadBCCCore = function (originalFetch) {
  if (utils.isDevAvailable('bcc')) {
    return loadPredefinedLib(
      'bcc',
      'bcc/bcc.js',
      originalFetch
    );
  } else {
    return loadPredefinedLib(
      'bcc',
      'Qme9gmKpueriR7qMH5SNW3De3b9AFBkUGvFMS8ve1SuYBy/bcc.js',
      originalFetch
    );
  }
}

/**
 * Load the smart-contracts. Includes devChecks to load local dev files, or from
 * ipns if devMode but no smart-contracts dev files are available or from a
 * inserted ipfs hash, when it was deployed.
 *
 * @param      {Function}  originalFetch  SystemJS original import
 * @return     {any}       result of the ipfs import
 */
const loadSmartContracts = function(originalFetch) {
  if (utils.isDevAvailable('bcc')) {
    return loadPredefinedLib(
      'smartcontracts',
      'smartcontracts/compiled.js',
      originalFetch
    );
  } else {
    return loadPredefinedLib(
      'smartcontracts',
      'QmRMz7yzMqjbEqXNdcmqk2WMFcXtpY41Nt9CqsLwMgkF43/compiled.js',
      originalFetch
    );
  }
}


/**
 * Handle data handling for requested files params.
 *
 * @param      {any}           params         SystemJS parameters
 * @param      {Function}      originalFetch  SystemJS original fetch function
 * @return     {Promise<any>}  resolved when everything is loaded
 */
const locateDAppContent = function(params, originalFetch) {
  // allow multiple babel polyfill
  const ensAddress = params.address.split('/').pop();

  let dbcpAddressToLoad = `${ ensAddress }!ens`;

  if (ensAddress.startsWith('bcc')) {
    return loadBCCCore({ params, originalFetch });
  } else if (ensAddress.startsWith('smartcontracts')) {
    return loadSmartContracts({ params, originalFetch });
  }

  // load dbcp configuration from ens address
  return evanGlobals.System.import(dbcpAddressToLoad)
    .then(dbcp => {
      const promises = [ ];

      dbcp.ensAddress = ensAddress;

      // check for valid dbcp dapp configuration
      if (dbcp && dbcp.dapp) {
        // load entrypoint js
        promises.push(importIpfs(dbcp, dbcp.dapp.entrypoint, { params, originalFetch }));

        // iterate through all files to check for css files to load
        if (dbcp.dapp.files) {
          dbcp.dapp.files.forEach(file => {
            if (file.endsWith('.css')) {
              importIpfs(dbcp, file);
            }
          });
        }

        // wait for css and ens content to be resolved
        return Promise
          .all(promises)
          .then(results => results.pop());
      } else {
        console.error('dbcp invalid dapp');
        throw new Error('dbcp invalid dapp');
      }
    });
};

/**
 * Overwrites the fetch function to enable js loading over script tags, that
 * will reduce memory usage
 *
 @param      {any}     params         SystemJS parameters
 @param      {Function}  originalFetch  SystemJS original fetch function
 */
const fetchDAppContent = function(params, originalFetch) {
  params.metadata.scriptLoad = true;

  return originalFetch(params);
}

exports.locate = locateDAppContent;
exports.fetch = fetchDAppContent;
