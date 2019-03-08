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

import * as core from '../core';
import * as lightwallet from '../lightwallet';
import { getWeb3Constructor } from '../web3';

/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

let latestKeyProvider;

/**
 * crypto info in insecue data part
 */
export interface CryptoInfo {
  algorithm: string;
  keyLength: number;
  originator: string;
}

/**
 * Encryption Key handler.
 *
 * @class      KeyProvider (keys, accountId)
 */
export class KeyProvider {
  accountId: string;
  origin: any;
  keys: any;
  profile: any;
  Web3: any;

  /**
   * @param _keys     keys to set
   * @param accountId additional account id to use KeyProvider for only one account
   */
  constructor(keys: any, accountId?: string) {
    this.origin = new evanGlobals.CoreBundle.KeyProvider({});
    this.origin.keys = keys || {};
    this.accountId = accountId;
    this.Web3 = getWeb3Constructor();
  }

  /**
   * Initializes the keyprovider using the specific profile
   *
   * @param      {any}     profile  blockchaincore profile instance
   */
  init(profile: any) {
    this.profile = profile;
    this.accountId = this.profile.activeAccount;

    this.origin.init(profile);
  }

  /**
   * runs setKeysForAccount with the current logged in account.
   */
  async setKeys() {
    this.origin.currentAccountHash = this.Web3.utils.soliditySha3(this.accountId || core.activeAccount());
    this.origin.currentAccount = this.accountId || core.activeAccount();

    if (!this.origin.keys[this.origin.currentAccountHash]) {
      const encryptionKey = await lightwallet.getEncryptionKey();

      this.setKeysForAccount(this.origin.currentAccountHash, encryptionKey);
    }
  }

  /**
   * Uses an account id and an encryptionKey to set account specific encryption
   * keys.
   *
   * @param      {boolean}  accountId      account id to use
   * @param      {string}   encryptionKey  encryption key for the account
   */
  setKeysForAccount(accountHash: string, encryptionKey: string) {
    const soliditySha3 = this.Web3.utils.soliditySha3;

    if (accountHash.length === 42) {
      accountHash = soliditySha3(accountHash);
    }

    this.origin.keys[accountHash] = encryptionKey;
    this.origin.keys[soliditySha3(accountHash, accountHash)] = encryptionKey;

    this.origin.keys[soliditySha3('mailboxKeyExchange')] =
      '346c22768f84f3050f5c94cec98349b3c5cbfa0b7315304e13647a4918ffff22';    // accX <--> mailbox edge key
  }

  /**
   * Checks if the keys for the current logged in users are set and returns the
   * key.
   *
   * @param      {CryptoInfo}       info    crypto info
   * @return     {Promise<string>}  promise that is resulting the wanted key
   */
  async getKey(info: CryptoInfo): Promise<string> {
    await this.setKeys();

    return await this.origin.getKey(info);
  }
}

/**
 * Returns a new KeyProvider or if another was created before
 *
 * @return     {<type>}  The latest key provider.
 */
export function getLatestKeyProvider() {
  if (!latestKeyProvider) {
    latestKeyProvider = new KeyProvider({ });
  }

  return latestKeyProvider;
}
