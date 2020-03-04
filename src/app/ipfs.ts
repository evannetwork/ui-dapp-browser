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

import { getIpfsCache } from './ipfs-cache';

/**
 * default evan.network ipfs configuration
 */
export const ipfsConfig = {
  host: 'ipfs.test.evan.network',
  ipfsCache: getIpfsCache(),
  port: '443',
  protocol: 'https',
};

/**
 * Get the api url for a given end ipfs url part.
 *
 * @param      {string}  path    path that should be added to the base path.
 */
export function getIpfsApiUrl(path: string) {
  return `${ipfsConfig.protocol}://${ipfsConfig.host}:${ipfsConfig.port}${path}`;
}

/**
 * runs the restIpfs function and wraps it into a promise call
 *
 * @param      {string}        ipfsHash  ipfs hash to load
 * @return     {Promise<any>}  ipfs address content
 */
export async function ipfsCatPromise(ipfsHash: string): Promise<any> {
  const cached = await ipfsConfig.ipfsCache.get(ipfsHash);
  let result: any = cached || await new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.onreadystatechange = async () => {
      if (req.readyState == 4) {
        await ipfsConfig.ipfsCache.add(ipfsHash, req.response);
        resolve(req.response);
      }
    };

    req.open('GET', getIpfsApiUrl(`/ipfs/${ipfsHash}`));
    req.responseType = 'arraybuffer';
    req.send();
  });

  if (result && typeof result === 'object') {
    /* old logic and contract descriptions will return a buffer, parse it and remove bad
       characters and deal with binary buffer (https://github.com/evannetwork/api-blockchain-
       core/blob/develop/src/dfs/ipfs.ts#L309) */
    const bufferedResult = Buffer.from(result);
    const decodedToUtf8 = bufferedResult.toString('utf8');
    result = decodedToUtf8.indexOf('�') === -1
      ? decodedToUtf8
      : bufferedResult.toString('binary');
  }

  return result;
}

export { getIpfsCache };
