# dapp-browser

## Next Version
### Features

### Fixes

### Deprecations


## Version 3.0.2
### Fixes
- recreate `ipfs-cache` indexeddb on `aborted` event
- add `EVAN_CHAIN` to config `process.env`
- fix devMode check in iframe


## Version 3.0.1
### Fixes
- remove `dist/dapps` from npmjs


## Version 3.0.0
### Features
- full refactoring
- full typescript usage
- load local deps also from index.html (dev.html is obsolete)
- use better ipfs / ens resolving / caching

### Deprecations
- remove ionic and cordova
- move dapps-watching to dist/dapps.js
- main entrypoint changed dist location to dist/dapp-browser.js
- no js client shim included
- remove old functions and move them to `https://github.com/evannetwork/ui-dapps/tree/develop/evan-libs/old-dapp-browser/src`
  - all blockchain-core ui dependencies (bccHelper, AccountStore, KeyProvider)
  - lightwallet
  - notifications
  - web3
  - queue

## Version 2.8.0
### Features
- start routing directly on dapp-browser load, so cached ens addresses can be directly resolved from ipfs, without waiting for bcc
- enable `cached-dapp` dbcp type to get better initial loading speed

### Fixes
- add `hidden` class to `initial-loading` only when it was not added before
- fix weird browser refresh in onboarding

### Deprecations


## Version 2.7.0
### Features
- set `dashboard.vue.evan` and `onboarding.vue.evan` as default entrypoints

### Fixes
- fix large font-sizes on mobile ios safari in `horizontal` orientation


## Version 2.6.1
### Fixes
- fix account id switching on multiple opened tabs
- update gulp build scripts to be compatible node 12
- fix `build` script


## Version 2.6.0
### Features
- allow to load the dapp-browser without starting url watcher
- fix iframe include and add evan parameter to iframe window

### Fixes
- remove unnecessary dependencies and use correct tslint configuration


## Version 2.5.1
### Fixes
- fix `Stream` errors in `Chrome` v77
- remove custom agpl appendix


## Version 2.5.0
### Features
- add `deploy-repl` command so the usual deployment configuration can be used, to start a repl with deployment configuration
- use new favicon

### Fixes
- use new `getSmartAgentAuthHeaders` to build `EvanAuth` header for smart-agent requests


## Version 2.4.0
### Features
- add deployment replace for `stripe api key`
- add `browserName`, `isPrivateMode`, `getBrowserName`, `getIsPrivateMode`
- add `serveo.net` and `.ngrok.io` host for enabled dev mode loading

### Fixes
- fix error handling in `indexedDb` to fix private firefox
- add `BigNumber` to minify `mangles`, so BigNumber internal checks will work correctly


## Version 2.3.0
### Features
- update versions of `ts-node`, `typescript`, `web3`
- remove ionic libraries and update `cordova-plugin-ionic-webview`

### Fixes
- clearer build files and clearer android deployment
- add `setAccountAndPrivateKey` to `bccHelper` `createDefaultRuntime` to correctly track ipfs payment


## Version 2.2.3
### Fixes
- update for `web3` version `1.0.0-beta.55` support
- rename testnet to testcore
- fix deployment sub ens address set


## Version 2.2.2
### Fixes
- allow old ens names to be replaced with minus characters (angular-core, angular-libs, smart-contracts)


## Version 2.2.1
### Fixes
- allow minus symbols for ens names


## Version 2.2.0
### Fixes
- load dev domain from localStorage `evan-dev-dapps-domain` or from `queryParams.dev-domain`


## Version 2.1.3
### Fixes
- fix dapp deployment ipfsConfig replacement


## Version 2.1.2
### Fixes
- move missing dependencies from devDeps to deps


## Version 2.1.1
### Fixes
- add default protocol to `web3` websocket connection
- fix css only dapp-content loading


## Version 2.1.0
### Features
- add `faucetAccount` to configuration
- add disable deployment console parameter for testing deployment replacing jobs
- add correct keyprovider init function
- adjust systemjs configuration to do not map dependency alias, they will be set by the projects itself
- add css only dapp loading support
- add testnet banner
- add new initial loading screen

### Fixes
- insert missing replacements for different environment deployments: ipfs domains and ensRootOwner
- ensure font-size scaling to 100%
- fix package.json dependencies for deployment


