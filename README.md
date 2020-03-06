# dapp-browser
The dapp-browser is the wrapper application for the evan.network DApp framework. Using the project you will be able to create featured DApps.

By using the evan.network framework to create featured DApps, the initialization of DBCP or the blockchain core is altered and existing, initialized and configured instances can be loaded. This has the advantage that accounts, encryptions and similar complex configurations are executed dynamically by the user when the application is started.

To do this, however, all DApps must be started via the evan.network dapp-browser application, since this provides the complete function stack and the various UIs. As long as the provided functions are used, the application can only be started in environments that have the corresponding structures. Alternatively, the blockchain-core can be initialized, configured and used, as in the standalone example.

## API Documentation and Tutorials
- [DApp Tutorials](https://evannetwork.github.io/dapps/basics)
- [API Reference UI](https://ipfs.test.evan.network/ipns/QmReXE5YkiXviaHNG1ASfY6fFhEoiDKuSkgY4hxgZD9Gm8/dapp-browser/index.html)

## Functionallity
The src folder includes a dev.html and a index.html file. By opening the dev.html file, the code will bypass several code loading checks, to try to load dapps from the local file server. The compiled files from the "src/app" folder will be placed within the runtime folder. Chosen files will be copied to the www folder for deployment and native app building. During the dev mode the application will try to load dapps not from ens and ipfs, but from the local file server (runtime/external). This folder will be filled using the lerna DApp projects (e.g. [ui-dapps](https://github.com/evannetwork/ui-dapps)). During production mode, each DApp or contract will be loaded using its ens or contract address and dbcp description. How to develop DApps, that can be loaded via the dapp-browser, have a look here [DApp Basics](https://evannetwork.github.io/dapps/basics).

The DApp browser provides several functionallities to access
- DApp routing
- global utillity functions like log
- DApp time tracing options
- IPFS cache
- ipfs handlers
- load and start sub DApps
- loading mechanisms
- SystemJS plugins for ENS loading, ENS and file loading, IPFS loading, JSON loading, CSS loading

## Installation
```sh
npm i @evan.network/ui-dapp-browser
```

## Building
- build the runtime folder
```sh
yarn build
```
- start a deployment
  - all folders within the runtime/external folder can be deployed
  - they should include a valid dbcp.json file and a dbcpPath.json file, that includes the origin
  -the content of this folder will be dynamcally created by the development build jobs of [angular-gulp](https://github.com/evannetwork/angular-gulp)

```sh
yarn deploy --config pathToConfig
```

- starts a local file serve within the runtime folder (http://localhost:3000/dev.html)
```sh
yarn serve
```

- runs the build command, watch for file changes and starts a local file serve with the runtime folder
```sh
yarn build
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
        "../node_modules/@evan.network/ui-dapp-browser/dist/dapp-browser.js"
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
yarn deploy-repl --config ...
```

Available params:
  - `advancedDeployment`
  - `configPath`
  - `dappDeploymentFolder`
  - `dappFolder`
  - `licensesFolder`
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
