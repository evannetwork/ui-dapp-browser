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
// import configuration
import config from './config';

declare let evanGlobals: any;

/**
 * global available array that includes dev mode available dapps, when devMode is
 * enabled, else undefined
 */
export let devMode: Array<any>;

/**
 * Active browsers name. (Only set, after getBrowserName was runned before)
 */
export let browserName: string;

/**
 * Is the current browser is running in private mode? (Only set, after getIsPrivateMode was runned before)
 */
export let isPrivateMode: boolean;

export const environment = window.location.href.indexOf('https://dashboard.evan.network') === 0 ? 'core'
  : 'testcore';

/**
 * Checks if we are running in devMode, if true, load dev-dapps from local file server, if false do nothing
 */
export async function setUpDevMode(System: any): Promise<void> {
  const { host } = window.location;
  const correctHost = [
    host.indexOf('localhost') !== -1,
    host.indexOf('127.0.0.1') !== -1,
    host.endsWith('.ngrok.io'),
    host.endsWith('.serveo.net'),
  ].filter((check) => check).length !== 0;

  if (correctHost || window.location.href.indexOf('dev.html') !== -1) {
    let result = await System.import(`${window.location.origin}/dev-dapps!json`);
    if (result.dapps) {
      result = result.dapps;
    } else {
      result = null;
    }

    devMode = result;
  }
}

/**
 * Check if a dev application is available
 *
 * @param      {string}   name    string of the dapp to check
 * @return     {boolean}  True if DApp is available for development, False otherwise.
 */
export function isDevAvailable(name: string): boolean {
  if (devMode) {
    return devMode.indexOf(name) !== -1;
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
    detail: data,
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
};

/**
 * Show Error during the initial loading, when no UI framework is loaded
 */
export function showError() {
  const errorElement = (<any>document.querySelectorAll('.evan-logo-error')[0]);

  if (errorElement) {
    errorElement.style.display = 'block';

    errorElement.querySelectorAll('button')[0].onclick = function () {
      window.location.reload();
    };
  }
}

/**
 * Removes the text after the last dot.
 *
 * @param      {string}  ensAddress  ens address to get the name for
 * @return     {string}  dappname including sub ens paths
 */
export function getDAppName(ensAddress: string) {
  let dappName = ensAddress;

  try {
    dappName = /^(.*)\.[^.]+$/.exec(dappName)[1];
  } catch (ex) { }

  return dappName;
}

/**
 * builds a full domain name for the current bcc config
 *
 * @param      {Array<string>}  subLabels  used to enhance nameResolver config
 * @return     {<type>}         The domain name.
 */
export function getDomainName(...subLabels: string[]): string {
  const domainConfig = config.nameResolver.domains.root;

  if (Array.isArray(domainConfig)) {
    return subLabels
      .filter((label) => label)
      .concat(domainConfig.map((label) => (config.nameResolver.labels as any)[label]))
      .join('.')
      .toLowerCase();
  }

  return domainConfig;
}

/**
 * Return the name of the current browser (Opera, Firefox, Safari, Chrome, IE, Edge, Blink, Cordova)
 */
export function getBrowserName() {
  /* tslint:disable */
  // Return cached result if avalible, else get result then cache it.
  if (browserName) {
    return browserName;
  }

  // if we are running in cordova mobile browser, return cordova as browser name
  if ((<any>window).cordova) {
    return 'Cordova';
  }

  // Opera 8.0+
  const isOpera = (!!(<any>window).opr && !!(<any>window).opr.addons)
    || !!(<any>window).opera || navigator.userAgent.indexOf(' OPR/') >= 0;

  // Firefox 1.0+
  const isFirefox = typeof (<any>window).InstallTrigger !== 'undefined';

  // Safari 3.0+ "[object HTMLElementConstructor]"
  const isSafari = /constructor/i.test((<any>window).HTMLElement)
    || (function (p: any): any { return p.toString() === '[object SafariRemoteNotification]'; }(!(window as any).safari || (window as any).safari.pushNotification))
    || (!!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/))
    || (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(<any>window).MSStream);

  // Internet Explorer 6-11
  const isIE = /* @cc_on!@ */false || !!(<any>document).documentMode;

  // Edge 20+
  const isEdge = !isIE && !!(<any>window).StyleMedia;

  // Chrome 1+
  const isChrome = !!(<any>window).chrome;

  // Blink engine detection
  const isBlink = (isChrome || isOpera) && !!(<any>window).CSS;
  /* tslint:enable */

  return browserName = isOpera ? 'Opera'
    : isFirefox ? 'Firefox'
      : isSafari ? 'Safari'
        : isChrome ? 'Chrome'
          : isIE ? 'IE'
            : isEdge ? 'Edge'
              : isBlink ? 'Blink'
                : 'Don\'t know';
}

