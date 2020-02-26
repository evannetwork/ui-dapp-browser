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

import * as dapp from './app/dapp';
import * as ipfs from './app/ipfs';
import * as loading from './app/loading';
import * as routing from './app/routing';
import * as utils from './app/utils';
import config from './app/config';

import './index.scss';

// import libs
import System from './systemjs/index';


/**
 * is inserted when the application was bundled, used to prevent window usage
 */
let evanGlobals: any = { };

/**
 * add page load performance tracking
 */
(window as any).evanloadTime = Date.now();

/**************************************************************************************************/
const getDomainName = utils.getDomainName;
let web3;

// prefill bcc for systemjs plugin usage
evanGlobals.ipfsCatPromise = ipfs.ipfsCatPromise;
evanGlobals.restIpfs = ipfs.restIpfs;
evanGlobals.System = System;
evanGlobals.queryParams = routing.getQueryParameters();

/**
 * Starts the whole dapp-browser.
 *
 * @param      {boolean}  enableRouting  dapp-browser watch for url changes and automatically starts
 *                                       dapps with ens addresses that were passed to the location
 *                                       hash
 */
async function startEvan(): Promise<void> {
  // check if we are running in dev mode, load dev mode available modules
  await Promise.all([
    utils.setUpDevMode(System),
    utils.getBrowserName(),
    utils.getIsPrivateMode(),
  ]);

  // set initial loadin step
  loading.raiseProgress(5);

  // load smart-contracts and blockchain-core minimal setup for accessing ens from ipfs
  try {
    routing.initialize();
    await utils.onDeviceReady();

    // update build number to enable ens cache
    if ((window as any).dappBrowserBuild) {
      window.localStorage['evan-dapp-browser-build'] = (window as any).dappBrowserBuild || '';
    }
  } catch (ex) {
    console.error(ex);
    utils.showError();
  }
}

startEvan();

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
