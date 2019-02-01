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

import * as utils from './utils';
import { config } from './config';
import * as loading  from './loading';
import { watchForEveLow } from './watchers';


/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

/**
 * Set defaults for preloaded applications.
 */
export let loadedDeps = { };
loadedDeps[`bcc.${ utils.getDomainName() }!dapp-content`] = true;
loadedDeps[`smartcontracts.${ utils.getDomainName() }!dapp-content`] = true;

/**
 * check warnings only, after the first DApp was loaded
 */
let firstDApp = true;

/**
 * Splits an version, removes non number characters, reduce length to 3 and adds
 * missing numbers.
 *
 * @param      {string}  versionString  Version that should be splitted
 *                                      ("0.1.0")
 * @return     {Array<number|string>}  The splitted version.
 */
function getSplittedVersion(versionString: string): Array<number|string> {
  // get splitted version
  let splittedVersion: Array<number> = versionString
    .replace(/\~|\^/g, '').split('.')
    .map(versionNumber => parseInt(versionNumber, 10));

  // remove more than three version numbers
  splittedVersion.splice(3, splittedVersion.length);

  // fill missing version numbers
  while (splittedVersion.length < 3) {
    splittedVersion.push(0);
  }

  return splittedVersion;
}

/**
 * Takes an dbcp object and calculates the base path, where all the files are deployed, for this
 * DApp using the dbcp origin. When dev mode is enabled, the localhost path will be returned.
 *
 * @param      {any}     dbcp     dbcp object (with merged public / private)
 * @param      {string}  address  ens address or contract id, where the dbcp definition was loaded
 *                                from
 * @return     {string}  base url
 */
export function getDAppBaseUrl(dbcp: any, address: string): string {
  try {
    address = /^(.*)\.[^.]+$/.exec(address)[1];
  } catch (ex) { }

  if (utils.isDevAvailable(address) && address.indexOf('0x') !== 0) {
      return window.location.origin + '/external/' + address;
  } else {
    return evanGlobals.restIpfs
      .api_url('/' + (dbcp.dapp.isIpns ? 'ipns' : 'ipfs') + '/' + dbcp.dapp.origin);
  }
}

/**
 * Returns the ipfs hash to the dbcp of the child with the correct version.
 *
 * = > if its the latest version, the ipfs hash will be replaced by using the ens address.
 *     As a result of this, the ens & dapp loader plugin will also resolve dev versions,
 *     if the latest version is required.
 *
 * @param      {string}  requiredVersion  version that should be loaded from the
 *                                        child
 * @param      {string}  childENS         ens address of the child (the current
 *                                        deployed version is not listed in the
 *                                        versions object, the function sets the
 *                                        ens address within the versions object
 *                                        with the current version)
 * @param      {any}     childDefinition  DBCP definition of the child
 * @return     {string}  The version dbcp hash from the specific DApp version.
 */
function getVersionDBCPHashFromDAppVersion(requiredVersion: string, childENS: string, childDefinition: any): string {
  if (childDefinition && childDefinition) {
    const childVersions = childDefinition.versions || { };
    childVersions[childDefinition.version] = childENS.replace(/-/g, '');

    const versionKeys = Object.keys(childVersions);
    const splittedVersion = getSplittedVersion(requiredVersion);

    // check if the dependencies should uses upward compatibiltiy
    if (requiredVersion.startsWith('~')) {
      splittedVersion[2] = '*';
    } else if (requiredVersion.startsWith('^')) {
      splittedVersion[1] = '*';
      splittedVersion[2] = '*';
    }

    let versionToLoad: Array<number|string> = [ 0, 0, 0 ];
    for (let i = 0; i < versionKeys.length; i++) {
      const splittedChild = getSplittedVersion(versionKeys[i]);
      let isValid = true;

      for (let x = 0; x < 3; x++) {
        // check if we found an entry
        if (splittedVersion[x] !== splittedChild[x] && splittedVersion[x] !== '*') {
          isValid = false;

          break;
        }

        // direct return as valid, if e.g. the minor of the versionToLoad load than the new check
        // version (1.0.2 is lower than 1.1.0)
        if (splittedVersion[x] === '*' && versionToLoad[x] < splittedChild[x]) {
          break;
        }

        // check if a higher * value is selected
        if (splittedVersion[x] === '*' && versionToLoad[x] > splittedChild[x]) {
          isValid = false;

          break;
        }
      }

      if (isValid) {
        versionToLoad = splittedChild;
      }
    }

    requiredVersion = versionToLoad.join('.');

    // if the version was not found, throw error
    if (versionKeys.indexOf(requiredVersion) !== -1) {
      // check for IPFS hash or usal ens domain name
      if (childVersions[requiredVersion].indexOf('Qm') === 0) {
        return `${childVersions[requiredVersion]}!dapp-content`;
      } else {
        return `${ childVersions[requiredVersion] }.${ utils.getDomainName() }!dapp-content`;
      }
    } else {
      const msg = `Version not found: ${requiredVersion} for DApp ${childDefinition.name}`;
      console.error(msg);
      throw new Error(`Version not found: ${ requiredVersion } for DApp ${ childDefinition.name }`);
    }
  } else {
    const msg = `Invalid DApp definition detected`;
    console.error(msg);
    console.dir(childDefinition);
    throw new Error(`Invalid DApp definition detected`);
  }
}

