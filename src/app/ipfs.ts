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

import * as browserIpfs from '../libs/browser-ipfs.js';
import * as utils from './utils';

/**
 * set the default provider for the browser ipfs for the current window location
 */
browserIpfs.default.setProvider({
  host: window.location.host.split(':')[0],
  port: window.location.port,
  protocol: window.location.protocol.replace(':', ''),
  root: ''
});

/**
 * default evan.network ipfs configuration
 */
export let ipfsConfig: any = { host: 'ipfs.test.evan.network', port: '443', protocol: 'https' };
ipfsConfig.ipfsCache = ipfsConfig.ipfsCache || null

/**
 * Rest ipfs instance
 */
export const restIpfs = getRestIpfs();

/**
 * Format browser IPFS library to match the backend ipfs interface.
 *
 * @return     {files : ipfsApi}  The rest ipfs.
 */
export function getRestIpfs(): any {
  const restIpfsConfig = JSON.parse(JSON.stringify(ipfsConfig));

  if (restIpfsConfig.protocol === 'https') {
    restIpfsConfig.port = '443';
  } else {
    restIpfsConfig.port = '8080';
  }

  browserIpfs.default.api.host = restIpfsConfig.host;
  browserIpfs.default.api.port = restIpfsConfig.port;
  browserIpfs.default.api.protocol = restIpfsConfig.protocol;

  return browserIpfs.default;
}

/**
 * runs the restIpfs function and wraps it into a promise call
 *
 * @param      {string}        ipfsHash  ipfs hash to load
 * @return     {Promise<any>}  ipfs address content
 */
export function ipfsCatPromise(ipfsHash: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      restIpfs.cat(ipfsHash, (error, result) => {
        error ? reject(error) : resolve(result);
      });
    } catch (ex) {
      reject(ex);
    }
  });
};
