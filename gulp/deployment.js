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

require('console.table');

// node_modules
const path = require('path');
const exec = require('child_process').exec;
const fs = require('fs');
const replace = require('gulp-replace');
const del = require('del');
const minify = require('gulp-minify');
const cleanCss = require('gulp-clean-css');
const request = require('request');
const http = require('http');
const https = require('https');
const IpfsServer = require('ipfs');
const inquirer = require('inquirer');
const IpfsApi = require('ipfs-api');
const Web3 = require('web3');
const gulp = require('gulp');

// blockchain-core / DBCP stuff
const { Ipfs, createDefaultRuntime, } = require('@evan.network/api-blockchain-core');

// path parameters
const configPath = path.resolve(process.argv[process.argv.indexOf('--config') + 1]);
const dappFolder = path.resolve('..');
const runtimeFolder = path.resolve('runtime');
const originFolder = path.resolve('runtime/external');
const dappDeploymentFolder = path.resolve('deployment');
const platformFolder = path.resolve('platforms');
const ionicDeploymentFolder = path.resolve('www');

// globals
let config;
let deploymentAccount;
let initialized;
let ipfsInstance;
let runtime;
let web3;

// runtime parameters
const enableDeploy = true;

// dapp-browser files that should be copied by default for browser
const dappBrowserFiles = [
  'build/app.min.js',
  'build/vendor.min.js',
  'build/dapp-root.css',
];

// ipfs + ipns default values and configurations
let dbcps = [
  {
    name: 'web3.min.js',
    file: 'QmXVX173ygohnfg8rxzhynrNFHLTLKUqcBEKAFrEZGA9JN',
    version: '1.0.0-beta.26',
    dapp: {}
  },
  {
    name: 'ipfs-api/dist/index.min.js',
    file: 'QmczFSf23jB7RhT5ptnkycCf57hTGdfUE1Pa2qbZe4pmEN',
    version: '17.5.0',
    dapp: {}
  }
];

const ipnsPrivateKeys = {
  dappbrowser: 'evan.network-dapp-browser',
  bcc: 'evan.network-blockchain-core',
  smartcontracts: 'evan.network-smart-contracts',
  bccdocs: 'evan.network-bccdocs',
  uidocs: 'evan.network-uidocs',
  dbcpdocs: 'evan.network-dbcpdocs'
};

const ipnsValues = {
  dappbrowser: 'QmeaaYgC38Ai993NUKbgvfBw11mrmK9THb6GtR48TmcsGj',
  bcc: 'Qme9gmKpueriR7qMH5SNW3De3b9AFBkUGvFMS8ve1SuYBy',
  smartcontracts: 'QmRMz7yzMqjbEqXNdcmqk2WMFcXtpY41Nt9CqsLwMgkF43',
  bccdocs: 'QmYmsPTdPPDLig6gKB1wu1De4KJtTqAXFLF1498umYs4M6',
  uidocs: 'QmReXE5YkiXviaHNG1ASfY6fFhEoiDKuSkgY4hxgZD9Gm8',
  dbcpdocs: 'QmSXPThSm6u3BDE1X4C9QofFfcNH86cCWAR1W5Sqe9VWKn'
};

// version mapping for version bump select
const versionMap = [
  'major',
  'minor',
  'snapshot'
];

/********************************** bcc runtime ************************************************/
async function createRuntime() {
  // deployment configuration and accounts
  try {
    config = require(process.argv[process.argv.indexOf('--config') + 1]);

    if (!config || !config.bcConfig || !config.runtimeConfig) {
      throw new Error('No or invalid config file specified!');
    }
    
    deploymentAccount = Object.keys(config.runtimeConfig.accountMap)[0];
  } catch (ex) {
    throw new Error('No or invalid config file specified!');
  }

  // initialize dependencies
  const web3 = new Web3();
  web3.setProvider(new web3.providers.WebsocketProvider(config.runtimeConfig.web3Provider));
  const dfs = new Ipfs({ remoteNode: new IpfsApi(config.runtimeConfig.ipfs), });

  return await createDefaultRuntime(web3, dfs, { accountMap: config.runtimeConfig.accountMap, });
}

