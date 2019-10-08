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

import * as bccHelper from './bcc/bcc';
import * as core from './core';
import * as dapp from './dapp';
import * as ipfs from './ipfs';
import * as lightwallet from './lightwallet';
import * as loading from './loading';
import * as notifications from './notifications';
import * as queue from './queue';
import * as routing from './routing';
import * as solc from './solc';
import * as utils from './utils';
import * as web3Helper from './web3';
import { AccountStore } from './bcc/AccountStore';
import { config } from './config';
import { KeyProvider, getLatestKeyProvider } from './bcc/KeyProvider';
import { Solc } from './solc';
import { startWatchers } from './watchers';
import { updateCoreRuntime, getCoreOptions } from './bcc/bcc';

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
const System = window['System'];
const getDomainName = utils.getDomainName;
let web3;
let CoreRuntime;
let definition;
let nameResolver;

delete window['System'];

// prefill bcc for systemjs plugin usage
evanGlobals.core = core;
evanGlobals.ipfsCatPromise = ipfs.ipfsCatPromise;
evanGlobals.lightwallet = lightwallet;
evanGlobals.restIpfs = ipfs.restIpfs;
evanGlobals.System = System;
evanGlobals.queryParams = routing.getQueryParameters();

evanGlobals.System.map['bcc'] = `bcc.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['bcc-profile'] = `bcc.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['bcc-bc'] = `bcc.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['@evan.network/api-blockchain-core'] = `bcc.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['@evan.network/dbcp'] = `bcc.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['smart-contracts'] = `smartcontracts.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['@evan.network/smart-contracts-core'] = `smartcontracts.${ getDomainName() }!dapp-content`;
evanGlobals.System.map['@evan.network/ui-angular-libs'] = 'angularlibs.evan!dapp-content';
evanGlobals.System.map['angular-libs'] = 'angularlibs.evan!dapp-content';
evanGlobals.System.map['@evan.network/ui-angular-core'] = 'angularcore.evan!dapp-content';
evanGlobals.System.map['angular-core'] = 'angularcore.evan!dapp-content';

/**
 * Starts the whole dapp-browser.
 */
export async function initializeEvanNetworkStructure(enableRouting = true): Promise<void> {
  // activate color themes
  utils.activateColorTheme(utils.getColorTheme());

  // check if we are running in dev mode, load dev mode available modules
  await Promise.all([
    utils.setUpDevMode(),
    utils.getBrowserName(),
    utils.getIsPrivateMode(),
  ]);

  // set initial loadin step
  utils.raiseProgress(5);

  // check if angular-libs are already cached as the latest version => load it directly from ipfs
  // simoultaniously to bcc
  // const preloadAngular = dapp.preloadAngularLibs();

  // load smart-contracts and blockchain-core minimal setup for accessing ens from ipfs
  try {
    const [ CoreBundle, SmartContracts ] = await Promise
      .all<any, any, any>([
        System
          .import(`bcc`)
          .then(loaded => utils.raiseProgress(10, loaded)),
        System
          .import('smart-contracts')
          .then(loaded => utils.raiseProgress(10, loaded)),
        // check if an executor agent should be used for the application runtime
        core.getAgentExecutor()
      ]);

    // make it global available without loading it twice
    evanGlobals.CoreBundle = CoreBundle;
    evanGlobals.SmartContracts = SmartContracts;

    // initialize bcc and make it globally available
    CoreRuntime = await updateCoreRuntime(CoreBundle, SmartContracts);
    evanGlobals.CoreRuntime = CoreRuntime;

    // tell everyone, that bcc was loaded and initialized
    utils.setBccReady();

    // set variables to export to dapps
    definition = CoreRuntime.definition;
    nameResolver = CoreRuntime.nameResolver;
    web3 = CoreRuntime.web3;

    // wait for device ready event so we can load notifications
    // await preloadAngular;
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

    if (enableRouting) {
      // initialize dynamic routing and apply eventually clicked notification initial route
      routing.initialize(initialRoute);

      // add account watcher
      core.watchAccountChange();

      // watch for specific frontend events (low eve, ...)
      startWatchers();
    }

    if (utils.devMode) {
      window['evanGlobals'] = evanGlobals;
    }
  } catch (ex) {
    console.error(ex);

    utils.showError();
  }
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
  Solc,
  System,
  utils,
  web3,
  web3Helper,
}
