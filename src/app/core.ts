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

import * as lightwallet from './lightwallet';
import * as routing from './routing';
import * as utils from './utils';

/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

/**
 * save the current account for later usage
 */
let lastAccount = '';

/**
 * valid login providers
 */
const validProviders = [
  'metamask',
  'internal',
];

/**
 * external executor variables
 */
let agentExecutor;

/**
 * Logout the current user. Removes the active account, provider and terms of use acceptance.
 *
 * @param      {boolean}  disabledReload  disable window reload
 */
function logout(disabledReload?: boolean) {
  // reset account and providers
  setCurrentProvider('');
  setAccountId('');

  // clear localStorage values
  delete window.localStorage['evan-terms-of-use'];
  delete window.localStorage['evan-account'];
  delete window.localStorage['evan-provider'];

  // remove decrypted vault from runtime and localStorage
  lightwallet.deleteActiveVault();

  // unregister notifications
  window.localStorage['evan-notifications'] = 'false';
  utils.sendEvent('evan-notifications-toggled');

  // reload the window
  setTimeout(() => {
    window.location.reload();
  });
}

/**
 * Get the current, in local storage, configured provider.
 *
 * @return     {string}  The current provider (internal, external, agent-executor).
 */
function getCurrentProvider() {
  if (agentExecutor) {
    return 'agent-executor';
  } else if (evanGlobals.queryParams.provider) {
    return evanGlobals.queryParams.provider;
  } else {
    const currentProvider = window.localStorage['evan-provider'];

    if (currentProvider && validProviders.indexOf(currentProvider) !== -1) {
      return currentProvider;
    }
  }
}

/**
 * Check if we should use internal provider.
 *
 * @return     {boolean}  True if internal provider, False otherwise.
 */
function isInternalProvider() {
  const currentProvider = getCurrentProvider();

  if (currentProvider === 'internal') {
    return true;
  }
}

/**
 * Checks if a injected web3 provider exists an returns it's name
 */
function getExternalProvider() {
  const web3 = (<any>window).web3;

  if (web3) {
    if (web3.currentProvider && web3.currentProvider.isMetaMask) {
      return 'metamask';
    }
  }
}

/**
 * Sets the current provider that should be used.
 *
 * @param      {string}  provider  provider to switch to
 */
function setCurrentProvider(provider: string) {
  window.localStorage['evan-provider'] = provider;
}

/**
 * Get the current selected account included the check of the current provider.
 *
 * @return     {string}  account id of the current user (0x0...)
 */
function activeAccount(): string {
  switch (getCurrentProvider()) {
    case 'metamask': {
      if ((<any>window).web3) {
        setAccountId(getExternalAccount());
      }

      break;
    }
    case 'internal': {
      // if the url was opened using an specific accountId, use this one!
      if (evanGlobals.queryParams.accountId) {
        return evanGlobals.queryParams.accountId;
      }

      const vault = lightwallet.loadVault();

      // get the first account from the vault and set it as evan-account to localStorage
      if (vault) {
        const accounts = lightwallet.getAccounts(vault);
        const accountId = getAccountId();

        if (accounts.indexOf(accountId) === -1) {
          if (accounts.length > 0) {
            window.localStorage['evan-account'] = accounts[0];
          } else {
            delete window.localStorage['evan-account'];
          }
        }
      } else {
        delete window.localStorage['evan-account'];
      }

      break;
    }
    case 'agent-executor': {
      return agentExecutor.accountId;
    }
  }

  return getAccountId();
}

/**
 * Checks the current url parameters if agent executor login parameters are given.
 *
 * @return     {any}  all agent-exeutor parameters for requesting smart-agents and decrypting the
 *                    profile ({ accountId, agentUrl, key, token, })
 */