/**
 * Loads all (sub) dependencies dbcp's of the provided dapp and set systemjs
 * maps to the correct dbcp hashes.
 *
 * Explanation:
 *   - load the latest dbcp.json from the dapp ens address
 *   - after this, the correct lib ipfs hash gets extracted from the version history of the latest
 *     dbcp.json
 *   - the new definition will loaded from the extracted ipfs hash and this versions will be
 *     overwritten by the latest one, to be sure, that all versions, including the latest one, are
 *     included
 *   - the used definition will now not the latest one, only the correct dbcp description of the
 *     desired version
 *   - dev version only used for DApps, that also requires the latest current version of the library
 *
 * @param      {string}           originName     name of the module that should
 *                                               be traversed
 * @param      {any}              ensDefinition  ens definition of the module
 *                                               that should be traversed
 *                                               (iterate through dependencies)
 * @param      {Array<Array<n>>}  depTree        dependency tree of a DApp
 * @param      {number}           deep           recursion count to prevent
 *                                               recursive dependency
 * @return     {Promise<Array<Array<n>>>}  dependency tree of a DApp
 *
 * Example:
 *  [
 *    [],
 *    [
 *      {
 *        "name": "angular-libs",
 *        "definition": {
 *          ...
 *        },
 *        "location": "angularlibs.evan!dapp-content"
 *      }
 *    ],
 *    [
 *      {
 *        "name": "angular-core",
 *        "definition": {
 *          ...
 *        },
 *        "location": "angularcore.evan!dapp-content"
 *      }
 *    ]
 *  ]
 */
export async function getDAppDependencies(originName: string, ensDefinition: any, depTree = [ ], deep = 0): Promise<Array<any>> {
  let deps = [ ];

  depTree.unshift(deps);

  // check for maximum dependency nesting
  if (deep > 19) {
    console.dir(ensDefinition);
    console.error('Recursive dependency detected.');
    throw new Error('Recursive dependency detected.');
  } else {
    deep++;

    // if the DApp has dependencies, trace them
    if (ensDefinition && ensDefinition.dapp && ensDefinition.dapp.dependencies) {
      const dependencies = ensDefinition.dapp.dependencies;

      if (typeof dependencies === 'object' && dependencies !== null) {
        const depKeys = Object.keys(dependencies);

        // load all dependencies, check for its location and trigger the sub loading
        for (let dependency of depKeys) {
          let subDefinition = await evanGlobals.System
            .import(`${ dependency }.${ utils.getDomainName() }!ens`);

          // resolve the correct ipfs hash from dbcp versions list
          // = > if its the latest version, the ipfs hash will be replaced by using the ens address.
          //     As a result of this, the ens & dapp loader plugin will also resolve dev versions,
          //     if the latest version is required.
          let versionLocation = getVersionDBCPHashFromDAppVersion(
            dependencies[dependency],
            dependency,
            subDefinition
          );

          // if a ipfs hash was returned by the getVersionDBCPHash... function, we are not loading
          // the latest version from ens, so we need to require the correct, version specific dbcp
          // json and merge the versions
          if (versionLocation.indexOf('Qm') === 0) {
            const previousDefinition = await evanGlobals.System
              .import(`${ versionLocation.replace('!dapp-content', '') }!ens`);

            // use the latest version history, to be sure, that the correct latest version is
            // included
            previousDefinition.versions = subDefinition.versions;

            // overwrite latest sub definition
            subDefinition = previousDefinition;
          }

          deps.unshift({
            name: dependency,
            definition: subDefinition,
            location: versionLocation
          });

          // load recursive dependencies
          await getDAppDependencies(dependency, subDefinition, depTree, deep);
        }
      }
    }
  }

  return depTree;
}

/**
 * Load all dependencies of the dapp using SystemJS and register its ens names, so each DApp can
 * load the dependency using it within import statements.
 *
 * @param      {string}        dappEns           ens of the dapp
 * @param      {boolean}       useDefaultDomain  decide if the default domain should be used
 * @return     {Promise<any>}  ens definition from the DApp
 */
