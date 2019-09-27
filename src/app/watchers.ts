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

import * as core from './core';
import * as utils from './utils';

/**
 * Start watchers for handling special frontend events. (e.g. eve's too low)
 */
export let startWatchers = () => {
  setInterval(() => watchForEveLow(), 10 * 1000);
}

/**
 * Check if the current active accounts balance is low or empty and sends an event.
 *
 * @return     {Promise<void>}  resolved when done
 */
export let watchForEveLow = async () => {
  const activeAccount = core.activeAccount();

  if (activeAccount) {
    const balance = await core.getBalance(activeAccount);

    // send a warning, when the amount of eves gets low
    if (balance <= 0.1) {
      utils.sendEvent('evan-warning', {
        type: 'eve-empty',
        value: balance
      });
    } else if (balance <= 1) {
      utils.sendEvent('evan-warning', {
        type: 'eve-low',
        value: balance
      });
    } else {
      // get disable warnings object
      let disableWarnings = window.localStorage['evan-warnings-disabled'] || '{ }';
      try {
        disableWarnings = JSON.parse(disableWarnings);
      } catch (ex) { }

      // reset low eve amount
      delete disableWarnings['eve-low'];
      delete disableWarnings['eve-empty'];

      window.localStorage['evan-warnings-disabled'] = JSON.stringify(disableWarnings);
    }
  }
};
