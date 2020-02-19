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
*/

import * as browserIpfs from '../libs/browser-ipfs.js';
import { getIpfsCache } from './ipfs-cache';
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
export async function ipfsCatPromise(ipfsHash: string): Promise<any> {
  const ipfsCache = getIpfsCache();
  const cached = await getIpfsCache().get(ipfsHash);
  if (cached) {
    return cached;
  }

  return new Promise((resolve, reject) => {
    try {
      restIpfs.cat(ipfsHash, async (error, result) => {
        if (error) {
          reject(error);
        } else {
          await ipfsCache.add(ipfsHash, result);
          resolve(result);
        }
      });
    } catch (ex) {
      reject(ex);
    }
  });
};

export { getIpfsCache }
