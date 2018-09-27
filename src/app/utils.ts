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

/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

/**
 * global available array that includes dev mode available dapps, when devMode is
 * enabled, else undefined
 */
export let devMode: Array<any>;

/**
 * add a bcc ready promise, so some functionallities can wait for finishing bcc has loaded
 */
export let setBccReady;
export let bccReady = new Promise((resolve, reject) => {
  setBccReady = resolve;
});


/**
 * Initial loading cache values
 */
const percentageThreshold = 100 / 9;
let evanLogoRectAnimated = [ ];
let lastPercentage = 0;
let lastAnimationFrame;

/**
 * Checks if we are running in devMode, if true, load dev-dapps from local file server, if false do nothing
 *
 * @return     {<type>}  { description_of_the_return_value }
 */
export async function setUpDevMode(): Promise<void> {
  const host = window.location.host;

  if ((host.indexOf('localhost') !== -1 || host.indexOf('127.0.0.1') !== -1) &&
      window.location.href.indexOf('dev.html') !== -1) {
    evanGlobals.devMode = await evanGlobals.System.import(`${ window.location.origin }/dev-dapps!json`);

    if (evanGlobals.devMode.externals) {
      evanGlobals.devMode = evanGlobals.devMode.externals;
    } else {
      evanGlobals.devMode = null;
    }

    devMode = evanGlobals.devMode;
  }
}

/**
 * Check if a dev application is available
 *
 * @param      {string}   name    string of the dapp to check
 * @return     {boolean}  True if DApp is available for development, False otherwise.
 */
export function isDevAvailable(name): boolean {
  if (evanGlobals.devMode) {
    return evanGlobals.devMode.indexOf(name.replace(/\-/g, '')) !== -1;
  }

  return false;
}

/**
 * Sends an event using window.dispatchEvent
 *
 * @param      {string}  name    event name
 * @param      {any}     data    data that should be send
 */
export function sendEvent(name: string, data?: any) {
  window.dispatchEvent(new CustomEvent(name, {
    detail: data
  }));
}

/**
 * predefined events for global usage
 */
export const events = {
  /**
   * sends the event, that a sub DApp starts loading
   */
  loadingSubDApp: () => sendEvent('loading-sub-dapp'),

  /**
   * Sends the event, that a sub DApp finished loading
   */
  finishLoadingSubDApp: () => sendEvent('loading-sub-dapp-finished'),
}

/**
 * Show Error during the initial loading, when no UI framework is loaded
 */
export function showError() {
  const errorElement = (<any>document.querySelectorAll('.evan-logo-error')[0]);

  if (errorElement) {
    errorElement.style.display = 'block';

    errorElement.querySelectorAll('button')[0].onclick = function() {
      window.location.reload();
    }
  }
}

/**
 * Sets the current loading progress (animates evan.network logo)
 *
 * @param      {number}  percentage  current loading percentage
 */
export function setProgress(percentage: number) {
  try {
    // cache progress el to handle faster animations
    if (percentage > lastPercentage) {
      lastPercentage = percentage;
    }

    // calculate the count of bars that should be animated
    let rectsToAnimate = Math.round(lastPercentage / percentageThreshold) - 1;
    for (let i = 0; i < rectsToAnimate; i++) {
      if (!evanLogoRectAnimated[i]) {
        evanLogoRectAnimated[i] = true;

        // animate the symbols on the next animation frame to improve animation performance
        (function(index) {
          window.requestAnimationFrame(() => {
            const rectElement = document.getElementById(`evan-logo-rect-${ index + 1 }`);

            if (rectElement) {
              rectElement.setAttribute('class', 'animate-1');
            }
          });
        })(i);
      }
    }
  } catch (ex) { }
}

/**
 * Takes the latest progress percentage and raise it with the incoming value.
 *
 * @param      {number}  percentage  percentage to add
 * @param      {any}     returnObj   additional return object for raising
 *                                   loading progress and returning object
 *                                   instantly
 * @return     {string}  additional returnObject
 */
export function raiseProgress(percentage: number, returnObj?: any): any {
  lastPercentage += percentage;

  setProgress(percentage);

  return returnObj;
}

/**
 * Returns the current loading progress.
 *
 * @return     {number}  The loading progress.
 */
export function getLoadingProgress(): number {
  return lastPercentage;
}

/**
 * Log a message according to localStorage settings to the log
 *
 * @param      {stromg}  message  message to log
 * @param      {string}  level    level to log (log / verbose)
 */
export function devLog(message: string, level?: string) {
  if (evanGlobals.CoreRuntime && evanGlobals.CoreRuntime.description && evanGlobals.CoreRuntime.description.log) {
    evanGlobals.CoreRuntime.description.log(message, level);
  }

  message = null;
}

/**
 * Log a message according to localStorage settings to the log
 *
 * @param      {stromg}  message  message to log
 * @param      {string}  level    level to log (log / verbose)
 */
export function log(message: string, level?: string) {
  if (evanGlobals.CoreRuntime && evanGlobals.CoreRuntime.description && evanGlobals.CoreRuntime.description.log) {
    evanGlobals.CoreRuntime.description.log(message, level);
  }

  message = null;
}

/**
 * Adds an deviceready event handler and wait for the result to resolve the promise. If we are on a
 * desktop device, dont wait for deviceready, it will be never called.
 *
 * @return     {Promise<void>}  resolved when deviceready event is emitted
 */
export async function onDeviceReady(): Promise<any> {
  if ((<any>window).cordova) {
    return new Promise((resolve, reject) => document.addEventListener('deviceready', resolve));
  }
}

/**
 * Removes the text after the last dot.
 *
 * @param      {string}  ensAddress  ens address to get the name for
 * @return     {string}  dappname including sub ens paths
 */
export function getDAppName(ensAddress: string) {
  let dappName = ensAddress.replace(/\-/g, '');

  try {
    dappName = /^(.*)\.[^.]+$/.exec(dappName)[1];
  } catch (ex) { }

  return dappName;
}

