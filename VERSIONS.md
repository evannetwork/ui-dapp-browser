# dapp-browser

## Next Version
### Features
### Fixes
### Deprecations

## Version 1.1.0
### Features
- Remove deployment description and move it to the evan.network wiki
- add subdomain dapp loading support

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