/********************************** ipfs functions ************************************************/

const requestFileFromEVANIpfs = function(hash) {
  return new Promise((resolve, reject) => {
    let pinTimeout = setTimeout(() => {
      pinTimeout = false;

      resolve();
    }, 20 * 1000);

    request(`https://ipfs.evan.network/ipfs/${hash}`, function (error, response, body) {
      if (pinTimeout) {
        clearTimeout(pinTimeout);
        
        resolve();
      }
    });
  });
}

const pinToIPFSContractus = function(ipfsHash) {
  console.log(`ipfs.evan.network: pinning hash "${ipfsHash}"...`)

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ipfs.evan.network',
      port: '443',
      path: `/pins/${ipfsHash}`,
      headers : {
        'Authorization': `Basic ${Buffer.from('contractus:c0n7r4c7u5').toString('base64')}`
      },
      method : 'POST'
    }
    const req = https.request(options, (res) => {
      res.setEncoding('utf8')
      res.on('data', (chunk) => {  })
      res.on('end', async () => {
        console.log(`ipfs.evan.network: pinned hash  "${ipfsHash}"`)
        resolve()
      })
    })

    req.on('error', async (e) => {
      console.log(`ipfs.evan.network: failed to pin hash "${ipfsHash}"; ${e.message || e}`)
      await keyPressToContinue();
      reject(e)
    })

    req.on('timeout', async () => {
      console.log(`ipfs.evan.network: timeout during pinning of hash "${ipfsHash}"`)
      await keyPressToContinue();
      resolve()
    })

    // write data to request body
    req.write('')
    req.end()
  })
  .then(() => {
    console.log(`ipfs.evan.network: request hash "${ipfsHash}"...`)
    return requestFileFromEVANIpfs(ipfsHash)
      .catch(async () => {
        console.log(`ipfs.evan.network: failed to request hash from ipfs.evan.network "${ipfsHash}"; ${e.message || e}`)
        await keyPressToContinue();
      })
      .then(() => {
        console.log(`ipfs.evan.network: requested hash  "${ipfsHash}"`)
      });
  });
}

/**
 * Run "ipfs add -r ${path}" and returns the hash of the newly deployed folder
 * @param {string} folderName   FolderName that should be deployed (is used to splice out the ipfs folder hash)
 * @param {string} path         Path thath should be deployed (including folderName)
 */
async function deployIPFSFolder(folderName, path) {
  return new Promise((resolve, reject) => {
    runtime.dfs.remoteNode.util.addFromFs(path, { recursive: true}, (err, result) => {
      if (err) { throw err }
      resolve(result[result.length-1].hash);
    })
  });
}

async function deployToIpns(dapp, hash, retry) {
  if (!ipnsPrivateKeys[dapp]) {
    throw new Error(`ipns key for dapp ${ dapp } not registered!`);
  }

  console.log(`\n\nStart ipns deployment: ${ dapp } : ${ hash }`);
  // await new Promise((resolve, reject) => {
  //   exec(`ipfs key gen --type=rsa --size=2048 ${ ipnsPrivateKeys[dapp] }`, {

  //   }, (err, stdout, stderr) => {
  //     resolve(stdout);
  //   })
  // })

  await new Promise((resolve, reject) => {
    console.log(`Publish to ipns: ${ dapp } : ${ hash }`);

    exec(`ipfs name publish --key=${ ipnsPrivateKeys[dapp] } --lifetime=8760h /ipfs/${ hash }`, {

    }, async (err, stdout, stderr) => {
      console.log('ipfs name publish');
      console.log(err);
      console.log(stdout);
      console.log(stderr);

      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  })
}

keyPressToContinue = async function() {
  console.log('press any key to continue...');

  await new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => resolve());
  });
}

const clearConsole = function() {
  console.clear();
};

/********************************** dapps deployment functions ************************************/

