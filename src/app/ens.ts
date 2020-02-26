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

import config from './config';
import { ipfsCatPromise } from './ipfs';
import { devLog } from './utils';

import * as stuff from '../libs/bs58.bundle';

console.log(stuff)
const bs58: any = {};
const keccak256: any = {};

// const bs58 = (window as any).bs58;
let ensCache: any = { };

/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

// check if any ens entries were loaded before
try {
  ensCache = JSON.parse(window.localStorage['evan-ens-cache']);
} catch (ex) { }

async function postToEthClient(requestString: string): Promise<any> {
  const [ , , protocol, host, defaultPort ] = config.web3Provider
    .match(/^((http[s]?|ftp|ws[s]):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?/);
  const port = defaultPort || (protocol === 'https' || protocol === 'wss') ? 443 : 8080;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `http${port === 443 ? 's' : ''}://${host}:${port}`, true);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.onload = () => resolve(JSON.parse(xhr.responseText));
    xhr.send(requestString);
  });
}

function namehash(inputName: string) {
  function dropPrefix0x(input: string) {
    return input.replace(/^0x/, '');
  }
  let node = '';
  for (let i = 0; i < 32; i += 1) {
    node += '00';
  }
  if (inputName) {
    const labels = inputName.split('.');
    for (let i = labels.length - 1; i >= 0; i -= 1) {
      const labelSha = keccak256(labels[i]);
      const buffer = Buffer.from(dropPrefix0x(node) + dropPrefix0x(labelSha), 'hex');
      node = keccak256(buffer);
    }
  } else {
    node = `0x${node}`;
  }
  return node;
}

/**
 * convert bytes32 string to IPFS hash see
 * https://www.reddit.com/r/ethdev/comments/6lbmhy/a_practical_guide_to_cheap_ipfs_hash_storage_in
 *
 * @param      str   bytes32 string
 *
 * @return     IPFS string
 */
function bytes32ToIpfsHash(str: string): string {
  // remove leading 0x
  const remove0x = str.slice(2, str.length);
  // add back the multihash id
  const bytes = Buffer.from(`1220${remove0x}`, 'hex');
  const hash = bs58.encode(bytes);
  return hash;
}

/**
 * Resolves the content behind a ens address.
 *
 * @param      {string}  address  ens address or contract address
 */
export async function resolveContent(address: string) {
  const anyWindow = (window as any);
  // disable ens cache, when dapp-browser was redeployed
  const cacheAvailable = anyWindow.dappBrowserBuild === window.localStorage['evan-dapp-browser-build']
    && ensCache[address] && ensCache[address] !== 'invalid';

  // loading chain used to reload the ens data after 3 seconds, when cached
  let contentResolver = Promise.resolve();
  if (cacheAvailable) {
    // delay loading for 3 seconds, to wait the heavy page load is over
    if (cacheAvailable) {
      contentResolver = new Promise(resolve => setTimeout(() => resolve(), 3000));
    }
  }

  // resolve the content
  contentResolver = contentResolver.then(async () => {
    const input = '0x2dff6941';
    const urlHash = namehash(address);
    const callObj = {
      method: 'eth_call',
      params: [
        {
          data: `${input}${urlHash.replace('0x', '')}`,
          to: config.nameResolver.ensResolver,
        }
      ],
      id: 1,
      jsonrpc: '2.0'
    };

    const ethResult = await postToEthClient(JSON.stringify(callObj));
    if (ethResult.result) {
      try {
        const ipfsHash = bytes32ToIpfsHash(ethResult.result);
        const ipfsContent = JSON.parse(await ipfsCatPromise(ipfsHash));
        const dbcp = ipfsContent.public;

        // set ens cache to speed up initial loading
        if (dbcp.dapp.type === 'cached-dapp') {
          ensCache[address] = JSON.stringify(dbcp);
        } else {
          delete ensCache[address];
        }

        // save ens cache
        window.localStorage['evan-ens-cache'] = JSON.stringify(ensCache);
        return dbcp;
      } catch (ex) {
        const errMsg = `Could not parse content address of ${address}: ${ethResult.result} (${ex.message})`;
        devLog(errMsg, 'error');
        throw new Error(errMsg);
      }
    }

    throw new Error(`Could not resolve content address for ${address}`);
  });

  if (cacheAvailable) {
    return JSON.parse(ensCache[address]);
  } else {
    return contentResolver;
  }
}
