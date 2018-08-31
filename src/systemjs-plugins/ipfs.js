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

const devLoad = function(externalFilePath, params, originalFetch) {
  params.address = 'external/' + externalFilePath;
  params.metadata = { };

  return originalFetch(params);
};

const devCoreLibs = [
  'bcc/bcc.js',
  'smartcontracts/compiled.js'
];

/**
 * Handle data handling for requested files params.
 *
 * @param      {any}           params         SystemJS parameters
 * @param      {Function}      originalFetch  SystemJS original fetch function
 * @return     {Promise<any>}  resolved when everything is loaded
 */
const fetchIpfs = function(params, originalFetch) {
  // get current window location without any postfix
  //   => http://localhost:8080/ipfs/.../.../index.html?asd=blu#125=hash8162
  //      => http://localhost:8080/ipfs/../..
  const relativeWindowLocation = (window.location.origin + window.location.pathname)
    .replace(/\/dev.html|\/index.html/g, '');

  // get the correct ipfs route without the window location
  let ipfsRoute = params.address.replace(relativeWindowLocation, '');

  // check for dev load
  if (evanGlobals.devMode) {
    for (let i = 0; i < devCoreLibs.length; i++) {
      if (ipfsRoute.indexOf(devCoreLibs[i]) !== -1 && utils.isDevAvailable(devCoreLibs[i].split('/')[0])) {
        return devLoad(devCoreLibs[i], params, originalFetch);
      }
    }
  }

  return ipfsCatPromise(ipfsRoute);
};

exports.fetch = fetchIpfs;
