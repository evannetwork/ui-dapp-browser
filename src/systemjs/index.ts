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

// import libs
import { getDomainName } from '../app/utils';
import { registerPlugins } from './plugins/index';
import './system.src';

const { System } = window as any;

// register old maps to be backwards compatible to dapp-browser version 2.0
System.map['@evan.network/api-blockchain-core'] = `bcc.${getDomainName()}!dapp-content`;
System.map['@evan.network/dbcp'] = `bcc.${getDomainName()}!dapp-content`;
System.map['smart-contracts'] = `smartcontracts.${getDomainName()}!dapp-content`;
System.map['@evan.network/smart-contracts-core'] = `smartcontracts.${getDomainName()}!dapp-content`;
System.map['@evan.network/ui-angular-libs'] = 'angularlibs.evan!dapp-content';
System.map['angular-libs'] = 'angularlibs.evan!dapp-content';
System.map['@evan.network/ui-angular-core'] = 'angularcore.evan!dapp-content';
System.map['angular-core'] = 'angularcore.evan!dapp-content';

// register plugins dynamically
registerPlugins(System);

/**
 * Overwrite SystemJS import to add additional logs for dev tracing.
 *
 * @param      {string}  pathToLoad  The path to load
 * @return     {Promise<any>}  SystemJS result
 */
System.originalImport = System.import;
System.import = function (pathToLoad: string): Promise<any> {
  /* if an export function with the following pattern (#***!dapp-content) was specified, replace the
     export function for the System.import */
  let exportFunction: any = pathToLoad.match(/#(.*)!/g);
  if (exportFunction && exportFunction.length > 0) {
    exportFunction = exportFunction[0].replace(/#|!/g, '');
    pathToLoad.replace(exportFunction, '!');
  }

  return System
    .originalImport(pathToLoad)
    .then((result: any) => {
      // if an export function is selected and available, return only this value
      if (exportFunction && result[exportFunction]) {
        return result[exportFunction];
      }
      return result;
    });
};


export default System;
