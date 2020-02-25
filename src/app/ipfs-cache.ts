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

import { sendEvent, devLog } from './utils';

let lastCache;

/**
 * IPFS cache that uses an index db to store ipfs results in.
 *
 * @class      IPFSCache (name)
 */
export class IPFSCache {
  readonly _dbp: Promise<IDBDatabase>;

 /**
   * @param      {string}  dbName     database name
   * @param      {string}  storeName  store name within the database
   */
  constructor(dbName = 'ipfs-cache', readonly storeName = 'ipfs-hashes') {
    this._dbp = new Promise((resolve, reject) => {
      const openreq = indexedDB.open(dbName, 1);
      openreq.onerror = () => {
        // reject(openreq.error);
        resolve();
      };
      openreq.onsuccess = () => {
        try {
          openreq.result.createObjectStore(storeName);
        } catch (ex) { }

        resolve(openreq.result);
      };

      openreq.onblocked = function(event) {
        devLog('IndexDB blocked!');

        resolve();
      };

      // First time setup: create an empty object store
      openreq.onupgradeneeded = () => {
        openreq.result.createObjectStore(storeName);
      };
    });
  }

  /**
   * adds a ipfs value into the idb store cache
   *
   * @param      {string}  hash    ipfs hash to store the data for
   * @param      {any}     data    data to store for the ipfs hash
   */
  async add(hash: string, data: any) {
    return this.set(hash, data);
  }

  /**
   * Runs an transaction for within the IDB store
   *
   * @param      {IDBTransactionMode}  type      The type
   * @param      {Function}            callback  callback function, that is called
   *                                             when the transaction is finished
   */
  _withIDBStore(type: IDBTransactionMode, callback: ((store: IDBObjectStore) => void)): Promise<void> {
    return this._dbp.then(db => new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, type);
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(transaction.error);
      callback(transaction.objectStore(this.storeName));
    }));
  }

  /**
   * Gets a key from the IDB store.
   *
   * @param      {IDBValidKey}  key     key to load
   * @param      {IDBStore}     store   idb store to load the data from
   * @return     {Type}         returns a key value from idb store
   */
  get<Type>(key: IDBValidKey): Promise<Type> {
    let req: IDBRequest;

    return this
      ._withIDBStore('readonly', idbStore => {
        req = idbStore.get(key);
      })
      .then(() => req.result)
      // edge is throwing an exception, when the value is not set
      .catch((ex) => {
        return undefined;
      });
  }

  /**
   * sets a key value in a idb store
   *
   * @param      {IDBValidKEy}  key     key to set the value for
   * @param      {any}          value   value to set
   * @param      {store}        store   idb store to set the value in
   */
  async set(key: IDBValidKey, value: any): Promise<void> {
    try {
      const result = await this._withIDBStore('readwrite', idbStore => {
        idbStore.put(value, key);
      });
      return result;
    } catch (ex) {
      if (this.isQuotaExceeded(ex)) {
        sendEvent('evan-warning', {
          type: 'quota-exceeded'
        });
      } else {
        sendEvent('evan-warning', {
          type: 'indexdb-not-available'
        });
      }
    }
  }

  /**
   * delete a key from an idb store
   *
   * @param      {IDBValidKey}  key     key to delete
   * @param      {IDBStore}     store   idb store to delete the data from
   */
  del(key: IDBValidKey): Promise<void> {
    return this._withIDBStore('readwrite', idbStore => {
      idbStore.delete(key);
    });
  }

  /**
   * Clears an idb store
   *
   * @param      {IDBStore}  store   idb store to clear
   */
  clear(): Promise<void> {
    return this._withIDBStore('readwrite', idbStore => {
      idbStore.clear();
    });
  }

  /**
   * Determines if an error is a quota exceeded error.
   *   => http://crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors
   *
   * @param      {Exception}   ex      error object
   * @return     {boolean}  True if quota exceeded, False otherwise
   */
  isQuotaExceeded(ex: any) {
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
        }
      } else if (ex.number === -2147024882) {
        // Internet Explorer 8
        quotaExceeded = true;
      }
    }

    return quotaExceeded;
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
