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

import * as utils from './utils';

/**
 * control additional logs on first load
 */
export let isFirstLoad = true;

/**
 * Initial loading cache values
 */
const percentageThreshold = 100 / 9;
export let lastPercentage = 0;
let waitForLoadingAnimation = Promise.resolve();

/**
 * Takes the latest progress percentage and raise it with the incoming value.
 *
 * @param      {number}  percentage  percentage to add
 * @param      {any}     returnObj   additional return object for raising
 *                                   loading progress and returning object
 *                                   instantly
 * @return     {string}  additional returnObject
 */
export async function raiseProgress(percentage: number, returnObj?: any) {
  // wait for last animation to be finished
  await waitForLoadingAnimation;

  lastPercentage += percentage;
  if (lastPercentage > 100) {
    lastPercentage = 100;
  }

  // set the percentage only, if it wasn't set before
  const loadingProgress = document.getElementById('loading-progress');
  if (loadingProgress) {
    loadingProgress.style.transform = `scaleX(${lastPercentage / 100})`;
  }

  // wait until animation is finished
  waitForLoadingAnimation = new Promise((resolve) => setTimeout(resolve, 100));

  return returnObj;
}

/**
 * Hides the initial loading that is embedded to the root dapp html page. => It
 * will disappear smooth and will be removed when animation is over
 */
export function finishDAppLoading() {
  const initialLoading = document.getElementById('evan-initial-loading');

  if (initialLoading && initialLoading.className.indexOf('hidden') === -1) {
    raiseProgress(10);
    initialLoading.classList.add('hidden');

    setTimeout(() => {
      // don't remove it, when another function call was started before
      if (initialLoading.parentElement) {
        initialLoading.parentElement.removeChild(initialLoading);
      }
    }, 200);
  }

  if (isFirstLoad) {
    isFirstLoad = false;

    utils.log(`Loading evan.network finished: ${(Date.now() - (window as any).evanloadTime) / 1000}s`);
  }

  utils.log(`Loading dapp finished: ${(Date.now() - (window as any).evanDApploadTime) / 1000}s`);
}
