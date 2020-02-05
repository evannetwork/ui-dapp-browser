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

import { config } from '../config';
import { ipfsConfig } from '../ipfs';
import { IPFSCache } from '../ipfs-cache';
import { getWeb3Instance } from '../web3';
import { Solc } from '../solc';
import * as core from '../core';
import { AccountStore } from './AccountStore';
import { KeyProvider, getLatestKeyProvider } from './KeyProvider';
import * as lightwallet from '../lightwallet';

/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

let internalWeb3;
const coreRuntimes = { };
const profileRuntimes = { };

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
  const runtimeConfig = await getCoreOptions(CoreBundle, SmartContracts);

  // dfs
  let dfs = new CoreBundle.Ipfs({
    web3: runtimeConfig.web3,
    dfsConfig: runtimeConfig.dfsConfig,
    cache: runtimeConfig.ipfsCache,
    logLog: CoreBundle.logLog,
    logLogLevel: CoreBundle.logLogLevel
  });

  // TODO cleanup after dbcp > 1.0.3 release
  if (runtimeConfig.ipfsCache) {
    dfs.cache = runtimeConfig.ipfsCache;
  }

  const CoreRuntime = await CoreBundle.createDefaultRuntime(
    runtimeConfig.web3,
    dfs,
    runtimeConfig.config,
  );

  // save it for quick access
  coreRuntimes[CoreBundle.instanceId] = CoreRuntime;

  return CoreRuntime;
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
  const coreRuntime = coreRuntimes[CoreBundle.instanceId];
  if (provider === 'internal') {
    signer = new CoreBundle.SignerInternal({
      accountStore: accountStore,
      config: { gasPrice: window.localStorage['evan-gas-price'] ? parseInt(window.localStorage['evan-gas-price'], 10) : 20000000000 },
      contractLoader: coreRuntime.contractLoader,
      web3: coreRuntime.web3,
      logLog: CoreBundle.logLog,
      logLogLevel: CoreBundle.logLogLevel
    });
  } else {
    signer = new CoreBundle.SignerExternal({
      logLog: CoreBundle.logLog,
      logLogLevel: CoreBundle.logLogLevel
    });
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
  const coreRuntime = await updateCoreRuntime(CoreBundle, coreOptions);

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
      contractLoader: coreRuntime.contractLoader,
      logLog: CoreBundle.logLog,
      logLogLevel: CoreBundle.logLogLevel,
      signer: bccProfileOptions.signer,
      token: agentExecutor.token,
      web3: coreRuntime.web3,
    });
  }

  // load private and encryption keys
  const unlockedVault = await lightwallet.loadUnlockedVault();
  const privateKey = await lightwallet.getPrivateKey(unlockedVault, activeAccount);
  coreOptions.config.accountMap = { };
  coreOptions.config.accountMap[activeAccount] = privateKey;

  // use account store from signer or use a new one
  bccProfileOptions.accountStore = bccProfileOptions.signer.accountStore ||
    new AccountStore();
  bccProfileOptions.accountStore.accounts = coreOptions.config.accountMap;

  // initialize bcc for an profile
  const bccProfile = await createDefaultRuntime(
    CoreBundle,
    activeAccount,
    unlockedVault.encryptionKey,
    privateKey,
    JSON.parse(JSON.stringify(coreOptions.config)),
    coreRuntime.web3,
    coreRuntime.dfs,
    bccProfileOptions
  );
  profileRuntimes[CoreBundle.instanceId] = bccProfile;

  if (provider === 'metamask') {
    bccProfile.coreInstance.executor.eventHub.eventWeb3 = (<any>window).web3;
  }

  await bccProfile.keyProvider.setKeys();
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
  const coreRuntime = coreRuntimes[CoreBundle.instanceId];
  const keys = getLatestKeyProvider().keys;
  const keyProvider = new KeyProvider(
    keys ? JSON.parse(JSON.stringify(keys)) : { },
    accountId,
  );

  if(config.useIdentity) {
    accountId = await coreRuntime.verifications.getIdentityForAccount(accountId, true);
  }

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
    'ipfs': coreRuntime.dfs,
    'keyProvider': keyProvider,
    'cryptoProvider': cryptoProvider,
    defaultCryptoAlgo: 'aes',
    originator: accountId,
    logLog: CoreBundle.logLog,
    logLogLevel: CoreBundle.logLogLevel
  });

  const sharing = new CoreBundle.Sharing({
    contractLoader: coreRuntime.contractLoader,
    cryptoProvider: cryptoProvider,
    description: coreRuntime.description,
    executor: coreRuntime.executor,
    dfs: coreRuntime.dfs,
    keyProvider: keyProvider,
    nameResolver: coreRuntime.nameResolver,
    defaultCryptoAlgo: 'aes',
    logLog: CoreBundle.logLog,
    logLogLevel: CoreBundle.logLogLevel
  });

  const dataContract = new CoreBundle.DataContract({
    cryptoProvider: cryptoProvider,
    dfs: coreRuntime.dfs,
    executor: coreRuntime.executor,
    loader: coreRuntime.contractLoader,
    nameResolver: coreRuntime.nameResolver,
    sharing: sharing,
    web3: coreRuntime.web3,
    description: coreRuntime.description,
    logLog: CoreBundle.logLog,
    logLogLevel: CoreBundle.logLogLevel
  });

  const evanProfile = new CoreBundle.Profile({
    ipld: ipldInstance,
    nameResolver: coreRuntime.nameResolver,
    defaultCryptoAlgo: 'aes',
    executor: coreRuntime.executor,
    contractLoader: coreRuntime.contractLoader,
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
  if(config.useIdentity) {
    const coreRuntime = coreRuntimes[CoreBundle.instanceId];
    accountId = await coreRuntime.verifications.getIdentityForAccount(accountId, true);
    profile.ipld.keyProvider.setKeysForAccount(
      accountId,
      lightwallet.getEncryptionKeyFromPassword(encryptionSalt, password)
    );
  }


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
  accountId = '0x0000000000000000000000000000000000000000',
  encryptionKey?: string,
  privateKey?: string,
  runtimeConfig: any = JSON.parse(JSON.stringify(config)),
  web3?: any,
  dfs?: any,
  options?: any,
) {
  const coreRuntime = coreRuntimes[CoreBundle.instanceId];
  // fill web3 per default with the core runtime web3
  web3 = web3 || coreRuntime.web3;
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
  const runtime = await CoreBundle.createDefaultRuntime(
    web3,
    dfs || coreRuntime.dfs,
    runtimeConfig,
    options,
  );

  if(runtimeConfig.useIdentity && runtime.activeIdentity === runtime.activeAccount) {
    runtime.activeIdentity = '0x0000000000000000000000000000000000000000'
  }

  if (privateKey) {
    let correctPrivateKey = privateKey;
    if (!privateKey.startsWith('0x')) {
      correctPrivateKey = `0x${ privateKey }`;
    }

    await runtime.dfs.setAccountAndPrivateKey(accountId, correctPrivateKey);
  }

  // TODO: fix temporary payments for agent-executors and disable file pinnging
  if (core.getCurrentProvider() === 'agent-executor') {
    delete runtime.dfs.accountId;
    // runtime.executor.signer.accountStore = runtime.accountStore;
  }

  // initialize empy profile, when no profile could be load
  if (!runtime.profile) {
    runtime.profile = new CoreBundle.Profile({
      accountId: accountId,
      contractLoader: runtime.contractLoader,
      dataContract: runtime.dataContract,
      defaultCryptoAlgo: 'aes',
      executor: runtime.executor,
      ipld: runtime.ipld,
      log: runtime.log,
      nameResolver: runtime.nameResolver,
    });
  }

  return runtime;
}

/**
 * Check if a account is onboarded
 *
 * @param      {string}   account  account id to test
 * @return     {boolean}  True if account onboarded, False otherwise
 */
const isAccountOnboarded = async function(account: string): Promise<boolean> {
  try {
    const coreRuntime = evanGlobals.CoreRuntime;
    const ensName = coreRuntime.nameResolver.getDomainName(coreRuntime.nameResolver.config.domains.profile);
    const address = await coreRuntime.nameResolver.getAddress(ensName);
    const contract = coreRuntime.nameResolver.contractLoader.loadContract('ProfileIndexInterface', address);
    const hash = await coreRuntime.nameResolver.executor.executeContractCall(contract, 'getProfile', account, { from: account, });

    if (hash === '0x0000000000000000000000000000000000000000') {
      const identity = await coreRuntime.verifications.getIdentityForAccount(account, true);
      const identityProfile = await coreRuntime.nameResolver.executor.executeContractCall(contract, 'getProfile', identity, { from: account, });
      if (identityProfile === '0x0000000000000000000000000000000000000000') {
        return false;
      } else {
        return true;
      }
    } else {
      return true;
    }
  } catch (ex) {
    return false;
  }
}

/**
 * Returns the first core runtime that was created by the dapp-browser.
 *
 * @return     {any}  bcc core runtime (without profile)
 */
const getCoreRuntime = function() {
  return coreRuntimes[Object.keys(coreRuntimes)[0]];
}

export {
  coreRuntimes,
  createDefaultRuntime,
  getCoreOptions,
  getCoreRuntime,
  getProfileForAccount,
  getSigner,
  isAccountOnboarded,
  isAccountPasswordValid,
  profileRuntimes,
  setExchangeKeys,
  startBCC,
  updateCoreRuntime,
}
