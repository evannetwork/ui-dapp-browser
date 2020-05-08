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

import { log } from './utils';

let lastCache: IPFSCache;

/**
 * IPFS cache that uses an index db to store ipfs results in.
 *
 * @class      IPFSCache (name)
 */
export class IPFSCache {
  db: Promise<any>;

  dbName = 'ipfs-cache';

  storeName = 'ipfs-hashes';

  /**
   * Determines if an error is a quota exceeded error.
   *   => http://crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors
   *
   * @param      {Exception}   ex      error object
   * @return     {boolean}  True if quota exceeded, False otherwise
   */
  static isQuotaExceeded(ex: any): boolean {
    let quotaExceeded = false;

    if (ex) {
      if (ex.code) {
        switch (ex.code) {
          case 22: {
            quotaExceeded = true;
            break;
          }
          case 1014: {
            // Firefox
            if (ex.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
              quotaExceeded = true;
            }

            break;
          }
          default: {
            // do nothing
          }
        }
      }
    }

    return quotaExceeded;
  }

  /**
   * Return the currently opened db or open a new one. If no db was opened, before, open it.
   *
   * @param      {boolean}  forceNew  open a new one
   */
  private async getOpenedDb(forceNew = false): Promise<any> {
    if (!this.db || forceNew) {
      let timeoutResolve: any;

      this.db = new Promise((resolve, reject) => {
        log(`[ipfs-cache] open cache db - ${this.dbName}`);
        const openreq = indexedDB.open(this.dbName, 1);
        openreq.onsuccess = (): void => {
          try {
            openreq.result.createObjectStore(this.storeName);
          } catch (ex) {
            // already exists
          }

          window.clearTimeout(timeoutResolve);
          resolve(openreq.result);
        };
        openreq.onblocked = (): void => reject();
        openreq.onerror = (): void => reject();

        // First time setup: create an empty object store
        openreq.onupgradeneeded = () => {
          log(`[ipfs-cache] create cache db - ${this.dbName}`);
          openreq.result.createObjectStore(this.storeName);
        };

        timeoutResolve = setTimeout(() => resolve(), 1000);
      });
    }

    return this.db;
  }

  /**
   * Close the current db, delete the previous one and create a new one.
   */
  private async recreateDb(): Promise<void> {
    if (!this.db) {
      return;
    }

    log('[ipfs-cache] recreate ipfs db - maybe aborted?');

    // close previous db
    await (await this.getOpenedDb()).close();

    // delete previous db and create new one
    this.db = (async (): Promise<void> => {
      const request = indexedDB.deleteDatabase(this.dbName);
      await new Promise((delResolve, delRej) => {
        request.onerror = (): void => delRej();
        request.onsuccess = (): void => delResolve();
      });

      return this.getOpenedDb(true);
    })();

    await this.db;
  }

  /**
   * adds a ipfs value into the idb store cache
   *
   * @param      {string}  hash    ipfs hash to store the data for
   * @param      {any}     data    data to store for the ipfs hash
   */
  async add(hash: string, data: any): Promise<void> {
    return this.set(hash, data);
  }

  /**
   * Runs an transaction for within the IDB store
   *
   * @param      {IDBTransactionMode}  type      The type
   * @param      {Function}            callback  callback function, that is called
   *                                             when the transaction is finished
   */
  async execute(
    type: IDBTransactionMode,
    actionCallback: (store: IDBObjectStore) => any,
    disableAbort = false,
  ): Promise<any> {
    const db = await this.getOpenedDb();
    const transaction = db.transaction(this.storeName, type);
    let request: any;

    return new Promise((resolve, reject) => {
      const handleError = (errorType: string): void => {
        const isQuota = IPFSCache.isQuotaExceeded(transaction.error);
        reject(new Error(`[ipfs-cache] - ${errorType} - ${transaction.error} - ${isQuota ? '(quota exceeded)' : ''}`));
      };

      transaction.oncomplete = (): void => resolve(request?.result);
      transaction.onerror = (): void => handleError('error');
      transaction.onabort = async (): Promise<void> => {
        if (disableAbort) {
          handleError('abort');
        } else {
          // try to force db recreate when something stucks
          await this.recreateDb();
          resolve(await this.execute(type, actionCallback, true));
        }
      };

      request = actionCallback(transaction.objectStore(this.storeName));
    });
  }

  /**
   * Gets a key from the IDB store.
   *
   * @param      {IDBValidKey}  key     key to load
   * @param      {IDBStore}     store   idb store to load the data from
   * @return     {Type}         returns a key value from idb store
   */
  async get(key: IDBValidKey): Promise<any> {
    return this.execute('readonly', (idbStore) => idbStore.get(key));
  }

  /**
   * sets a key value in a idb store
   *
   * @param      {IDBValidKEy}  key     key to set the value for
   * @param      {any}          value   value to set
   * @param      {store}        store   idb store to set the value in
   */
  async set(key: IDBValidKey, value: any): Promise<void> {
    return this.execute('readwrite', (idbStore) => idbStore.put(value, key));
  }

  /**
   * delete a key from an idb store
   *
   * @param      {IDBValidKey}  key     key to delete
   * @param      {IDBStore}     store   idb store to delete the data from
   */
  del(key: IDBValidKey): Promise<void> {
    return this.execute('readwrite', (idbStore) => idbStore.delete(key));
  }

  /**
   * Clears an idb store
   *
   * @param      {IDBStore}  store   idb store to clear
   */
  clear(): Promise<void> {
    return this.execute('readwrite', (idbStore) => idbStore.clear());
  }
}

/**
 * Returns the latest opened ipfs cache instance.
 *
 * @return     {IPFSCache}  The ipfs cache.
 */
export function getIpfsCache(): IPFSCache {
  if (!lastCache) {
    lastCache = new IPFSCache();
  }

  return lastCache;
}

(window as any).ipfsCache = getIpfsCache();
