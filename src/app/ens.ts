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
import { log } from './utils';
import bs58Bundle from '../libs/bs58.bundle';
import sha3Bundle from '../libs/js-sha3.min';
import BufferPolyFill from '../libs/buffer.polyfill';

const { Buffer } = BufferPolyFill as any;
const bs58 = (bs58Bundle as any);
const { keccak256 } = sha3Bundle as any;
const nullAddress = '0x0000000000000000000000000000000000000000';
const contractFuncSigs = {
  described: {
    contractDescription: '0x872db889',
  },
  publicResolver: {
    contentFuncSig: '0x2dff6941', // web3.utils.sha3('content(bytes32)')
    addrFuncSig: '0x2dff6941', // web3.utils.sha3('addr(bytes32)')
  },
};

const loadedEns: any = { };
export const ensCache: any = ((): any => {
  // reset ens cache
  const { dappBrowserBuild } = (window as any);
  if (dappBrowserBuild !== window.localStorage['evan-dapp-browser-build']) {
    window.localStorage.removeItem('evan-ens-cache');
  }

  // check if any ens entries were loaded before
  try {
    return JSON.parse(window.localStorage['evan-ens-cache']);
  } catch (ex) {
    // invalid cache
  }

  return {};
})();

async function postToEthClient(requestString: string): Promise<any> {
  const [, , protocol, host, defaultPort] = config.web3Provider
    .match(/^((http[s]?|ftp|ws[s]):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?/);
  const port = defaultPort || (protocol === 'https' || protocol === 'wss') ? 443 : 8080;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `http${port === 443 ? 's' : ''}://${host}:${port}`, true);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.onload = () => resolve(JSON.parse(xhr.responseText).result);
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
 * Parses a ens address and replaces old, not existing applications to be backwards compatible.
 *
 * @param      {string}  address  ens address to be parsed
 */
export function parseToValidEnsAddress(address: string) {
  return address
    .replace('angular-core', 'angularcore')
    .replace('angular-libs', 'angularlibs')
    .replace('smart-contracts', 'smartcontracts');
}

/**
 * Generate a eth call json structure with given params and returns the stringified result.
 *
 * @param      {string}  params  The parameters
 */
export function generateEthCall(params: Array<{data: string; to: string}>|{data: string; to: string}) {
  return JSON.stringify({
    method: 'eth_call',
    params: Array.isArray(params) ? params : [params],
    id: 1,
    jsonrpc: '2.0',
  });
}

/**
 * Resolves the content ipfs hash for a given ipfs, ens or contract address
 *
 * @param      {string}  address  The address
 */
export async function getContentHashForAddress(address: string): Promise<string> {
  let result;

  // early exit, when ipfs hash was applied
  if (address.startsWith('Qm')) {
    return address;
  }

  // check for a described contract
  if (address.startsWith('0x')) {
    // contract address as input
    result = await postToEthClient(generateEthCall({
      data: `${contractFuncSigs.described.contractDescription}`,
      to: address,
    }));
  } else {
    // resolve ens address
    const hashedAddress = namehash(address).replace('0x', '');
    // resolve ens content
    const ensContent = await postToEthClient(generateEthCall({
      data: `${contractFuncSigs.publicResolver.contentFuncSig}${hashedAddress}`,
      to: config.nameResolver.ensResolver,
    }));
    // if no content could be resolved, try to load a underlying contract address
    if (ensContent.startsWith(nullAddress)) {
      const ensAddress = await postToEthClient(generateEthCall({
        data: `${contractFuncSigs.publicResolver.addrFuncSig}${hashedAddress}`,
        to: config.nameResolver.ensResolver,
      }));
      if (!ensAddress.startsWith(nullAddress)) {
        result = await getContentHashForAddress(ensAddress);
      }
    } else {
      result = ensContent;
    }
  }

  // return undefined, if nothing was found
  if (!result || result.startsWith(nullAddress)) {
    return;
  }

  return bytes32ToIpfsHash(result);
}

/**
 * Sets the ens cache for a ens address with a loaded dbcp description.
 *
 * @param      {string}  address  ens address
 * @param      {any}     dbcp     dbcp.public
 */
export function setEnsCache(address: string, dbcp: any): void {
  // set ens cache to speed up initial loading
  if (dbcp.dapp.type === 'cached-dapp') {
    ensCache[address] = JSON.stringify(dbcp);
  } else {
    delete ensCache[address];
  }

  window.localStorage['evan-ens-cache'] = JSON.stringify(ensCache);
}

/**
 * Resolves the content behind a ens address.
 *
 * @param      {string}  address  ens address or contract address
 */
export async function resolveContent(address: string) {
  // directly return, when ens content was resolved before
  if (loadedEns[address]) {
    return loadedEns[address];
  }

  // disable ens cache, when dapp-browser was redeployed
  const cacheAvailable = ensCache[address] && ensCache[address] !== 'invalid';

  // loading chain used to reload the ens data after 3 seconds, when cached
  let contentResolver = Promise.resolve();
  if (cacheAvailable) {
    // delay loading for 3 seconds, to wait the heavy page load is over
    if (cacheAvailable) {
      contentResolver = new Promise((resolve) => setTimeout(() => resolve(), 3000));
    }
  }

  // resolve the content
  contentResolver = contentResolver.then(async () => {
    const ipfsHash = await getContentHashForAddress(address);

    if (ipfsHash) {
      try {
        // load ipfs data
        const ipfsResult = await ipfsCatPromise(ipfsHash);
        // parse the result
        const dbcp = JSON.parse(ipfsResult).public;
        // save ens cache
        setEnsCache(address, dbcp);
        loadedEns[address] = dbcp;

        return dbcp;
      } catch (ex) {
        const errMsg = `Could not parse content of address ${address}: ${ipfsHash} (${ex.message})`;
        log(errMsg, 'error');
        throw new Error(errMsg);
      }
    }

    throw new Error(`Could not resolve content address for ${address}`);
  });

  if (cacheAvailable) {
    try {
      loadedEns[address] = JSON.parse(ensCache[address]);
      return loadedEns[address];
    } catch (ex) {
      // invalid cache?
    }
  }

  return contentResolver;
}
