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

const isDirectory = (source) => lstatSync(source).isDirectory();
const getDirectories = (source) => readdirSync(source).map((name) => path.join(source, name)).filter(isDirectory);

const enableBuild = process.argv.indexOf('--build') !== -1;

gulp.task('serve', async () => {
  process.chdir(path.resolve('..'));

  const app = express();

  app.use(serveStatic('dist'));
  app.use(serveStatic('.'));
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.use('/dev-dapps', (req, res) => {
    const data = {
      dapps: [],
    };

    try {
      data.dapps = getDirectories(path.resolve('dist/dapps'))
        .map((external) => external.split(path.sep).pop());
    } catch (ex) { }

    console.log(`Serving DApps locally: ${data.dapps.join(', ')}`);

    res.send(data);
  });

  app.listen(3000, () => {
    console.log('\nServer running on http://localhost:3000 ...');
  });
});
