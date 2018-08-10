# dapp-browser
The dapp-browser is the wrapper application for the evan.network DApp framework. Using the project you will be possible to create featured DApps.

By using the evan.network framework to create featured DApps, the initialization of DBCP or the blockchain core is completely replaced and existing, initialized and configured instances can be loaded. This has the advantage that accounts, encryptions and similar complex configurations are executed dynamically by the user when the application is started.

To do this, however, all DApps must be started via the evan.network dapp-browser application, since this provides the complete function stack and the various UIs. As long as the provided functions are used, the application can only be started in environments that have the corresponding structures. Alternatively, the blockchain-core can be initialized, configured and used, as in the standalone example.

## Functionallity
The src folder includes a dev.html and a index.html file. By opening the dev.html file, the code will bypass several code loading checks, to try to load dapps from the local file server. The compiled files from the "src/app" folder will be placed within the runtime folder. Chosen files will be copied to the www folder for deployment and native app building. Durin the dev mode the application will try to load dapps not from ens and ipfs, but from the local file server (runtime/external). This folder will be filled using [angular-gulp](https://github.com/evannetwork/angular-gulp) and the lerna DApp projects (e.g. [core-dapps](https://github.com/evannetwork/ui-core-dapps)). During production mode, each DApp or contract will be loaded using its ens or contract address and dbcp description. How to develop DApps, that can be loaded via the dapp-browser, have a look here [DApp Basics](https://evannetwork.github.io/dapps/basics).

The DApp browser provides several functionallities to access
- DApp routing
- global utillity functions like log
- informations of the current logged in user
  - account id
  - lightwallet vault
  - provider (internal, external)
  - global synchronisation data queue
- blockchain connections configuration
- blockchain-core AccountStore and KeyProvider
- DApp time tracing options
- initialized blockchain-core structures
- IPFS cache
- ipfs handlers
- load and start sub DApps
- loading mechanisms
- SystemJS plugins for ENS loading, ENS and file loading, IPFS loading, JSON loading, CSS loading
- web3 handlers

## Building
- build the runtime folder
```sh
npm run build
```
- start a deployment
  - all folders within the runtime/external folder can be deployed
  - they should include a valid dbcp.json file and a dbcpPath.json file, that includes the origin
  -the content of this folder will be dynamcally created by the development build jobs of [angular-gulp](https://github.com/evannetwork/angular-gulp)

```sh
npm run deploy --config pathToConfig
```

- generate auto generated compodoc code documentation
```sh
npm run doc
```

- starts a local file serve within the runtime folder (http://localhost:3000/dev.html)
```sh
npm run serve
```

- runs the build command and watch for file changes
```sh
npm run serve-build
```

## Installation
```sh
npm i dapp-browser
```

## Usage
- typescript

tsconfig.json
```json
{
  "compilerOptions": {
    ...,
    "paths": {
      "dapp-browser": [
        "../node_modules/@evan.network/ui-dapp-browser/runtime/build/main.js"
      ]
    }
    ...
  }
}
```

## ENS Deployment
Each DApp can be deployed to the evan.network, so it can be accessed from anywhere, not only from a localhost server. This is handle by an wrapped library, to handle the deployment as simple as possible. To deploy your application run the following command. To deploy DApps to ens paths, you need one configuration file, that specifies which accounts and which configurations should be used for the deployment.
This file must be js / json files that exports specific values:

- accounts.js
```js
const bcConfig = {
  nameResolver: {
    ensAddress: process.env.ENS_ADDRESS || '0x937...',
    ensResolver: process.env.ENS_RESOLVER || '0xDC18...',
    labels: {
      businessCenterRoot: process.env.BC_ROOT || 'testbc.test',
      ensRoot: process.env.ENS_ROOT || 'test',
      factory: 'factory',
      admin: 'admin',
      eventhub: 'eventhub',
      profile: 'profile',
      mailbox: 'mailbox'
    },
    domains: {
      root: ['ensRoot'],
      factory: ['factory', 'businessCenterRoot'],
      adminFactory: ['admin', 'factory', 'ensRoot'],
      businessCenter: ['businessCenterRoot'],
      eventhub: process.env.ENS_EVENTS || ['eventhub', 'ensRoot'],
      profile: process.env.ENS_PROFILES || ['profile', 'ensRoot'],
      profileFactory: ['profile', 'factory', 'ensRoot'],
      mailbox: process.env.ENS_MAILBOX || ['mailbox', 'ensRoot'],
    },
  },
  smartAgents: {
    onboarding: {
      accountId: '0x063fB42cCe4CA5448D69b4418cb89E663E71A139',
    },
  },
  alwaysAutoGasLimit: 1.1
}

const runtimeConfig = {
  accountMap: {
    '0x001...': '01734...', // deploymentAccount: 'privateKey'
  },
  ipfs: { host: 'ipfs.evan.network', port: '443', protocol: 'https' },
  web3Provider: 'wss://testcore.evan.network/ws'
}

module.exports = { bcConfig, runtimeConfig }
```

```bash
npm run deploy --config pathToConfig
```

**Be sure that "pathToConfig" is the absolute path to your deployment configuration!**

Now, you can open the ens address to your application on https://dashboard.evan.network#/my-ens-address.evan. (my-ens-address = dbcp.name)

**blockchain-core and smart-contract origins will be deployed hardcoded to keep the correct working reference.**

## Ionic App generation
DApp-browser Files from the runtime folder will be copied into the www folder using cordova-prepare. After this, cordova dependencies will be injected into this folder and the correct cordova load options will be added to the html files.

### Android deployment
To create the application for Android, run the following commands:
```sh
cordova-prepare-android --config pathToConfig
cordova-run-android
```

The apk is build in this folder: "platforms/android/build/outputs".

Occures the following error ** ionic Manifest merger failed : Attribute meta-data#android.support.VERSION@value value=(25.4.0) from [com.android.support:appcompat-v7:25.4.0] AndroidManifest.xml:28:13-35 ** ?

Insert the following code at the end of the ui-dapp-browser/platforms/android/build.gradle file:

```
configurations.all {
    resolutionStrategy.eachDependency { DependencyResolveDetails details ->
        def requested = details.requested
        if (requested.group == 'com.android.support') {
            if (!requested.name.startsWith("multidex")) {
                details.useVersion '26.1.0'
            }
        }
    }
}
```

### IOS deployment
**You need to do this on an Apple Mac!**
Before you start building the application, you need to update the Versionnumber of the config.xml file.
To create the application on IOS, run the following commands:
```sh
cordova-prepare-ios
cordova-run-ios
```
"Cordova-run-ios" wil result within an error. But now, you can start XCode and do the following things:
- npm run cordova-prepare-ios / npm run cordova-prepare-android
- npm run cordova-run-ios
- move resource/icon-1024.png to resources in xcode
- edit info p-list properties
  - Privacy - Photo Library Usage Description : This app uses the photo library.
- disable "Requies full screen"
- toggle automatic signing