const prepareDappsDeployment = function(dapps) {
  del.sync(`${dappDeploymentFolder}`, { force: true });

  return Promise.all(dapps.map(dapp => {
    return new Promise(resolve => {
      gulp
        .src(`${ originFolder }/${ dapp }/**/*`)
        .pipe(gulp.dest(`${ dappDeploymentFolder }/${ dapp }`))
        .on('end', () => {
          del.sync([
            `${ dappDeploymentFolder }/${ dapp }/*.map`
          ], { force : true })
        
          resolve();
        })
    })
  }));
};

const logDbcps = function() {
  clearConsole();
  console.log(`\n\nContractus - Deployment (${ config.bcConfig.nameResolver.labels.ensRoot })\n`);
  console.log('-------------------------\n\n');

  console.table(dbcps.map(dbcp => {
    return {
      name: dbcp.name,
      version: dbcp.version,
      description: dbcp.dapp.descriptionHash,
      folder: dbcp.dapp.origin,
      ipns: dbcp.dapp.ipns || ipnsValues[dbcp.name],
      file: dbcp.file
    }
  }));

  console.log('--------------------------\n');
  console.log('Watch pins : \n');
  console.log('http://localhost:5004/webui');
  console.log('http://contractus:c0n7r4c7u5@ipfs.evan.network:443/pins');
  console.log('\n--------------------------\n');

  const ionicInstallation = getDbcpFromList('Ionic DApp');

  console.log('Open ionic app : \n');
  if (ionicInstallation) {
    console.log(`https://ipfs.evan.network/ipfs/${ ionicInstallation.dapp.origin }/index.html`);
  }
  console.log(`https://ipfs.evan.network/ipns/QmeaaYgC38Ai993NUKbgvfBw11mrmK9THb6GtR48TmcsGj/index.html`);
  console.log('\n--------------------------\n');
}

const addDbcpToList = function(dbcp) {
  for (let i = 0; i < dbcps.length; i++) {
    if (dbcps[i].name === dbcp.name) {
      dbcps.splice(i, 1);
      
      break;
    }
  }
  
  dbcps.push(dbcp);
}

const getDbcpFromList = function(name) {
  return dbcps.find(dbcp => dbcp.name === name);
}

const updateDBCPVersion = function(dbcp, version, beforeHash) {
  let splittedVersion = (dbcp.public.version || '').split('.');
  splittedVersion = splittedVersion.map(versionNumber => parseInt(versionNumber));
  splittedVersion.splice(3, splittedVersion.length);
  
  // fill missing version numbers
  while (splittedVersion.length < 3) {
    splittedVersion.push(0);
  }

  if (!dbcp.public.versions) {
    dbcp.public.versions = { };
  }

  const versionBump = versionMap.indexOf(version);

  if (versionBump > -1) {
    splittedVersion[versionBump] = splittedVersion[versionBump] + 1;

    if (versionBump < 1) {
      splittedVersion[1] = 0;
    }

    if (versionBump < 2) {
      splittedVersion[2] = 0;
    }
  }

  // set latest version
  if (beforeHash) {
    dbcp.public.versions[dbcp.public.version] = beforeHash;
    dbcp.public.version = splittedVersion.join('.');
  }
}

function saveDBCPFile(dbcpPath, dbcp) {
  fs.writeFileSync(dbcpPath, JSON.stringify(dbcp, null, 2));
}

/**
 * Use external folders of the
 * @param {Array<string>} externals   Array of folder paths that should be deployed
 * @param {Ipfs} ipfs                 Blockchain-Core IPFS instance
 */
