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
import * as core from '../core';
import { AccountStore } from './AccountStore';
import { KeyProvider, getLatestKeyProvider } from './KeyProvider';
import * as lightwallet from '../lightwallet';

let internalWeb3;

/**
 * returns the coreOptions for creation a new bcc CoreBundle and SmartContracts object.
 *
 * @param      {any}           CoreBundle      blockchain-core ipfs bundle import
 *                                             (System.import('bcc'))
 * @param      {any}           SmartContracts  smart-contracts ipfs bundle import
 *                                             (System.import('smart-contractssmart-contracts'))
 * @param      {any}           provider        current signing provider (internal or external)
 * @return     {Promise<any>}  core options
 */
async function getCoreOptions(CoreBundle: any, SmartContracts: any, provider?: string): Promise<any> {
  const coreOptions: any = {
    config: config,
    dfsConfig: ipfsConfig,
    ipfsCache: new IPFSCache(),
    solc: new Solc(SmartContracts),
  };

  // set default web socket provider or use localStorage parameters
  config.web3Provider = window.localStorage['evan-web3-provider'] || 'wss://testcore.evan.network/ws';

  if (provider === 'metamask') {
    const existingWeb3 = (<any>window).web3;
    coreOptions.web3 = new CoreBundle.Web3();
    coreOptions.web3.setProvider(existingWeb3.currentProvider);
    coreOptions.web3.eth.defaultAccount = existingWeb3.eth.defaultAccount;
  } else {
    if (!coreOptions.web3) {
      coreOptions.web3 = getWeb3Instance(config.web3Provider);
    }
  }

  return coreOptions;
}

/**
 * Loads the current core options and initializes a new CoreRuntime instance.
 *
 * @param      {any}           CoreBundle      blockchain-core ipfs bundle
 * @param      {any}           SmartContracts  smart-contracts ipfs bundle
 * @return     {Promise<any>}  CoreRuntime instance
 */
async function updateCoreRuntime(CoreBundle: any, SmartContracts: any): Promise<any> {
  const options = await getCoreOptions(CoreBundle, SmartContracts);

  CoreBundle.createAndSetCore(options);

  return CoreBundle.CoreRuntime;
}

/**
 * Returns the existing executor or creates a new one, for the active current provider.
 *
 * @param      {any}                           CoreBundle    blockchain-core ipfs bundle
 * @param      {string}                        provider      the current selected provider that
 *                                                           should be loaded
 * @param      {AccountStore}                  accountStore  account store to use for the internal
 *                                                           signer
 * @return     {ProfileBundle.SignerInternal}  the new Signer Object
 */
function getSigner(CoreBundle: any, provider = core.getCurrentProvider(), accountStore = new AccountStore()) {
  let signer;
  if (provider === 'internal') {
    signer = new CoreBundle.SignerInternal({
      accountStore: accountStore,
      config: { gasPrice: window.localStorage['evan-gas-price'] ? parseInt(window.localStorage['evan-gas-price'], 10) : 20000000000 },
      contractLoader: CoreBundle.CoreRuntime.contractLoader,
      web3: CoreBundle.CoreRuntime.web3,
      logLog: CoreBundle.logLog,
      logLogLevel: CoreBundle.logLogLevel
    });
  } else {
    signer = new CoreBundle.SignerExternal({
      logLog: CoreBundle.logLog,
      logLogLevel: CoreBundle.logLogLevel
    })
  }

  return signer;
}


/**
 * run keyExchange.setPublicKey
 *
 * @param      {any}            CoreBundle  blockchain-core ipfs bundle
 * @param      {string}         accountId   Account id to set the exchange keys for
 * @return     {Promise<void>}  resolved when done
 */
async function setExchangeKeys(CoreBundle: any, accountId = core.activeAccount()): Promise<void> {
  const targetPubKey = await CoreBundle.ProfileRuntime.profile.getPublicKey();
  const targetPrivateKey = await CoreBundle.ProfileRuntime.profile.getContactKey(
    accountId,
    'dataKey'
  );

  if (!!targetPrivateKey) {
    CoreBundle.ProfileRuntime.keyExchange.setPublicKey(targetPubKey, targetPrivateKey);
  }
}

/**
 * Setup / update initial blockchain-core structure for current account id and signer.
 *
 * @param      {any}            CoreBundle      blockchain-core ipfs bundle
 * @param      {any}            SmartContracts  smart-contracts ipfs bundle
 * @param      {string}         activeAccount   account id to use
 * @param      {provider}       provider        provider to use (internal, external, agent)
 * @return     {Promise<void>}  solved when bcc is updated
 */
