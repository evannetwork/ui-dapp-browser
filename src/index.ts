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

import * as dapp from './app/dapp';
import * as ipfs from './app/ipfs';
import * as loading from './app/loading';
import * as routing from './app/routing';
import * as utils from './app/utils';
import config from './app/config';
import System from './systemjs/index';
import start from './app/start';

import './index.scss';

const DAppBrowser = {
  config,
  dapp,
  getDomainName: utils.getDomainName,
  ipfs,
  loading,
  routing,
  start,
  System,
  utils,
};

const { getDomainName } = utils;

System.amdDefine('@evan.network/ui-dapp-browser', DAppBrowser);

export {
  config,
  dapp,
  getDomainName,
  ipfs,
  loading,
  routing,
  start,
  System,
  utils,
};