async function deployDApps(externals, version) {
  for (let external of externals) {
    const currIndex = externals.indexOf(external);

    // build status
    const statusTable = [ ];
    for (let i = 0; i < externals.length; i++) {
      statusTable.push({
        name: `${ i + 1 }. ${ externals[i] }`,
        status: i < currIndex ? 'done' : i > currIndex ? 'outstanding' : 'running' 
      });
    }

    clearConsole();
    logDbcps(dbcps);
  
    console.log(`\n\nDeploying Dapps... (${ currIndex + 1} / ${ externals.length })\n`);
    console.table(statusTable);
    console.log('\n\n');

    try {
      const folderName = `${dappDeploymentFolder}/${external}`;
      let dbcp = require(`${folderName}/dbcp.json`);
      let dbcpPath;

      try {
        dbcpPath = require(`${folderName}/dbcpPath.json`).dbcpPath;
      } catch (ex) { }

      // add support for sub ens domains
      let address = dbcp.public.name;
      if (config.runtimeConfig.subEns) {
        address += `.${ config.runtimeConfig.subEns }`;
      }
      address += `.${ runtime.nameResolver.getDomainName(config.bcConfig.nameResolver.domains.root) }`;

      let beforeHash = await runtime.nameResolver.getContent(address);

      if (beforeHash) {
        beforeHash = beforeHash.startsWith('Qm') ? beforeHash : Ipfs.bytes32ToIpfsHash(beforeHash);
      }

      dbcp.public.dapp.origin = await deployIPFSFolder(external, `${folderName}`);

      updateDBCPVersion(dbcp, version, beforeHash);
      saveDBCPFile(`${ runtimeFolder }/external/${external}/dbcp.json`, dbcp);
      
      if (dbcpPath) {
        saveDBCPFile(dbcpPath, dbcp);
      }

      // initialize the ens contract to get the original owner of the ens address 
      const ens = runtime.contractLoader.loadContract('AbstractENS', config.bcConfig.nameResolver.ensAddress);
      const owner = await runtime.executor.executeContractCall(ens, 'owner', runtime.nameResolver.namehash(address));

      await runtime.description.setDescriptionToEns(address, {
        public: dbcp.public
      }, deploymentAccount);

      // restore owner of the ens address
      if (owner !== '0x0000000000000000000000000000000000000000') {
        await runtime.executor.executeContractTransaction(
          ens,
          'setOwner',
          {
            from: deploymentAccount,
            gas: 200000
          },
          runtime.nameResolver.namehash(address),
          owner,
        );
      }

      let descriptionHash = await runtime.nameResolver.getContent(address);

      await pinToIPFSContractus(descriptionHash);
      await pinToIPFSContractus(dbcp.public.dapp.origin);

      if (dbcp.public.dapp.files) {
        for (const file of dbcp.public.dapp.files) {
          console.log(`Pinning: ${dbcp.public.dapp.origin}/${file}`);

          await pinToIPFSContractus(`${dbcp.public.dapp.origin}/${file}`);
        }
      }

      if (ipnsPrivateKeys[dbcp.public.name]) {
        await deployToIpns(dbcp.public.name, dbcp.public.dapp.origin);
      }

      addDbcpToList(dbcp.public);
    } catch (ex) {
      console.log(`   Failed to deploy dbcp : ${ external }`);
      console.dir(ex);

      await keyPressToContinue();
    }
  }

  return dbcps;
}

const loadDbcps = async function(externals) {
  console.log('Loading deployed DApps...');

  for (let external of externals) {
    try {
      let dbcp = require(`${originFolder}/${external}/dbcp.json`);
      dbcp = Object.assign(dbcp.public, dbcp.private);

      let address = dbcp.name;
      if (config.runtimeConfig.subEns) {
        address += `.${ config.runtimeConfig.subEns }`;
      }
      address += `.${ runtime.nameResolver.getDomainName(config.bcConfig.nameResolver.domains.root) }`;

      let descriptionHash = await runtime.nameResolver.getContent(address);

      if (descriptionHash) {
        descriptionHash = descriptionHash.startsWith('Qm') ? descriptionHash : Ipfs.bytes32ToIpfsHash(descriptionHash);
      
        let loaded = await runtime.description.getDescriptionFromEns(address);
        loaded = Object.assign(loaded.public, loaded.private);
  
        dbcp.dapp.origin = loaded.dapp.origin;
      }

      addDbcpToList(dbcp);
    } catch (ex) {
      console.log(`   Failed to load dbcp : ${ external }`);
      console.dir(ex);
    }
  }
}

