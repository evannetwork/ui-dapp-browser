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

const { lstatSync, readdirSync } = require('fs');
const express = require('express');
const gulp = require('gulp');
const serveStatic = require('serve-static');
const path = require('path');

const isDirectory = source => lstatSync(source).isDirectory()
const getDirectories = source =>
  readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)

const enableBuild = process.argv.indexOf('--build') !== -1;

gulp.task('serve', async function () {
  process.chdir(path.resolve('..'));

  if (enableBuild) {
    // run build script initially
    require(path.resolve('./gulp/build.js'));
    await new Promise(resolve => gulp.task('build')(resolve));

    // watch for changes
    gulp.watch(
      [
        'src/**/*.ts',
        'src/libs/*.js',
        'src/systemjs-plugins/*.js',
        'src/*.js',
        'systemjs.config.js',
        '!src/build/*.js'
      ],
      gulp.series(['build'])
    );

    gulp.watch(
      [
        'src/**/*.scss',
      ],
      gulp.series(['sass', 'copy'])
    );

    gulp.watch(
      [
        'src/**/*.html',
        '!src/build/*.html'
      ],
      gulp.series(['copy'])
    );
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
    console.log('\nServer running on http://localhost:3000 ...');
  });
});