async function startBCC(
  CoreBundle: any,
  SmartContracts: any,
  activeAccount = this.core.activeAccount(),
  provider = core.getCurrentProvider()
) {
  const coreOptions = await getCoreOptions(CoreBundle, SmartContracts, provider);

  // recreate core instance
  await CoreBundle.createAndSetCore(coreOptions);

  // create bcc runtime options profile
  const bccProfileOptions: any = {
    accountId: core.activeAccount(),
    CoreBundle: CoreBundle,
    coreOptions: coreOptions,
    keyProvider: getLatestKeyProvider(),
    signer: getSigner(CoreBundle, provider),
    SmartContracts: SmartContracts
  };

  // if we are loading all data via an smart-agent, we need to create a new ExecutorAgent
  if (provider === 'agent-executor') {
    const agentExecutor = await core.getAgentExecutor();

    bccProfileOptions.executor = new CoreBundle.ExecutorAgent({
      agentUrl: agentExecutor.agentUrl,
      config: {},
      contractLoader: CoreBundle.CoreRuntime.contractLoader,
      logLog: CoreBundle.logLog,
      logLogLevel: CoreBundle.logLogLevel,
      signer: bccProfileOptions.signer,
      token: agentExecutor.token,
      web3: CoreBundle.CoreRuntime.web3,
    });
  }

  // initialize bcc for an profile
  const bccProfile = CoreBundle.createAndSet(bccProfileOptions);

  if (provider === 'metamask') {
    CoreBundle.ProfileRuntime.coreInstance.executor.eventHub.eventWeb3 = (<any>window).web3;
  }

  await CoreBundle.ProfileRuntime.keyProvider.setKeys();
  await setExchangeKeys(CoreBundle, activeAccount);
}

/**
 * Returns an new blockchain-core profile instance. !Attention : It's only builded for load values
 * to check for public and private keys (e.g. used by onboarding or global-password) Executor is the
 * normal one from the global core!!!
 *
 * @param      {any}                    CoreBundle  blockchain-core ipfs bundle
 * @param      {string}                 accountId   account id to create a new profile instance for
 * @return     {ProfileBundle.Profile}  The profile for account.
 */
async function getProfileForAccount(CoreBundle: any, accountId: string) {
  const keys = getLatestKeyProvider().keys;
  const keyProvider = new KeyProvider(
    keys ? JSON.parse(JSON.stringify(keys)) : { },
    accountId,
  );

  const cryptoProvider = new CoreBundle.CryptoProvider({
    unencrypted: new CoreBundle.Unencrypted(),
    aes: new CoreBundle.Aes(),
    aesEcb: new CoreBundle.AesEcb(),
    logLog: CoreBundle.logLog,
    logLogLevel: CoreBundle.logLogLevel
  });

  // set dummy encryption keys to prevent password dialog
  // !Attention : Only public key can be get! If you want to get crypted values
  //              set it by yourself
  keyProvider.setKeysForAccount(
    accountId,
    lightwallet.getEncryptionKeyFromPassword(accountId, 'unencrypted')
  );

  const ipldInstance = new CoreBundle.Ipld({
    'ipfs': CoreBundle.CoreRuntime.dfs,
    'keyProvider': keyProvider,
    'cryptoProvider': cryptoProvider,
    defaultCryptoAlgo: 'aes',
    originator: accountId,
    logLog: CoreBundle.logLog,
    logLogLevel: CoreBundle.logLogLevel
  });

  const sharing = new CoreBundle.Sharing({
    contractLoader: CoreBundle.CoreRuntime.contractLoader,
    cryptoProvider: cryptoProvider,
    description: CoreBundle.CoreRuntime.description,
    executor: CoreBundle.CoreRuntime.executor,
    dfs: CoreBundle.CoreRuntime.dfs,
    keyProvider: keyProvider,
    nameResolver: CoreBundle.CoreRuntime.nameResolver,
    defaultCryptoAlgo: 'aes',
    logLog: CoreBundle.logLog,
    logLogLevel: CoreBundle.logLogLevel
  });

  const dataContract = new CoreBundle.DataContract({
    cryptoProvider: cryptoProvider,
    dfs: CoreBundle.CoreRuntime.dfs,
    executor: CoreBundle.CoreRuntime.executor,
    loader: CoreBundle.CoreRuntime.contractLoader,
    nameResolver: CoreBundle.CoreRuntime.nameResolver,
    sharing: sharing,
    web3: CoreBundle.CoreRuntime.web3,
    description: CoreBundle.CoreRuntime.description,
    logLog: CoreBundle.logLog,
    logLogLevel: CoreBundle.logLogLevel
  });

  const evanProfile = new CoreBundle.Profile({
    ipld: ipldInstance,
    nameResolver: CoreBundle.CoreRuntime.nameResolver,
    defaultCryptoAlgo: 'aes',
    executor: CoreBundle.CoreRuntime.executor,
    contractLoader: CoreBundle.CoreRuntime.contractLoader,
    accountId: accountId,
    dataContract,
    logLog: CoreBundle.logLog,
    logLogLevel: CoreBundle.logLogLevel
  });

  keyProvider.profile = evanProfile;

  return evanProfile;
}

