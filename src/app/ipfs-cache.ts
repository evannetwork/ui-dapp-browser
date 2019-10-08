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

import { get, set, IDBStore } from './idb-store';

/**
 * IPFS cache that uses an index db to store ipfs results in.
 *
 * @class      IPFSCache (name)
 */
export class IPFSCache {
  ipfsCacheStore: IDBStore;

  constructor() {
    this.ipfsCacheStore = new IDBStore('ipfs-cache', 'ipfs-hashes');
  }

  /**
   * gets an cached ipfs result
   *
   * @param      {string}        hash    ipfs hash to load the data from
   * @return     {Promise<any>}  ipfs cache result
   */
  async get(hash: string): Promise<any> {
    return get(hash, this.ipfsCacheStore);
  }

  /**
   * adds a ipfs value into the idb store cache
   *
   * @param      {string}  hash    ipfs hash to store the data for
   * @param      {any}     data    data to store for the ipfs hash
   */
  async add(hash: string, data: any) {
    return set(hash, data, this.ipfsCacheStore);
  }
}
