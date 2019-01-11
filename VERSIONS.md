# dapp-browser

## Next Version
### Features
### Fixes
- NodeJS 10 compatibility
### Deprecations

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