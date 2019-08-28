# dapp-browser
The dapp-browser is the wrapper application for the evan.network DApp framework. Using the project you will be able to create featured DApps.

By using the evan.network framework to create featured DApps, the initialization of DBCP or the blockchain core is altered and existing, initialized and configured instances can be loaded. This has the advantage that accounts, encryptions and similar complex configurations are executed dynamically by the user when the application is started.

To do this, however, all DApps must be started via the evan.network dapp-browser application, since this provides the complete function stack and the various UIs. As long as the provided functions are used, the application can only be started in environments that have the corresponding structures. Alternatively, the blockchain-core can be initialized, configured and used, as in the standalone example.

## API Documentation and Tutorials
- [DApp Tutorials](https://evannetwork.github.io/dapps/basics)
- [API Reference UI](https://ipfs.test.evan.network/ipns/QmReXE5YkiXviaHNG1ASfY6fFhEoiDKuSkgY4hxgZD9Gm8/dapp-browser/index.html)

## Functionallity
The src folder includes a dev.html and a index.html file. By opening the dev.html file, the code will bypass several code loading checks, to try to load dapps from the local file server. The compiled files from the "src/app" folder will be placed within the runtime folder. Chosen files will be copied to the www folder for deployment and native app building. Durin the dev mode the application will try to load dapps not from ens and ipfs, but from the local file server (runtime/external). This folder will be filled using [angular-gulp](https://github.com/evannetwork/angular-gulp) and the lerna DApp projects (e.g. [core-dapps](https://github.com/evannetwork/ui-core-dapps)). During production mode, each DApp or contract will be loaded using its ens or contract address and dbcp description. How to develop DApps, that can be loaded via the dapp-browser, have a look here [DApp Basics](https://evannetwork.github.io/dapps/basics).

The DApp browser provides several functionallities to access
- DApp routing
- global utillity functions like log
- information of the current logged in user
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

## Installation
```sh
npm i @evan.network/ui-dapp-browser
```

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

- runs the build command, watch for file changes and starts a local file serve with the runtime folder
```sh
npm run serve-build
```

- expose local development server to others for testing
```sh
ssh -R evan:80:localhost:3000 serveo.net
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
Have a look at the [deployment description](https://evannetwork.github.io/dev/deployment).

## REPL Deployment
You can also start a repl for handling manual deployment steps. Just start the following script, with the same configuration that was passed below within the [ENS deployment description](https://evannetwork.github.io/dev/deployment).

```sh
npm run deploy-repl --config ...
```

Available params:
  - `advancedDeployment`
  - `configPath`
  - `dappDeploymentFolder`
  - `dappFolder`
  - `licensesFolder`
  - `mobileDeploymentFolder`
  - `originFolder`
  - `platformFolder`
  - `runtimeFolder`
  - `bcc`
  - `config`
  - `deploymentAccount`
  - `deploymentDomain`
  - `initialized`
  - `ipfsConfig`
  - `ipfsInstance`
  - `ipfsUrl`
  - `runtime`
  - `web3`

## Mobile App generation
DApp-browser Files from the runtime folder will be copied into the www folder using cordova-prepare. After this, cordova dependencies will be injected into this folder and the correct cordova load options will be added to the html files.

### Android deployment
Be sure to have the correct cordova version and it's dependencies installed:

- cordova: 6.5.0
- gradle: 5.3
- Android Studio
  - SDK 28, 27, 26, 25
  - Google play Services

To create the application for Android, run the following commands:

1. Add the android platform
```sh
cordova platform add android 
```

2. copy everything from `platforms-changes` to the platforms folder
```sh
cp -r platforms-changes/* platforms
```

3. prepare deployment folder for specific environment and build apk
```sh
npm run cordova-prepare-android --config ~/projects/evan.network/dev-environment/config/bcc/testnet.js
cordova build android
```

3. The APK is located within the directory `platforms/android/build/outputs/apk/debug`

### IOS deployment
**You need to do this on an Apple Mac!**
Before you start building the application, you need to update the Versionnumber of the config.xml file.
To create the application on IOS, run the following commands:
```sh
npm run cordova-prepare-ios --config ~/projects/evan.network/dev-environment/config/bcc/testnet.js
cordova build ios
```
"Cordova-run-ios" wil result within an error. But now, you can start XCode and do the following things:
- npm run cordova-prepare-ios / npm run cordova-prepare-android
- npm run cordova-run-ios
- move resource/icon-1024.png to resources in xcode
- edit info p-list properties
  - Privacy - Photo Library Usage Description : This app uses the photo library.
- disable "Requies full screen"
- toggle automatic signing
