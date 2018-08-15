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

import { config } from '../config';
import { ipfsConfig } from '../ipfs';
import { IPFSCache } from '../ipfs-cache';
import { getWeb3Instance } from '../web3';
import { Solc } from '../solc';

let internalWeb3;

/**
 * returns the coreOptions for creation a new bcc CoreBundle and SmartContracts object.
 *
 * @param CoreBundle      {any}  blockchain-core ipfs bundle import (System.import('bcc'))
 * @param SmartContracts  {any}  smart-contracts ipfs bundle import (System.import('smart-contractssmart-contracts'))
 * @param provider        {any}  current signing provider (internal or external)
 *
 * @return                {Promise<any>}  core options
 */
export async function getCoreOptions(CoreBundle: any, SmartContracts: any, provider?: string): Promise<any> {
  let remoteIpfsNode;
  let web3;
  const ipfsCache = new IPFSCache();

  // set default web socket provider or use localStorage parameters
  config.web3Provider = window.localStorage['evan-web3-provider'] || 'wss://testcore.evan.network/ws';

  if (provider === 'metamask') {
    const existingWeb3 = (<any>window).web3;
    const newWeb3 = new CoreBundle.Web3();
    newWeb3.setProvider(existingWeb3.currentProvider);
    newWeb3.eth.defaultAccount = existingWeb3.eth.defaultAccount;

    web3 = newWeb3;
  } else {
    if (!internalWeb3) {
      internalWeb3 = getWeb3Instance(config.web3Provider);
    }
    web3 = internalWeb3;
  }
  remoteIpfsNode = CoreBundle.IpfsRemoteConstructor(ipfsConfig);

  return {
    web3: web3,
    solc: new Solc(SmartContracts),
    dfsRemoteNode: remoteIpfsNode,
    ipfsCache: ipfsCache,
    config: config,
  };
}

/**
 * Loads the current core options and initializes a new CoreRuntime instance.
 *
 * @param CoreBundle      {any}  blockchain-core ipfs bundle
 * @param SmartContracts  {any}  smart-contracts ipfs bundle
 *
 * @return                {Promise<any>}  CoreRuntime instance
 */
async function updateCoreRuntime(CoreBundle: any, SmartContracts: any): Promise<any> {
  const options = await getCoreOptions(CoreBundle, SmartContracts);

  CoreBundle.createAndSetCore(options);

  return CoreBundle.CoreRuntime;
}

export {
  updateCoreRuntime,
}
