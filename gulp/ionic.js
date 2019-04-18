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

const { lstatSync, readdirSync } = require('fs');
const babel = require('gulp-babel');
const Builder = require('systemjs-builder');
const concat = require('gulp-concat');
const cssBase64 = require('gulp-css-base64');
const del = require('del');
const express = require('express');
const gulp = require('gulp');
const gulpWatch = require('gulp-debounced-watch');
const insert = require('gulp-insert');
const path = require('path');
const plumber = require('gulp-plumber');
const replace = require('gulp-replace');
const runSequence = require('run-sequence');
const sass = require('gulp-sass');
const serveStatic = require('serve-static');
const sourcemaps = require('gulp-sourcemaps');
const tsc = require('gulp-typescript');
const tscConfig = require('./../tsconfig.json');
const tslint = require('gulp-tslint');
const uglify = require('gulp-uglify');

// Generate systemjs-based builds
const buildFolder = 'src/build';
const distFolder = 'runtime/build';

const sourceMaps = false;
const minify = false;

const babelPlugins = [
  'babel-plugin-transform-es2015-template-literals',
  'babel-plugin-transform-es2015-literals',
  'babel-plugin-transform-es2015-function-name',
  'babel-plugin-transform-es2015-arrow-functions',
  'babel-plugin-transform-es2015-block-scoped-functions',
  'babel-plugin-transform-es2015-classes',
  'babel-plugin-transform-es2015-object-super',
  'babel-plugin-transform-es2015-shorthand-properties',
  'babel-plugin-transform-es2015-computed-properties',
  'babel-plugin-transform-es2015-for-of',
  'babel-plugin-transform-es2015-sticky-regex',
  'babel-plugin-transform-es2015-unicode-regex',
  'babel-plugin-check-es2015-constants',
  'babel-plugin-transform-es2015-spread',
  'babel-plugin-transform-es2015-parameters',
  'babel-plugin-transform-es2015-destructuring',
  'babel-plugin-transform-es2015-block-scoping',
  'babel-plugin-transform-es3-property-literals',
  'babel-plugin-remove-comments'
].map(require.resolve);

gulp.task('bundle:vendor', function() {
  return gulp.src([
    'src/libs/core-js.client.shim.min.js',
    'src/libs/system.src.js',
    'src/libs/navigo.js',
    'src/libs/polyfills.js',
    'systemjs.config.js',
  ])
  .pipe(babel({
    plugins: babelPlugins
  }))
  .pipe(concat('vendor.min.js'))
  .pipe(gulp.dest('src/build'));
})

gulp.task('bundle:js', ['bundle:vendor'], function() {
  var builder = new Builder('.', 'systemjs.config.js');

  return builder
    .bundle(
      [
        'app',
        'src/systemjs-plugins/ipfs.js',
        'src/systemjs-plugins/ens.js',
        'src/systemjs-plugins/dapp-content.js',
        'src/systemjs-plugins/json.js',
        'src/systemjs-plugins/text.js',
        'node_modules/systemjs-plugin-css/css.js'
      ].join(' + '),
      'src/build/app.min.js',
      {
        sourceMaps: sourceMaps,
        sourceMapContents: sourceMaps,
        minify: minify
      }
    )

    .then(function() {
      return del([
        'runtime/build/js/**',
        '!runtime/build/js/app.min.js',
        '!runtime/build/js/vendor.min.js'
      ]);
    })

    // prepent bcc closure parameter to use loaded bcc within systemjs plugin without outsourcing
    // to window
    .then(() => {
      return gulp
        .src(['src/build/app.min.js'])
        .pipe(insert.prepend('let evanGlobals; let process = { env: { } }; '))
        .pipe(babel({
          plugins: babelPlugins
        }))
        .pipe(gulp.dest('src/build'));
    })
    .catch(function(err) {
      console.error('>>> [systemjs-builder] Bundling failed'.bold.green, err);
    })
});

// Compile TypeScript to JS
gulp.task('compile:ts', function () {
  return gulp
    .src([
      'src/app/*.ts',
      'src/app/**/*.ts',
    ], { allowEmpty: true })
    .pipe(plumber({
      errorHandler: function (err) {
        console.error('>>> [tsc] Typescript compilation failed'.bold.green);
        this.emit('end');
      }}))
    .pipe(sourcemaps.init())
    .pipe(tsc(tscConfig.compilerOptions))
    .pipe(sourcemaps.write('src/build'))
    .pipe(gulp.dest('src/build'));
});

// Minify JS bundle
gulp.task('minify:js', function() {
  return gulp
    .src('runtime/dist/js/app.min.js', { allowEmpty: true })
    .pipe(uglify())
    .pipe(gulp.dest('runtime/dist/js'));
});

gulp.task('copy:build', function () {
  return gulp.src([`${buildFolder}/*`])
    .pipe(gulp.dest(distFolder));
});


gulp.task('copy:assets', function() {
  return gulp.src(
    [
      'src/*.json',
      'src/*.js',
      'src/*.html',
      'src/*.css',
      'src/*.ico',
      'src/*.png',
      'src/!*.ts',
      'src/!*.scss',
      'src/manifest.json',
      'src/libs/cordova.js',
    ], { allowEmpty: true })
    .pipe(gulp.dest('runtime'))
});

// Clean the js distribution directory
gulp.task('clean:dist', function () {
  return del(['runtime/*', '!runtime/external']);
});

gulp.task('clean', ['clean:dist']);


// Lint Typescript
gulp.task('lint:ts', function() {
  return gulp.src('src/**/*.ts')
    .pipe(tslint())
    .pipe(tslint.report({
      formatter: 'verbose',
      emitError: false })
    );
});

gulp.task('ionic-sass', function () {
  return gulp
    .src(path.resolve(`src/**/*.scss`))
    .pipe(
      sass({
        outputStyle : 'compressed',
      })
      .on('error', sass.logError)
    )
    // remove ttf and woff font files from build
    // file is 1,4mb big => to reduce file size, remove noto sans font files
    .pipe(replace(/(?:,\s?)?url\(\'[^']*\'\) format\(\'(?:truetype|woff2)\'\)(?:,\s?)?/g, ''))
    .pipe(concat(`dapp-root.css`))
    .pipe(cssBase64({ maxWeightResource: 849616, baseDir : 'node_modules/ui-angular-sass' }))
    .pipe(cssBase64({ maxWeightResource: 849616, baseDir : '../../ui-angular/ui-angular-sass' }))
    .pipe(cssBase64({ maxWeightResource: 228000, baseDir : '../../ui-angular/ui-angular-libs/node_modules/ionic-angular/fonts' }))
    .pipe(gulp.dest(buildFolder));
});


gulp.task('scripts', function(callback) {
  runSequence(['lint:ts', 'clean:dist'], 'compile:ts', 'bundle:js', 'minify:js', callback);
});

gulp.task('copy', function(callback) {
  runSequence('copy:build', 'copy:assets', callback);
});

gulp.task('build', function(callback) {
  runSequence('scripts', 'ionic-sass', 'copy', callback);
});

gulp.task('default', function(callback) {
  runSequence('build', 'serve', callback);
});

