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

import * as utils from '../../app/utils';
import { getIpfsApiUrl } from '../../app/ipfs';

const importCache: any = { };

export default function(System: any) {
  /**
   * add css from ipfs to the current browser
   *
   * @param      {string}  origin  ifps folder path
   * @param      {string}  file    file name
   * @param      {string}  isIpns  Indicates if ipns should be used
   */
  function addCSS(origin: string, file: string, isIpns?: boolean) {
    const fileID = (origin + file).replace(/^[^a-z]+|[^\w:.-]+/gi, '');

    // add the css only if it was not applied before
    if (file.indexOf('.css') !== -1 && !document.getElementById(fileID)) {
      var head  = document.getElementsByTagName('head')[0];
      var link  = document.createElement('link');

      link.id   = fileID;
      link.rel  = 'stylesheet';

      // dev mode checks
      if (utils.isDevAvailable(origin.replace('dapps/', '')) && origin.indexOf('Qm') !== 0) {
        link.href = origin + '/' + file;
      } else {
        link.href = getIpfsApiUrl('/' + (isIpns ? 'ipns' : 'ipfs') + '/' + origin + '/' + file);
      }

      head.appendChild(link);
    }
  }

  /**
   * load file content including dev switch
   *
   * @param      {any}       dbcp    dbcp description of the dapp
   * @param      {string}    file    file to load from the description
   * @return     {any}       return value of the imported ipfs hash, if css,
   *                         returns nothing
   */
  function importIpfs(dbcp: any, file: any) {
    let dappName = dbcp.ensAddress;

    try {
      dappName = /^(.*)\.[^.]+$/.exec(dappName)[1];
    } catch (ex) { }

    if (utils.isDevAvailable(dappName) && dappName.indexOf('0x') !== 0) {
      if (file.indexOf('.css') !== -1) {
        addCSS('dapps/' + dappName, file);
      }

      // load js files
      return 'dapps/' + dappName + '/' + file;
    } else {
      if (file.indexOf('.css') === -1) {
        return getIpfsApiUrl('/' + (dbcp.dapp.isIpns ? 'ipns' : 'ipfs') + '/' + dbcp.dapp.origin + '/' + file);
      } else {
        addCSS(dbcp.dapp.origin, file, dbcp.dapp.isIpns);
      }
    }
  };

  /**
   * Handle data handling for requested files params.
   *
   * @param      {any}           params         SystemJS parameters
   * @param      {Function}      originalFetch  SystemJS original fetch function
   * @return     {Promise<any>}  resolved when everything is loaded
   */
  async function locateDAppContent(params: any, originalFetch: Function) {
    // concadinate the window.location. origin with the correctly SystemJS parsed base url (=> remove
    // index.html / dev.html)
    const baseUrl = window.location.origin + (window.location.pathname
      .split('/')
      .slice(0, -1)
      .join('/'));

    // remove the origin and leading slashes / #/
    const clearAddress = params.address
      .replace(baseUrl, '')
      .replace(/^(#\/|\/)/g, '')
      .split('#')[0];
    const requiredFile = clearAddress.split('/').pop();
    const ensAddress = clearAddress.split('/')[0];

    let dbcpAddressToLoad = ensAddress + '!ens';

    // if it was already loaded, return it instantly
    const importCacheKey = dbcpAddressToLoad !== requiredFile ? dbcpAddressToLoad + requiredFile :
      dbcpAddressToLoad; 
    if (importCache[importCacheKey]) {
      return importCache[importCacheKey];
    }

    // load dbcp configuration from ens address
    const dbcp = await System.import(dbcpAddressToLoad);
    const promises = [ ];

    dbcp.ensAddress = ensAddress;

    // check for valid dbcp dapp configuration
    if (dbcp && dbcp.dapp) {
      // use the default entrypoint if
      //   - import dapp content was opened without an file parameter
      //   - an required file should be loaded but not no files array exists or the file is not
      //     included into the dbcp configuration
      if (requiredFile === ensAddress ||
          !dbcp.dapp.files ||
          (dbcp.dapp.files && dbcp.dapp.files.indexOf(requiredFile) === -1)) {
        // load entrypoint js
        promises.push(importIpfs(dbcp, dbcp.dapp.entrypoint));
      } else {
        promises.push(importIpfs(dbcp, requiredFile));
      }

      // iterate through all files to check for css files to load
      if (dbcp.dapp.files) {
        dbcp.dapp.files.forEach((file: string) => {
          if (file.endsWith('.css')) {
            importIpfs(dbcp, file);
          }
        });
      }

      // wait for css and ens content to be resolved
      return Promise
        .all(promises)
        .then(results => {
          importCache[importCacheKey] = results.pop() || { };

          return importCache[importCacheKey];
        });
    } else {
      console.error('dbcp invalid dapp');
      throw new Error('dbcp invalid dapp');
    }
  };

  /**
   Overwrites the fetch function to enable js loading over script tags, that will reduce memory usage

   @param      {any}       params         SystemJS parameters
   @param      {Function}  originalFetch  SystemJS original fetch function
  */
  function fetchDAppContent(params: any, originalFetch: Function) {
    if (typeof params.address !== 'string' || params.address.endsWith('.css')) {
      return '';
    } else {
      params.metadata.scriptLoad = true;

      return originalFetch(params);
    }
  }

  /**
   * Use translate to return an fake object when loading only css dapp libraries.
   *
   * @param      {params}  params  systemjs translate params
   */
  function translate(params: any) {
    if (typeof params.address !== 'string' || params.address.endsWith('.css')) {
      params.metadata.format = 'cjs';
      return 'module.exports = {}';
    }
  };

  return {
    locate: locateDAppContent,
    fetch: fetchDAppContent,
    translate,
  };
}