export async function loadDAppDependencies(dappEns: string, useDefaultDomain?: boolean): Promise<any> {
  utils.devLog(`Loading dapp: ${ dappEns }`, 'trace');

  window['evanDApploadTime'] = Date.now();

  if (dappEns.indexOf('0x') !== 0 && useDefaultDomain) {
    dappEns = `${dappEns}.${utils.getDomainName()}`;
  }

  // load ens definition for the dapp that should be loaded
  const ensDefinition = await evanGlobals.System.import(`${dappEns}!ens`);

  // travers all deps and it'S version location
  const depCategories = await getDAppDependencies(dappEns, ensDefinition);

  // get loading status of the specific dapp
  const lastPercentage = utils.getLoadingProgress();
  // 1 (dapp to start) + count of dapp libs
  let depCount = 1;

  depCategories.forEach(depCategory => depCategory.forEach(dep => depCount++));

  const loadingSteps = (100 - lastPercentage) / depCount;

  // preload dapps
  // save zoneJSPromise to restore it, if a module provides it's own promise
  const zoneJSPromise = window['Promise'];
  for (let depCategory of depCategories) {
    if (depCategory.length > 0) {
      await Promise.all(depCategory.map(async (dep) => {
        // set systemjs map
        evanGlobals.System.map[dep.name] = dep.location;

        if (!loadedDeps[dep.location]) {
          try {
            // preimport application to handle references in code
            await evanGlobals.System.import(dep.name);
          } catch (ex) {
            console.error(ex);

            throw ex;
          }

          loadedDeps[dep.location] = true;
        }

        utils.raiseProgress(loadingSteps);
      }));
    }
  }
  window['Promise'] = zoneJSPromise;

  utils.raiseProgress(loadingSteps);
  return ensDefinition;
}

/**
 * loads a DApp description and register it's dependencies. Returns the js exported module and the
 * loaded ens definition.
 *
 * @param      {string}   dappEns           ens address
 * @param      {boolean}  useDefaultDomain  decide if the default domain should be used
 * @return     {any}      returns { module: { ... }, ensDefinition: {...}}
 */
export async function loadDApp(dappEns: string, useDefaultDomain?: boolean): Promise<any> {
  const ensDefinition = await loadDAppDependencies(dappEns, useDefaultDomain);
  const loadedModule = await evanGlobals.System.import(`${dappEns}!dapp-content`);

  return {
    module: loadedModule,
    ensDefinition: ensDefinition
  };
}

/**
 * Loads an DApp from ENS, resolves it's dependencies and runs the startDApp function or, in case of
 * an html entrypoint, adds an iframe and loads the url
 *
 * @param      {string}         dappEns           ens address to load the dapp from
 * @param      {Element}        container         element where DApp was started
 * @param      {boolean}        useDefaultDomain  add current default ens domain to
 * @return     {Promise<void>}  resolved when DApp started
 */
export async function startDApp(dappEns: string, container = document.body, useDefaultDomain?: boolean): Promise<void> {
  const ensDefinition = await loadDAppDependencies(dappEns, useDefaultDomain);

  // asynchroniously start dapp to speed up synchroniously loaded css files from dapp
  if (ensDefinition.dapp && ensDefinition.dapp.entrypoint) {
    // copy is firstLoad flag to check if its the first dapp that is started, so we can wait for
    // start screen loading animation to be finished
    const isFirstDApp = loading.isFirstLoad;

    // prefill origin, if it's missing
    if (!ensDefinition.dapp.origin) {
      dappEns = `${ ensDefinition.name }.${ utils.getDomainName() }`;
    }

    // save previous element that were included into the container and remove them, after the new
    // dapp has started (transform it into an array, to use it as an copy)
    let previousContainerChilds = [ ].map.call(document.body.childNodes, (el) => el);
    /**
     * Remove the previous container children to force previously opened dapp in this container, to
     * stop. Mostly used after the new dapp has started, to keep eventually loading screen that is
     * shown by the dapp.
     */
    const removePreviousContainerChilds = async () => {
      if (isFirstDApp) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      previousContainerChilds.forEach((childElement: any) => {
        if (childElement.parentElement === container) {
          container.removeChild(childElement);
        }
      });

      // delete dom element references to trigger garbage collection
      previousContainerChilds = [ ];
    };

    // lookup entrypoint and load dapp base url to provide it directly into the startDApp
    const entrypoint = ensDefinition.dapp.entrypoint;
    const dappBaseUrl = getDAppBaseUrl(ensDefinition, dappEns);
    if (entrypoint.endsWith('.js')) {
      // load the DApp and start it
      const dappModule = await evanGlobals.System.import(`${dappEns}!dapp-content`);
      await dappModule.startDApp(container, ensDefinition.name, dappEns, dappBaseUrl);

      // remove other elements from the container when they are still existing
      removePreviousContainerChilds();

      // check warnings, after first DApp was opened
      if (firstDApp) {
        firstDApp = false;
        setTimeout(() => watchForEveLow(), 3000);
      }
    // html entrypoint => create iframe
    } else if (entrypoint.endsWith('.html')) {
      const iframe = document.createElement('iframe');
      iframe.className += ' evan-dapp';

      // open the iframe using the dappBaseUrl
      iframe.setAttribute('src', `${ dappBaseUrl }#/${ dappEns }`);

      // remove the loading screen
      loading.finishDAppLoading();

      // and append the iframe to the dom
      container.appendChild(iframe);

      // remove other elements from the container when they are still existing
      removePreviousContainerChilds();
    } else {
      throw new Error('Invalid entry point defined!');
    }
  } else {
    throw new Error('No entry point defined!');
  }
}


