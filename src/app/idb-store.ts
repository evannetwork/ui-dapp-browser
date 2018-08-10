/*
  Copyright (C) 2018-present evan GmbH.

  This program is free software: you can redistribute it and/or modify it
  under the terms of the GNU Affero General Public License, version 3,
  as published by the Free Software Foundation.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
  See the GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License along with this program.
  If not, see http://www.gnu.org/licenses/ or write to the

  Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA, 02110-1301 USA,

  or download the license from the following URL: https://evan.network/license/

  You can be released from the requirements of the GNU Affero General Public License
  by purchasing a commercial license.
  Buying such a license is mandatory as soon as you use this software or parts of it
  on other blockchains than evan.network.

  For more information, please contact evan GmbH at this address: https://evan.network/license/
*/

/**
 * IndexDB store wrapper
 *
 * @class      IDBStore (name)
 */
export class IDBStore {
  readonly _dbp: Promise<IDBDatabase>;

  /**
   * @param      {string}  dbName     database name
   * @param      {string}  storeName  store name within the database
   */
  constructor(dbName = 'keyval-store', readonly storeName = 'keyval') {
    this._dbp = new Promise((resolve, reject) => {
      const openreq = indexedDB.open(dbName, 1);
      openreq.onerror = () => {
        reject(openreq.error);
      };
      openreq.onsuccess = () => {
        try {
          openreq.result.createObjectStore(storeName);
        } catch (ex) { }

        resolve(openreq.result);
      };

      openreq.onblocked = function(event) {
        console.log('IndexDB blocked: ')

        resolve();
      };

      // First time setup: create an empty object store
      openreq.onupgradeneeded = () => {
        openreq.result.createObjectStore(storeName);
      };
    });
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
}

/**
 * cache the latest store
 */
let defaultStore: IDBStore;

/**
 * creates a new store or returns the latest one
 *
 * @return     {IDBStore}  idb store
 */
function getDefaultStore(): IDBStore {
  if (!defaultStore) {
    defaultStore = new IDBStore();
  }
  return defaultStore;
}

/**
 * Gets a key from the IDB store.
 *
 * @param      {IDBValidKey}  key     key to load
 * @param      {IDBStore}     store   idb store to load the data from
 * @return     {Type}         returns a key value from idb store
 */
export function get<Type>(key: IDBValidKey, store = getDefaultStore()): Promise<Type> {
  let req: IDBRequest;

  return store
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
export function set(key: IDBValidKey, value: any, store = getDefaultStore()): Promise<void> {
  return store._withIDBStore('readwrite', idbStore => {
    idbStore.put(value, key);
  });
}

/**
 * delete a key from an idb store
 *
 * @param      {IDBValidKey}  key     key to delete
 * @param      {IDBStore}     store   idb store to delete the data from
 */
export function del(key: IDBValidKey, store = getDefaultStore()): Promise<void> {
  return store._withIDBStore('readwrite', idbStore => {
    idbStore.delete(key);
  });
}

/**
 * Clears an idb store
 *
 * @param      {IDBStore}  store   idb store to clear
 */
export function clear(store = getDefaultStore()): Promise<void> {
  return store._withIDBStore('readwrite', idbStore => {
    idbStore.clear();
  });
}

/**
 * Gets the keys from an idb store
 *
 * @param      {IDBStore}                store   The store
 * @return     {Promise<IDBValidKey[]>}  keys of the idb
 */
export function keys(store: any = getDefaultStore()): Promise<IDBValidKey[]> {
  const idbKeys: IDBValidKey[] = [];
  return store._withIDBStore('readonly', idbStore => {
    // This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
    // And openKeyCursor isn't supported by Safari.
    (store.openKeyCursor || store.openCursor).call(store).onsuccess = function() {
      if (!this.result) {
        return;
      }
      idbKeys.push(this.result.key);
      this.result.continue()
    };
  }).then(() => idbKeys);
}
