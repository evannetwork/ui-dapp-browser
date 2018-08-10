/*
  Copyright (C) 2018-present evan GmbH.

  This program is free software: you can redistribute it and/or modify it
  under the terms of the GNU Affero General Public License, version 3,
  as published by the Free Software Foundation.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  See the GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License along with this program.
  If not, see http://www.gnu.org/licenses/ or write to the

  Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA, 02110-1301 USA,

  or download the license from the following URL: https://evan.network/license/

  You can be released from the requirements of the GNU Affero General Public License
  by purchasing a commercial license.
  Buying such a license is mandatory as soon as you use this software or parts of it
  on other blockchains than evan.network.

  For more information, please contact evan GmbH at this address: https://evan.network/license/
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
  const providers = [];

  // overwrite send function to handle reconnect
  //   => don't use this.connection!, only use websockerProvider.connection
  //      to prevent working on old, eventually dead, connections
  evanGlobals.CoreBundle.Web3.providers.WebsocketProvider.prototype.send = function (payload, callback) {
    let _this = this;

    // if the connection is already connecting, wait 100ms and try again
    if (websocketProvider.connection.readyState === websocketProvider.connection.CONNECTING) {
      setTimeout(function () {
        _this.send(payload, callback);
      }, 100);
      return;
    }

    // if the connection is lost, try to reconnect to the url
    if (websocketProvider.connection.readyState !== websocketProvider.connection.OPEN) {
      reconnect(websocketProvider.connection.url, () => {
        _this.send(payload, callback);
      });

      return;
    }

    // send the request
    websocketProvider.connection.send(JSON.stringify(payload));
    websocketProvider._addResponseCallback(payload, callback);
  };

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
    web3 = web3 || new (<any>getWeb3Constructor());

    // check if an websockerProvider exists and if the url has changed => reset old one
    if (websocketProvider && websocketProvider.connection.url !== url) {
      websocketProvider.reset();
    }

    // create a new websocket connection, when its the first or the url has changed
    if (!websocketProvider || websocketProvider.connection.url !== url) {
      websocketProvider = new web3.providers.WebsocketProvider(url);
      websocketProvider.on('end', () => reconnect(url));

      web3.setProvider(websocketProvider);
    }
  } catch (ex) {
    console.error(ex);
    utils.showError();
  }

  return web3;
}

/**
 * Reconnect the current websocket connection
 *
 * @param      {url}       url       url to connect to the websocket
 * @param      {Function}  callback  optional callback that is called when the
 *                                   reconnect is done
 */
function reconnect(url: string, callback?: Function) {
  if (!reconnecting) {
    utils.devLog('Lost connection to Websocket, reconnecting in 1000ms');

    reconnecting = [ ];

    setTimeout(() => {
      // stop last provider
      websocketProvider._timeout();
      websocketProvider.reset();
      websocketProvider.removeAllListeners();

      // create new provider
      websocketProvider = new web3.providers.WebsocketProvider(url);
      websocketProvider.on('end', () => reconnect(url));

      // remove the old provider from requestManager to prevent errors on reconnect
      delete web3._requestManager.provider;
      web3.setProvider(websocketProvider);

      // run reconnecting callbacks
      for (let i = 0; i < reconnecting.length; i++) {
        reconnecting[i]();
      }

      reconnecting = undefined;
    }, 1000);
  }

  // add callback to the reconnecting array to call them after reconnect
  if (typeof callback === 'function') {
    reconnecting.push(callback);
  }
}