/**
 * Check if the password for a given account id and its profile is valid.
 *
 * @param      {any}      CoreBundle      blockchain-core ipfs bundle
 * @param      {string}   accountId       account id to check
 * @param      {string}   password        password to check
 * @param      {string}   encryptionSalt  encryption salt to retrieve the encryption key with
 *                                        (default account id)
 * @return     {boolean}  True if account password valid, False otherwise
 */
async function isAccountPasswordValid(CoreBundle: any, accountId: string, password: string,
  encryptionSalt = accountId) {
  const profile = await getProfileForAccount(CoreBundle, accountId);

  // set the keys for the temporary profile using the password input, so we can try to get the
  // private key
  profile.ipld.keyProvider.setKeysForAccount(
    accountId,
    lightwallet.getEncryptionKeyFromPassword(encryptionSalt, password)
  );

  let targetPrivateKey;
  try {
    targetPrivateKey = await profile.getContactKey(
      accountId,
      'dataKey'
    );
  } catch (ex) { }

  // if the private key for this account could be loaded, the password is valid
  if (targetPrivateKey) {
    return true;
  } else {
    // TODO: remove duplicated check, when old profiles without accountId salt are gone
    if (encryptionSalt && await isAccountPasswordValid(CoreBundle, accountId, password, '')) {
      // WARNING: for old accounts: overwrite current encryption key, to use the key without a
      // accountId
      await lightwallet.overwriteVaultEncryptionKey(
        accountId,
        lightwallet.getEncryptionKeyFromPassword('', password)
      );

      return true;
    } else {
      return false;
    }
  }
}

/**
 * Wraps the original create default runtime bcc function to simplify key and account map
 * management.
 *
 * @param      {any}     CoreBundle     blockchain-core ipfs bundle
 * @param      {string}  accountId      account id to create the runtime for
 * @param      {string}  encryptionKey  enryption key of the users profile
 * @param      {string}  privateKey     account id's private key
 * @param      {any}     config         overwrite the ui configuration with a custom config
 * @param      {any}     web3           overwrite the CoreRuntime web3 with a new one
 * @param      {any}     dfs            overwrite the CoreRuntime dfs with a new one
 * @return     {any}     the new bcc defaultruntime
 */
async function createDefaultRuntime(
  CoreBundle: any,
  accountId: string,
  encryptionKey: string,
  privateKey: string,
  runtimeConfig: any = JSON.parse(JSON.stringify(config)),
  web3?: any,
  dfs?: any
) {
  // fill web3 per default with the core runtime web3
  web3 = web3 || CoreBundle.CoreRuntime.web3;
  const soliditySha3 = web3.utils.soliditySha3;

  // get accounthash for easy acces within keyConfig
  const accountHash = soliditySha3(accountId);
  runtimeConfig.keyConfig = { };
  runtimeConfig.accountMap = { };

  // set key config for the user accountId
  runtimeConfig.keyConfig[accountHash] = encryptionKey;
  runtimeConfig.keyConfig[soliditySha3(accountHash, accountHash)] = encryptionKey;
  // set mailbox edge key
  runtimeConfig.keyConfig[soliditySha3('mailboxKeyExchange')] =
    '346c22768f84f3050f5c94cec98349b3c5cbfa0b7315304e13647a4918ffff22';

  // set private key
  runtimeConfig.accountMap[accountId] = privateKey;

  // create the new runtime
  return await CoreBundle.createDefaultRuntime(
    web3,
    dfs || CoreBundle.CoreRuntime.dfs,
    runtimeConfig,
  );
}

export {
  createDefaultRuntime,
  getCoreOptions,
  getProfileForAccount,
  getSigner,
  isAccountPasswordValid,
  setExchangeKeys,
  startBCC,
  updateCoreRuntime,
}
