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

import * as routing from './routing';
import * as utils from './utils';
import System from '../systemjs/index';

/**
 * Starts the whole dapp-browser.
 *
 * @param      {boolean}  enableRouting  dapp-browser watch for url changes and automatically starts
 *                                       dapps with ens addresses that were passed to the location
 *                                       hash
 */
export default async function (): Promise<void> {
  delete (window as any).System;
  delete (window as any).SystemJS;

  // add page load performance tracking
  (window as any).evanloadTime = Date.now();

  // check if we are running in dev mode, load dev mode available modules
  await Promise.all([
    utils.setUpDevMode(System),
    utils.getBrowserName(),
    utils.getIsPrivateMode(),
  ]);

  try {
    await routing.initialize();
  } catch (ex) {
    console.error(ex);
    utils.showError();
  }

  // update build number to enable ens cache
  const { dappBrowserBuild } = (window as any);
  if (dappBrowserBuild) {
    window.localStorage['evan-dapp-browser-build'] = dappBrowserBuild || '';
  }
}