/********************************** ionic functions ***********************************************/
prepareIonicDeploy = async function () {
  const bcc = getDbcpFromList('bcc');
  const smartcontracts = getDbcpFromList('smartcontracts');

  await del.sync(`${ionicDeploymentFolder}`, { force: true });

  await new Promise(resolve => gulp
    .src([
      'index.html',
      'favicon.ico',
      'manifest.json',
      'logo.png',
      'cache.manifest',
      'cordova.js'
    ]
    .map(file => `${ runtimeFolder }/${ file }`))
    .pipe(gulp.dest(ionicDeploymentFolder))
    .on('end', () => resolve())
  );

  // copy dbcp description
  await new Promise(resolve => gulp
    .src([ `${ dappFolder }/dbcp.json` ])
    .pipe(gulp.dest(ionicDeploymentFolder))
    .on('end', () => resolve())
  );

  await new Promise(resolve => gulp
    .src(dappBrowserFiles.map(file => `${runtimeFolder}/${file}`))
    .pipe(gulp.dest(`${ ionicDeploymentFolder }/build`))
    .on('end', () => resolve())
  );
};

const prepareIonicAppBuild = async function(platform) {
  const dapps = loadDApps();

  await initializeDBCPs(dapps);
  logDbcps();
  await prepareIonicDeploy();

  console.log('copy platform cordova assets...');
  await new Promise((resolve, reject) => gulp
    .src([
      `${platformFolder}/${ platform }/platform_www/**/*`,
    ])
    .pipe(gulp.dest(ionicDeploymentFolder))
    .on('end', () => resolve())
  );

  console.log('enable cordova loading...');
  await new Promise((resolve, reject) => gulp
    .src([
      `${ionicDeploymentFolder}/index.html`,
    ])
    .pipe(replace(
      /<!-- insertcordovahere -->/g,
      '<script src="cordova.js"></script>'
    ))
    .pipe(gulp.dest(ionicDeploymentFolder))
    .on('end', () => resolve())
  );

  await del.sync(`${ionicDeploymentFolder}/build`, { force: true });
}

const ionicDeploy = async function (version) {
  logDbcps();
  
  const folderHash = await deployIPFSFolder('www', ionicDeploymentFolder);

  await pinToIPFSContractus(folderHash);

  for (let file of dappBrowserFiles) {
    await pinToIPFSContractus(`${ folderHash }/${ file }`);
  }

  await deployToIpns('dappbrowser', folderHash);

  addDbcpToList({
    name: 'Ionic DApp',
    dapp: {
      origin: folderHash,
      ipns: 'QmeaaYgC38Ai993NUKbgvfBw11mrmK9THb6GtR48TmcsGj'
    }
  });
};

/********************************** uglify functions ***********************************************/

const uglifyJS = async function(folder) {
  return new Promise((resolve, reject) => {
    gulp
      .src([
        `${folder}/**/*.js`,
        `${folder}/**/*.json`
      ])
      .pipe(minify({
        ext: {
          src: '.js',
          min: '.js'
        },
        noSource: true,
        mangle: {
          reserved: [ 'DAGNode', 'Block' ]
        }
      }))
      .pipe(replace('isMultiaddr=function(', 'isMultiaddr=function(){return true;},function('))
      .pipe(gulp.dest(folder))
      .on('end', () => {
        console.log('on end')
        resolve()
      });
  });
}

const uglifyCSS = async function (folder) {
  return new Promise((resolve, reject) => {
    gulp
      .src(`${folder}/**/*.css`)
      .pipe(cleanCss())
      .pipe(gulp.dest(folder))
      .on('end', () => resolve());
  });
};

const uglify = async function(mode, folder) {
  logDbcps();

  console.log(`Uglify sources (${ mode })...`);

  console.log(`\nUglify js...`);
  await uglifyJS(folder);
  console.log(`\nUglify css...`);
  await uglifyCSS(folder);
};

/********************************** menu functions ************************************************/
const loadDApps = function() {
  return fs
    .readdirSync(originFolder)
    .map(name => `${originFolder}/${name}`)
    .filter(source => fs.lstatSync(source).isDirectory())
    .map(dappPath => {
      const splitted = dappPath.split('/');

      return splitted[splitted.length - 1];
    });
}

