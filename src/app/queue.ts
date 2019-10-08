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

/**
 * global available queue instance
 */
export let entries: Array<any> = [ ];

/**
 * initialized queue database
 */
export let queueDB: any;

/**
 * save the last account id to check, for which account the queue was loaded
 */
export let lastAccountId: string;

// Promise to handle queueDB loading finish
let queueDBInitializing: Promise<void>;

/**
 * Creates a queueDB if missing and open all connections
 *
 * @param      {string}  accountId  account id to initialize the queueDB for
 */
async function createIndexDB(accountId: string): Promise<any> {
  if (accountId && (!queueDB || accountId !== lastAccountId)) {
    if (!queueDBInitializing) {
      lastAccountId = accountId;

      queueDBInitializing = new Promise((resolve, reject) => {
        const indexDB = window['indexedDB'] ||
          window['mozIndexedDB'] ||
          window['webkitIndexedDB'] ||
          window['msIndexedDB'] ||
          window['shimIndexedDB'];

        const openRequest = indexedDB.open('EvanNetworkQueue', 1);

        openRequest.onerror = () => {
          resolve();
        };
        openRequest.onsuccess = (event) => {
          try {
            (<any>event.target).result
              .createObjectStore('evan-queue', {
                keyPath: 'accountId'
              });
          } catch (ex) { }

          queueDB = openRequest.result;

          resolve();
        };

        openRequest.onblocked = function(event) {
          console.log('IndexDB blocked: ')

          resolve();
        };

        openRequest.onupgradeneeded = function(event) {
          (<any>event.target).result
            .createObjectStore('evan-queue', {
              keyPath: 'accountId'
            });
        };
      })
    }

    await queueDBInitializing;
  }
}

/**
 * gets the queue db storage name for the active account
 *
 * @return     {string}  The storage name.
 */
export function getStorageName(): string {
  return 'evan-queue-' + core.activeAccount();
}

/**
 * Gets the "evan-queue" object store
 *
 * @param      {any}  option  additional options for transaction
 * @return     {any}  The object store.
 */
export function getObjectStore(option?: any) {
  if (queueDB) {
    const transaction = queueDB.transaction(['evan-queue'], option);
    const objectStore = transaction.objectStore('evan-queue');

    return objectStore;
  }
}

/**
 * Loads the queue db for the current user and updates all global queue entries from the index db
 *
 * @return     {Promise<Array<any>>}  global queue entry array
 */
export async function updateQueue(): Promise<Array<any>> {
  const accountId = core.activeAccount();

  if (accountId) {
    await createIndexDB(accountId);

    entries = <any>await new Promise((resolve, reject) => {
      const objectStore = getObjectStore('readonly');
      if (objectStore) {
        const request = objectStore.get(accountId);

        request.onsuccess = function(event) {
          resolve(request.result && request.result.entries ? request.result.entries : [ ]);
        };

        request.onerror = function(event) {
          reject(request.error);
        };
      } else {
        resolve([ ]);
      }
    });

    return entries;
  }
}

/**
 * store for the current user it scurrent global entries to the queue db
 *
 * @param      {Array<any>}  queueEntries  queue entries to save
 * @return     {Promise<any>}      objectStore.put result
 */
export async function storeQueue(queueEntries): Promise<any> {
  const accountId = core.activeAccount();

  if (accountId) {
    await createIndexDB(accountId);

    return await new Promise((resolve, reject) => {
      const objectStore = getObjectStore('readwrite');
      let request;

      if (objectStore) {
        if (queueEntries.length === 0) {
          request = objectStore.delete(accountId);
        } else {
          request = objectStore.put({
            accountId: accountId,
            entries: queueEntries || [ ]
          });
        }

        request.onsuccess = function(event) {
          resolve(request.result);
        };

        request.onerror = function(event) {
          reject(request.error);
        };
      } else {
        resolve();
      }
    });
  }
}
