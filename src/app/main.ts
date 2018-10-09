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

import * as core from './core';
import * as dapp from './dapp';
import * as ipfs from './ipfs';
import * as lightwallet from './lightwallet';
import * as loading from './loading';
import * as queue from './queue';
import * as routing from './routing';
import * as solc from './solc';
import * as utils from './utils';
import * as notifications from './notifications';
import * as web3Helper from './web3';
import { AccountStore } from './bcc/AccountStore';
import { config } from './config';
import { KeyProvider, getLatestKeyProvider } from './bcc/KeyProvider';
import { updateCoreRuntime, getCoreOptions } from './bcc/bcc';
import * as bccHelper from './bcc/bcc';


/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

/**
 * add page load performance tracking
 */
window['evanloadTime'] = Date.now();

/**************************************************************************************************/
/**
 * Keep orignal Promise from ZoneJS and restore it after bcc browserified was loaded, which
 * is overwriting the ZoneJS Promise
 *
 * bcc:23126 Unhandled promise rejection Error: Zone.js has detected that ZoneAwarePromise
 * `(window|global).Promise` has been overwritten.
 */
// TODO: when bcc is loaded multiple times, zoneJS should also be saved
const zoneJSPromise = window['Promise'];
const System = window['System'];
const getDomainName = dapp.getDomainName;
let web3;
let CoreRuntime;
let definition;
let nameResolver;

delete window['System'];

// prefill bcc for systemjs plugin usage
evanGlobals = {
  System : System,
  ipfsCatPromise: ipfs.ipfsCatPromise,
  restIpfs: ipfs.restIpfs
};

evanGlobals.System.map['bcc'] = `bcc.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['bcc-profile'] = `bcc.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['bcc-bc'] = `bcc.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['@evan.network/api-blockchain-core'] = `bcc.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['@evan.network/dbcp'] = `bcc.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['smart-contracts'] = `smartcontracts.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['@evan.network/smart-contracts-core'] = `smartcontracts.${ getDomainName() }!dapp-content`;

/**
 * Starts the whole dapp-browser.
 */
export async function initializeEvanNetworkStructure(): Promise<void> {
  // check if we are running in dev mode, load dev mode available modules
  await utils.setUpDevMode();

  // set initial loadin step
  utils.raiseProgress(5);

  // check if angular-libs are already cached as the latest version => load it directly from ipfs
  // simoultaniously to bcc
  const preloadAngular = dapp.preloadAngularLibs();

  // load smart-contracts and blockchain-core minimal setup for accessing ens from ipfs
  Promise
    .all<any, any, any>([
      System
        .import('bcc')
        .then(CoreBundle => utils.raiseProgress(10, CoreBundle)),
      System
        .import('smart-contracts')
        .then(SmartContracts => utils.raiseProgress(10, SmartContracts)),
      // check if an executor agent should be used for the application runtime
      core.getAgentExecutor()
    ])
    .then(async ([ CoreBundle, SmartContracts ]) => {
      // make it global available without loading it twice
      evanGlobals.CoreBundle = CoreBundle;
      evanGlobals.SmartContracts = SmartContracts;

      try {
        // initialize bcc and make it globally available
        await updateCoreRuntime(CoreBundle, SmartContracts);
        evanGlobals.CoreRuntime = CoreBundle.CoreRuntime;

        // tell everyone, that bcc was loaded and initialized
        utils.setBccReady();

        // set variables to export to dapps
        CoreRuntime = CoreBundle.CoreRuntime;
        definition = CoreRuntime.definition;
        nameResolver = CoreRuntime.nameResolver;
        web3 = CoreRuntime.web3;

        // restore zoneJSpromise
        window['Promise'] = zoneJSPromise;

        // wait for device ready event so we can load notifications
        await preloadAngular;
        await utils.onDeviceReady();

        // initialize queue
        queue.updateQueue();

        // use initial route to handle initially clicked notifications
        let initialRoute;
        if ((<any>window).cordova) {
          // initialize notifications and try to load notifications that the user has clicked, while
          // the app was closed
          const initialNotification = await notifications.initialize();

          // if an initialNotification could be loaded, get the url from the notification that
          // should be opened
          if (initialNotification) {
            initialNotification.evanNotificationOpened = true;
            initialRoute = await notifications.getDAppUrlFromNotification(initialNotification);
          }
        }

        // initialize dynamic routing and apply eventually clicked notification initial route
        routing.initialize(initialRoute);

        // add account watcher
        core.watchAccountChange();

        if (utils.devMode) {
          window['evanGlobals'] = evanGlobals;
        }
      } catch (ex) {
        console.error(ex);

        utils.showError();
      }
    })
    .catch(ex => {
      console.error(ex);

      utils.showError();
    });
}

System.originalImport = System.import;
/**
 * Overwrite SystemJS import to add additional logs for dev tracing.
 *
 * @param      {string}  pathToLoad  The path to load
 * @return     {Promise<any>}  SystemJS result
 */
System.import = function(pathToLoad: string): Promise<any> {
  utils.devLog(`SystemJS import: ${ pathToLoad }`, 'verbose');

  // if an export function with the following pattern (#***!dapp-content) was specified, replace the
  // export function for the System.import
  let exportFunction: any = pathToLoad.match(/#(.*)!/g);
  if (exportFunction && exportFunction.length > 0) {
    exportFunction = exportFunction[0].replace(/#|!/g, '');
    pathToLoad.replace(exportFunction, '!');
  }

  return System
    .originalImport(pathToLoad)
    .then((result) => {
      // if an export function is selected and available, return only this value
      if (exportFunction && result[exportFunction]) {
        return result[exportFunction]
      } else {
        return result;
      }
    });
};

export {
  AccountStore,
  bccHelper,
  config,
  core,
  CoreRuntime,
  dapp,
  definition,
  evanGlobals,
  getCoreOptions,
  getDomainName,
  getLatestKeyProvider,
  ipfs,
  KeyProvider,
  lightwallet,
  loading,
  nameResolver,
  notifications,
  queue,
  routing,
  solc,
  System,
  utils,
  web3,
  web3Helper,
}
