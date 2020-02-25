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

import * as dapp from './dapp';
import * as ipfs from './ipfs';
import * as loading from './loading';
import * as routing from './routing';
import * as utils from './utils';
import { config } from './config';


/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

/**
 * add page load performance tracking
 */
window['evanloadTime'] = Date.now();

/**************************************************************************************************/
const System = window['System'];
const getDomainName = utils.getDomainName;
let web3;

delete window['System'];

// prefill bcc for systemjs plugin usage
evanGlobals.ipfsCatPromise = ipfs.ipfsCatPromise;
evanGlobals.restIpfs = ipfs.restIpfs;
evanGlobals.System = System;
evanGlobals.queryParams = routing.getQueryParameters();

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
 *
 * @param      {boolean}  enableRouting  dapp-browser watch for url changes and automatically starts
 *                                       dapps with ens addresses that were passed to the location
 *                                       hash
 */
export async function initializeEvanNetworkStructure(enableRouting = true): Promise<void> {
  // check if we are running in dev mode, load dev mode available modules
  await Promise.all([
    utils.setUpDevMode(),
    utils.getBrowserName(),
    utils.getIsPrivateMode(),
  ]);

  // set initial loadin step
  loading.raiseProgress(5);

  // load smart-contracts and blockchain-core minimal setup for accessing ens from ipfs
  try {
    // use initial route to handle initially clicked notifications
    // initialize dynamic routing and apply eventually clicked notification initial route
    if (enableRouting) {
      routing.initialize();
    }

    // wait for device ready event so we can load notifications
    await utils.onDeviceReady();

    // update build number to enable ens cache
    if ((window as any).dappBrowserBuild) {
      window.localStorage['evan-dapp-browser-build'] = (window as any).dappBrowserBuild || '';
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
  config,
  dapp,
  evanGlobals,
  getDomainName,
  ipfs,
  loading,
  routing,
  System,
  utils,
}