const initializeDBCPs = async function(dapps) {
  initialized = true;
  clearConsole();

  console.log('\n\nstart bcc runtime')
  runtime = await createRuntime();

  await loadDbcps(dapps);
}

const deploymentMenu = async function() {
  const dapps = loadDApps();

  if (!initialized) {
    await initializeDBCPs(dapps);
  }
  
  const questions = [
    {
      name: 'deploymentType',
      message: `What do you want to deploy? (${ config.bcConfig.nameResolver.labels.ensRoot })`,
      type: 'list',
      choices: [
        new inquirer.Separator(),
        {
          name: 'All DApps & Ionic DApp',
          value: 'everything',
        },
        {
          name: 'All DApps',
          value: 'all-dapps',
        },
        {
          name: 'Ionic DApp',
          value: 'ionic-dapp',
        },
        new inquirer.Separator(),
      ]
    },
    {
      name: 'version',
      message: 'Which version number to you want to raise?',
      type: 'list',
      default: false,
      choices: [
        {
          name: 'replace',
          value: 'replace',
        },
        {
          name: 'snapshot',
          value: 'snapshot',
        },
        {
          name: 'minor',
          value: 'minor',
        },
        {
          name: 'major',
          value: 'major',
        },
        new inquirer.Separator(),
      ],
      when: (results) => {
        if (results.deploymentType !== 'exit') {
          return true;
        } else {
          return false;
        }
      }
    },
    {
      name: 'uglify',
      message: 'Do you want to uglify the code?',
      type: 'list',
      default: false,
      choices: [
        {
          name: 'Keep it normal ugly',
          value: false,
        },
        {
          name: 'Uglify',
          value: true,
        },
        new inquirer.Separator(),
      ],
      when: (results) => {
        if (results.deploymentType !== 'exit') {
          return true;
        } else {
          return false;
        }
      }
    }
  ];

  for (let i = 0; i < dapps.length; i++) {
    questions[0].choices.push({
      name : dapps[i],
      value : dapps[i]
    });
  }

  questions[0].choices.push(new inquirer.Separator());
  questions[0].choices.push({
    name: 'Exit',
    value: 'exit'
  });

  questions[0].pageSize = questions[0].choices.length;
  
  logDbcps();
  console.log('\n\n');
  
  try {
    await new Promise((resolve, reject) => {
      var prompt = inquirer.createPromptModule();
      
      prompt(questions)
        .then(async results => {
          clearConsole();

          switch(results.deploymentType) {
            case 'everything':
            case 'all-dapps': {
              await prepareDappsDeployment(dapps);

              if (results.uglify) {
                await uglify(results.deploymentType, dappDeploymentFolder);
              }
      
              if (enableDeploy) {
                await deployDApps(dapps, results.version);
              }

              if (results.deploymentType !=='everything') {
                break;
              }
            }
            case 'ionic-dapp': {
              await prepareIonicDeploy();

              if (results.uglify) {
                await uglify(results.deploymentType, ionicDeploymentFolder);
              }

              if (enableDeploy) {
                await ionicDeploy(results.version);
              }
      
              break;
            }
            case 'exit': {
              process.exit();
            }
            default: {
              await prepareDappsDeployment([ results.deploymentType ]);
              
              if (results.uglify) {
                await uglify(results.deploymentType, dappDeploymentFolder);
              }
      
              if (enableDeploy) {
                await deployDApps([ results.deploymentType ], results.version);
              }
      
              break;
            }
          }
  
          resolve();
        });
    })
  
    await deploymentMenu();
  } catch(ex) {
    console.log(`   Error: `);
    console.dir(ex);

    await keyPressToContinue();
  }
};

gulp.task('deploy', deploymentMenu);

gulp.task('prepare-ionic-android', async function() {
  await prepareIonicAppBuild('android');
});

gulp.task('prepare-ionic-ios', async function() {
  await prepareIonicAppBuild('ios');
});