## Version 2.0.0
### Features
- add `dapp.getDAppBaseUrl` function to, Takes an dbcp object and calculates the base path, where all the files are deployed, for this DApp using the dbcp origin. When dev mode is enabled, the localhost path will be returned.
- `startDApp` function gets 4. parameter the dappBaseUrl, where the result of getDAppBaseUrl for the loaded dbcp.json is passed to (https://ipfs.test.evan.network/ipfs/.../, http://localhost:3000/external/...)
- add support using multiple chain configurations (ipns and configuration values will be replaced)
- add deployment web3 reconnect
- add `System.map('@evan.network/ui-dapp-browser')` so the dapp-browser import can be correctly
- delay loading of cached dbcp files for 3 seconds to speedup initial heavy load

### Fixes
- fix loading of DBCP libraries with different versions (for detailed description have a look at https://github.com/evannetwork/issue-tracking/issues/443)
- deployment: only publish new hashes to ipns, if the root evan domain is used
- move get `getDomainName` function to utils
- `startDApp` removes previously contained content from the dapp container, after the dapp was started
- throw an error, when the ui is started using an agent executor and the private key should be exported
- reduce amount of calls of `vault.generateNewAddresses()`

### Deprecations
- move `zone.js` to `@evan.network/ui-angular-libs` (it's only needed by angular)

## Version 1.7.0
### Features
- add salting for encryptionKeys accountId + password

### Fixes
- NodeJS 10 compatibility

## Version 1.6.3
### Features
- use correct remote ipfs deployment node

## Version 1.6.2
### Features
- fix npmignore

## Version 1.6.1
### Features
- enhance `routing.getQueryParameters` to be able to overwrite the url

## Version 1.6.0
### Features
- add ipfs identification header to enable future ipfs payments
- use web3 1.0.0-beta.37

### Fixes
- disable angular-libs preload, so it won't load duplicated files

## Version 1.5.2
### Fixes
- fix deployment: initialize dfs creation using accountStore of deployment account

## Version 1.5.1
### Fixes
- remove `classList` usage for `activateTheme` function to fix older versions of edge browsers

## Version 1.5.0
### Features
- remove UrlSearchParams and include own created function (was not supported in edge)
- support light theme
- getColorTheme, activateColorTheme
- add opened dapp ens parameter to startDApp function
- add low eve watchers
- add warning for quota limit exceeded and for index db not available

## Version 1.4.0
### Features
- add support for overwriting dapp.origin.entrypoint using file system paths to require different files from dbcp (e.g. `System.import('mydapp/myfile2!dapp-content')`)
- add support for loading properties from loaded dbcp contents (e.g. `System.import('mydapp/myfile2#myProperty!dapp-content')`)
- add `bccHelper` export to main.ts that includes basic functionalities to create profile runtimes and password checking: `getCoreOptions`, `getProfileForAccount`, `getSigner`, `setExchangeKeys`, `startBCC`, `updateCoreRuntime`
- add `vault` parameter to `AccountStore` to be able to use it not only for the primary logged in account
- add `accountStore` parameter to `bccHelper.getSigner` to overwrite the default one
- add `createDefaultRuntime` function to `bccHelper` that wraps the `api-blockchain-core` createDefaultRuntime function
- add url parameters so global `mnemonic`, `accountId`, `password`, `provider` can be overwritten

### Fixes
- fix false prefilled ensAddress on dapp loading
- add fallback within deployment for hash <=> Hash after `addMultiple`

## Version 1.3.1
### Fixes
- fix angular-libs preloading initialization deadlock when loading it from ipfs
- remove owner restore for ens deployment (already done by `@evan.network/api-blockchain-core`)

## Version 1.3.0
### Features
- deployment scripts
  - move deploy DApps to radio button selects, to be able to deploy multiple selected DApps
  - ask the user for starting the whole deployment under another sub domain (e.g. evan => test.evan)
- add ens side loading of `localStorage['evan-dev-dapps-domain']`
- add ens cache (update each second load)
- preload angular-libs instant to speed up initial load performance

### Fixes
- only use `evan-dev-dapps-domain` when `evan-developer-mode` is true
- fix notification.`getDAppUrlFromNotification` to remove duplicated slashes
- fix deployment gulpfile resolve

## Version 1.2.0
### Features
- restore ens owner after setDescriptionToEns deployment
- add agent-executor provider support (core.js => getAgentExecutor)

### Fixes
- add babel to transform not supported functionalities of older browsers

### Deprecations

## Version 1.1.0
### Features
- Remove deployment description and move it to the evan.network wiki
- add subdomain dapp loading support
- add subdomain support

## Version 1.0.2
### Features
- add dapp.history for correct go back logic
- rename ui-dapp-browser
- add firebase notifications

### Fixes
### Deprecations

## Version 1.0.1
### Features
- load not dapps in devMode, that are not exists within the runtime/external folder, from ens
- use @evan.network for package name and dependencies scopes
- add .npmignore
- rename dapp to dapp-browser
- split gulp jobs to serve without building to reduce prod dependencies
- load deployment accounts from configuration file
- rename *contractus* variables to *evan*
- rename bcc-core bundle to bcc
  - rename BCCCore to CoreRuntime
  - rename BCCProfile to ProfileRuntime
  - rename BCCBC to BCRuntime
- add code documentation

## Version 0.9.0
- initial version