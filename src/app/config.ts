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

// use localStorage params to overwrite default values. The default options correspond to those of
// the test net. By deploying other configurations, the comments will be replaced using this values.
const process = {
  env: {
    ENS_ADDRESS: window.localStorage['evan-ens-address'],
    ENS_RESOLVER: window.localStorage['evan-ens-resolver'],
    BC_ROOT: window.localStorage['evan-bc-root'],
    ENS_ROOT: window.localStorage['evan-ens-root'],
    ENS_EVENTS: window.localStorage['evan-ens-events'],
    ENS_PROFILES: window.localStorage['evan-ens-profiles'],
    ENS_MAILBOX: window.localStorage['evan-ens-mailbox'],
    USE_IDENTITY: window.localStorage['evan-use-identity'],
  },
};
const config = {
  accountMap: {
    '0x0000000000000000000000000000000000000000': ''
  },
  web3Provider: window.localStorage['evan-web3-provider'] || 'wss://testcore.evan.network/ws',
  nameResolver: {
    ensAddress: process.env.ENS_ADDRESS || '0x937bbC1d3874961CA38726E9cD07317ba81eD2e1',
    ensResolver: process.env.ENS_RESOLVER || '0xDC18774FA2E472D26aB91deCC4CDd20D9E82047e',
    labels: {
      admin: 'admin',
      businessCenterRoot: process.env.BC_ROOT || 'testbc.evan',
      container: 'container',
      dids: 'dids',
      ensRoot: process.env.ENS_ROOT || 'evan',
      eventhub: 'eventhub',
      factory: 'factory',
      index: 'index',
      mailbox: 'mailbox',
      profile: 'profile',
      wallet: 'wallet',
    },
    domains: {
      adminFactory: ['admin', 'factory', 'ensRoot'],
      businessCenter: ['businessCenterRoot'],
      containerFactory: ['container', 'factory', 'ensRoot'],
      didRegistry: ['dids', 'ensRoot'],
      eventhub: process.env.ENS_EVENTS || ['eventhub', 'ensRoot'],
      factory: ['factory', 'businessCenterRoot'],
      indexFactory: ['index', 'factory', 'ensRoot'],
      mailbox: process.env.ENS_MAILBOX || ['mailbox', 'ensRoot'],
      profile: process.env.ENS_PROFILES || ['profile', 'ensRoot'],
      profileFactory: ['profile', 'factory', 'ensRoot'],
      root: ['ensRoot'],
    },
  },
  smartAgents: {
    onboarding: {
      accountId: '0x063fB42cCe4CA5448D69b4418cb89E663E71A139',
    },
  },
  useIdentity: process.env.USE_IDENTITY || false,
  alwaysAutoGasLimit: 1.1,
  ensRootOwner: '0x4a6723fC5a926FA150bAeAf04bfD673B056Ba83D',
  faucetAccount: '0x4a6723fC5a926FA150bAeAf04bfD673B056Ba83D',
}

export { config }
