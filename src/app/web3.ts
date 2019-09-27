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

import * as utils from './utils';

/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

/**
 * values to handle one single Websocket connection
 */
let reconnecting = undefined;
let websocketProvider;
let web3;

/**
 * Returns the Web3 Constructor from blockchain-core and overwrites the send
 * function
 *
 * @return     {any}  The web 3 constructor.
 */
export function getWeb3Constructor(): any {
  return evanGlobals.CoreBundle.Web3;
}

/**
 * Returns a new web3 instances. If a web3 currentProvider is provided, it will
 * be used.
 *
 * @param      {string}  url     url for the web socket connection
 * @return     {any}     web3 instance
 */
export function getWeb3Instance(url: string): any {
  try {
    if (!web3) {
      const provider = new evanGlobals.CoreBundle.Web3.providers.WebsocketProvider(
        url,
        {
          clientConfig: {
            keepalive: true,
            keepaliveInterval: 5000,
            useNativeKeepalive: true,
          },
          protocol: []
        }
      );

      provider.reconnect = () => {
        provider.reconnecting = true;
        setTimeout(() => {
            provider.removeAllSocketListeners();

            let connection = [];

            connection = new provider.connection.constructor(provider.host, []);

            provider.connection = connection;
            provider.registerEventListeners();
        }, provider.reconnectDelay);
      };

      web3 = new evanGlobals.CoreBundle.Web3(provider, null, { transactionConfirmationBlocks: 1 });
      setInterval(() => {
        web3.eth.getBlockNumber();
      }, 5000)
    }
  } catch (ex) {
    console.error(ex);
    utils.showError();
  }

  return web3;
}