/**
 * Lightweight script to detect whether the browser is running in Private mode.
 */
export async function getIsPrivateMode() {
  isPrivateMode = await new Promise((resolve) => {
    const yes = () => resolve(true); // is in private mode
    const not = () => resolve(false); // not in private mode
    const testLocalStorage = () => {
      try {
        if (localStorage.length) {
          not();
        } else {
          localStorage.x = 1;
          localStorage.removeItem('x');
          not();
        }
      } catch (e) {
        /* Safari only enables cookie in private mode
           if cookie is disabled, then all client side storage is disabled
           if all client side storage is disabled, then there is no point
           in using private mode */
        navigator.cookieEnabled ? yes() : not();
      }
    };
    // Chrome & Opera
    const fs = (<any>window).webkitRequestFileSystem || (<any>window).RequestFileSystem;
    if (fs) {
      return void fs((<any>window).TEMPORARY, 100, not, yes);
    }
    // Firefox
    if ('MozAppearance' in document.documentElement.style) {
      if (indexedDB === null) {
        return yes();
      }
      const db = indexedDB.open('test');
      db.onerror = yes;
      db.onsuccess = not;
      return void 0;
    }
    // Safari
    const isSafari = navigator.userAgent.match(/Version\/([0-9\._]+).*Safari/);
    if (isSafari) {
      const version = parseInt(isSafari[1], 10);
      if (version < 11) {
        return testLocalStorage();
      }
      try {
        (<any>window).openDatabase(null, null, null, null);
        return not();
      } catch (_) {
        return yes();
      }
    }
    // IE10+ & Edge InPrivate
    if (!window.indexedDB && ((<any>window).PointerEvent || (<any>window).MSPointerEvent)) {
      return yes();
    }
    // default navigation mode
    return not();
  });

  return isPrivateMode;
}

/**
 * Return the name of the current used browser =>
 * https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
 *
 * @return     {string}  opera / firefox / safari / ie / edge / chrome
 */
export function currentBrowser() {
  const windowAny: any = window;
  if ((!!windowAny.opr && !!windowAny.opr.addons) || !!windowAny.opera ||
    navigator.userAgent.indexOf(' OPR/') >= 0) {
      return 'opera';
  } if (typeof windowAny['InstallTrigger'] !== 'undefined') {
    return 'firefox';
  } if (/constructor/i.test(<any>windowAny['HTMLElement']) ||
    (function (p: any) { return p.toString() === '[object SafariRemoteNotification]'; })
    (!windowAny['safari'] || (typeof windowAny['safari'] !== 'undefined' && windowAny['safari'].pushNotification))) {
      return 'safari';
  } if (/*@cc_on!@*/false || !!(document as any).documentMode) {
    return 'ie';
  } if (!!windowAny['StyleMedia']) {
    return 'edge';
  } if (!!windowAny['chrome'] && !!windowAny['chrome'].webstore) {
    return 'chrome';
  }
}

/**
 * Logs a message, when dev-logs are enabled
 *
 * @param      {string}  message  message that should be logged
 * @param      {string}  type     log type
 */
export function log(message: string, type = 'log') {
  if (type === 'error'
      || window.localStorage['evan-dev-log']
      || window.localStorage['bc-dev-logs'] === 'debug') {
    (console as any)[type](`[dapp-browser] ${message}`);
  }
}