export async function getAgentExecutor() {
  // if the agentExecutor wasn't loaded before, check if the query parameter was specified
  if (typeof agentExecutor === 'undefined') {
    const token = routing.getQueryParameterValue('agent-executor');
    const agentUrl = routing.getQueryParameterValue('agent-executor-url') ||
      utils.devMode ? 'http://localhost:8080' : 'https://agents.test.evan.network';

    // if an token is specified, load the data from the edge-server
    // TODO: currently the parameters are specified via query parameters => load it via edge-server
    if (token) {
      // use a promise await to implement an timeout (this function will be called at the beginning
      // of the page load, so everything will stop working, when agent not responds)
      await (new Promise(async (resolve) => {
        // dont resolve twice
        let timedOut = false;

        // break loading after 10 seconds
        const agentTimeout: any = setTimeout(() => {
          agentExecutor = false;
          timedOut = true;

          resolve();
        }, 10 * 1000);

        // load data from edge-server
        const accountId = routing.getQueryParameterValue('agent-executor-account-id');
        const key = routing.getQueryParameterValue('agent-executor-key');

        // if all parameters are valid, set the executor agent
        if (accountId && key) {
          agentExecutor = { accountId, agentUrl, key, token, };
        } else {
          agentExecutor = false;
        }

        // if the timeout wasn't triggered => resolve it normally
        if (!timedOut) {
          window.clearTimeout(agentTimeout);
          resolve();
        }
      }));
    } else {
      agentExecutor = false;
    }

    evanGlobals.agentExecutor = agentExecutor;
  }

  return agentExecutor;
}

/**
 * Returns the current (in the localStorage) saved account id
 *
 * @return     {string}  account id;
 */
function getAccountId() {
  if (agentExecutor) {
    return agentExecutor.accountId;
  } else if (window.localStorage['evan-account']) {
    const checkSumAddress = evanGlobals.CoreRuntime.web3.utils.toChecksumAddress(
      window.localStorage['evan-account']
    );
    return checkSumAddress;
  }
}

/**
 * Sets an account id as active one to the local storage.
 *
 * @param      {string}  accountId  account id to set to the localStorage
 */
function setAccountId(accountId: string) {
  window.localStorage['evan-account'] = accountId;
}

/**
 * Checks if an external provider is activated and returns it's active account
 * id
 *
 * @return     {string}  The external account.
 */
function getExternalAccount() {
  if ((<any>window).web3 && (<any>window).web3.eth) {
    return evanGlobals.CoreRuntime.web3.utils.toChecksumAddress(
      (<any>window).web3.eth.defaultAccount
    );
  }
}

/**
 * Watches for account changes and reload the page if nessecary
 */
function watchAccountChange() {
  let dialogIsOpen = false;

  setInterval(() => {
    const currAccount = activeAccount();
    const urlRoute = routing.getRouteFromUrl();
    let isOnboarding = urlRoute.indexOf('onboarding') === 0;

    if (isOnboarding) {
      if (urlRoute.indexOf('/onboarding') !== -1 && getCurrentProvider() === 'metamask') {
        isOnboarding = false;
      }
    }

    if (!dialogIsOpen && !isOnboarding && lastAccount && currAccount !== lastAccount) {
      dialogIsOpen = true;

      window.location.reload();
    }

    lastAccount = currAccount;
  }, 1000);
}

/**
 * Return the name of the current used browser =>
 * https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
 *
 * @return     {string}  opera / firefox / safari / ie / edge / chrome
 */
function currentBrowser() {
  if ((!!window['opr'] && !!window['opr'].addons) || !!window['opera'] ||
    navigator.userAgent.indexOf(' OPR/') >= 0) {
      return 'opera';
  } else if (typeof window['InstallTrigger'] !== 'undefined') {
    return 'firefox';
  } else if (/constructor/i.test(window['HTMLElement']) ||
    (function (p) { return p.toString() === '[object SafariRemoteNotification]'; })
    (!window['safari'] || (typeof window['safari'] !== 'undefined' && window['safari'].pushNotification))) {
      return 'safari';
  } else if (/*@cc_on!@*/false || !!document['documentMode']) {
    return 'ie';
  } else if (!!window['StyleMedia']) {
    return 'edge';
  } else if (!!window['chrome'] && !!window['chrome'].webstore) {
    return 'chrome';
  }
}

/**
 * Gets the balance of the provided or current account id
 *
 * @param      {string}  accountId  account id to get the balance from
 * @return     {number}  The balance for the specific account id
 */
function getBalance(accountId = activeAccount()): Promise<number> {
  return new Promise((resolve, reject) =>
    evanGlobals.CoreRuntime.web3.eth.getBalance(accountId, (err, balance) => {
      if (err) {
        reject(err);
      } else {
        resolve(parseFloat(evanGlobals.CoreRuntime.web3.utils.fromWei(balance, 'ether')));
      }
    })
  );
}

export {
  logout,
  getCurrentProvider,
  isInternalProvider,
  getExternalProvider,
  setCurrentProvider,
  activeAccount,
  getAccountId,
  setAccountId,
  getExternalAccount,
  watchAccountChange,
  currentBrowser,
  getBalance
}
