/*
  Copyright (C) 2018-present evan GmbH.

  This program is free software: you can redistribute it and/or modify it
  under the terms of the GNU Affero General Public License, version 3,
  as published by the Free Software Foundation.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  See the GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License along with this program.
  If not, see http://www.gnu.org/licenses/ or write to the

  Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA, 02110-1301 USA,

  or download the license from the following URL: https://evan.network/license/

  You can be released from the requirements of the GNU Affero General Public License
  by purchasing a commercial license.
  Buying such a license is mandatory as soon as you use this software or parts of it
  on other blockchains than evan.network.

  For more information, please contact evan GmbH at this address: https://evan.network/license/
*/

const { lstatSync, readdirSync } = require('fs');
const express = require('express');
const gulp = require('gulp');
const serveStatic = require('serve-static');
const runSequence = require('run-sequence');
const path = require('path');

const isDirectory = source => lstatSync(source).isDirectory()
const getDirectories = source =>
  readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)

const enableBuild = process.argv.indexOf('--build') !== -1;

gulp.task('serve', async function () {
  process.chdir(path.resolve('..'));

  if (enableBuild) {
    require(path.resolve('./gulp/ionic.js'));

    await new Promise((resolve, reject) => runSequence('build', () => {
      gulp.watch([
        'src/**/*.ts',
        'src/**/*.js',
        'systemjs.config.js',
        '!src/build/*.js'
      ],
        ['build']);

      gulp.watch([
        'src/**/*.scss',
        '../ui-angular-sass/src/**/*.scss',
      ],
        ['ionic-sass', 'copy']);

      gulp.watch([
        'src/**/*.html',
        '!src/build/*.html'
      ],
        ['copy']);

      resolve();
    }))
  }

  var app = express();

  app.use(serveStatic('runtime'));
  app.use(serveStatic('.'));
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  app.use('/dev-dapps', (req, res) => {
    const data = {
      externals: []
    };

    try {
      data.externals = getDirectories(path.resolve('runtime/external'))
        .map(external => external.split(path.sep).pop());
    } catch (ex) { }

    console.log('Serving DApps locally: ' + data.externals.join(', '));

    res.send(data);
  });

  app.listen(3000, function () {
    console.log('\nServer running on 3000...');
  });
});
