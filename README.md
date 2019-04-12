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

- runs the build command and watch for file changes
```sh
npm run serve-build
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

## Ionic App generation
DApp-browser Files from the runtime folder will be copied into the www folder using cordova-prepare. After this, cordova dependencies will be injected into this folder and the correct cordova load options will be added to the html files.

### Android deployment
Be sure to have the correct cordova and ionic versions installed:

- cordova: 6.5.0
- ionic: 3.20.0
- gradle: 5.3
- Android Studio
  - SDK 28, 27, 26, 25
  - Google play Services

To create the application for Android, run the following commands:

1. Add the android platform
```sh
ionic cordova platform add android 
```

2. open `platforms/android/build.gradle`

- Replace in the `buildscript` and `allprojects`

```
maven { url "https://maven.google.com" }
jcenter { url "http://jcenter.bintray.com/" }
```

with 

```
jcenter()
maven {
    url "https://maven.google.com"
}

- Replace in the `buildscript.dependencies` section

```
classpath 'com.android.tools.build:gradle:3.0.0'
```

with 


```
classpath 'com.android.tools.build:gradle:3.0.0'
classpath 'com.google.gms:google-services:4.1.0'
```

- Add the following snippet to the end of the file:

** ionic Manifest merger failed : Attribute meta-data#android.support.VERSION@value value=(25.4.0) from [com.android.support:appcompat-v7:25.4.0] AndroidManifest.xml:28:13-35 **

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

3. open `platforms/android/project.properties`
`
** Could not get unknown property 'ANDROID_SUPPORT_V4_VERSION' **

- Replace

```
com.android.support:support-v4:$ANDROID_SUPPORT_V4_VERSION
```

with

```
com.android.support:support-v4:24.1.1+
```

4. open `platforms/android/CordovaLib/build.gradle`

- insert everything from part 1

5. run the following script

```
./platforms/android/cordova/build
```

6. The APK is located within the directory `platforms/android/build/outputs/apk/debug`


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
