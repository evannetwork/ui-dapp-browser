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

/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

import * as core from '../core';
import * as lightwallet from '../lightwallet';

/**
 * wrapper for evan.network accounts private keys
 *
 * @class      AccountStore (name)
 */
export class AccountStore {
  /**
   * account cache
   */
  private accounts: any;

  /**
   * overwrite the global vault with an specific one
   */
  private vault: any;

  constructor(vault?: any) {
    this.accounts = { }
    this.vault = vault;
  }

  /**
   * get private key for the current logged in account
   *
   * @param      {string}           activeAccount  account to get the private key for (default
   *                                               activeAccount)
   * @return     {Promise<string>}  private key for this account
   */
  async getPrivateKey(activeAccount = core.activeAccount()): Promise<string> {
    // if the current runtime is started using an agent executor and the private key for this
    // account gets requested, reject the request, because no private key is set
    if (evanGlobals.agentExecutor && evanGlobals.agentExecutor.accountId === activeAccount) {
      throw new Error('Runtime using the agent executor cannot request an private key!');
    } else {
      const vault = this.vault || await lightwallet.loadUnlockedVault();

      this.accounts[activeAccount] = this.accounts[activeAccount] ||
        lightwallet.getPrivateKey(vault, activeAccount);

      return this.accounts[activeAccount];
    }
  }
}
