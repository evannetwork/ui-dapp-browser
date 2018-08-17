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
 * PLUNKER VERSION
 * (based on systemjs.config.js in angular.io)
 * System configuration for Angular samples
 * Adjust as necessary for your application needs.
 */
(function (global) {
  var config = {
    transpiler: 'ts',
    typescriptOptions: {
      tsconfig: true
    },
    meta: {
      'typescript': {
        "exports": "ts"
      },
      'angular-core': {
        build: false
      },
      'app': {
        deps: [
          // dependencies to load before this module
          'src/libs/core-js.client.shim.min.js',
          'src/libs/zone.js',
          'ipfs',
          'ens',
          'data-content',
          'json',
          'css'
        ]
      },
      'systemjs': {
        format: 'global'
      }
    },
    scriptLoad: true,
    paths: {
      // paths serve as alias
      'npm:': '../ui-dapp-browser/node_modules/',
      'systemjs-plugins': 'src/systemjs-plugins',
      'app': 'src/app'
    },
    // map tells the System loader where to look for things
    map: {
      // plugins
      'ipfs': 'src/systemjs-plugins/ipfs.js',
      'ens': 'src/systemjs-plugins/ens.js',
      'dapp-content': 'src/systemjs-plugins/dapp-content.js',
      'json': 'src/systemjs-plugins/json.js',
      'text': 'src/systemjs-plugins/text.js',
      'css': 'node_modules/systemjs-plugin-css/css.js',
      'systemjs': 'npm:systemjs/dist/system.src.js',

      'dapp': 'src/app/main.ts',
      'dapp-browser': 'src/app/main.ts',

      // npm
      'ts': 'npm:plugin-typescript/lib/plugin.js',
      'typescript': 'npm:typescript/lib/typescript.js',
    },
    // packages tells the System loader how to load when no filename and/or no extension
    packages: {
      app: {
        main: './main.ts',
        defaultExtension: 'ts',
        scriptLoad: true,
        map: {
          './contractus-utils': 'src/app/contractus-utils.ts',
          './ens-cache': 'src/app/ens-cache.ts',
          '../app/ens-cache': 'src/app/ens-cache'
        },
      },
    }
  };

  System.config(config);
})(this);

/*
Copyright 2016 Google Inc. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at http://angular.io/license
*/
