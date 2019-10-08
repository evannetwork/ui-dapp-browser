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

/**
 * Smart contracts solc representation.
 */
export class Solc {
  SmartContracts: any;

  /**
   * Constructor of the Solc. Takes unformatted SmartContracts.
   *
   * @param SmartContracts Smart contracts export of the smart contracts project.
   */
  constructor(SmartContracts: any) {
    this.SmartContracts = SmartContracts;
  }

  /**
   * Takes the unformatted contracts from the constructor and format the object contract keys
   * AbstractENS.sol => AbstractENS
   *
   * @return Formatted Smart Contracts objects with shorted key names.
   */
  getContracts() {
    const shortenedContracts = {};

    Object.keys(this.SmartContracts).forEach((key) => {
      const contractKey = (key.indexOf(':') !== -1) ? key.split(':')[1] : key
      shortenedContracts[contractKey] = this.SmartContracts[key]
    })

    return shortenedContracts;
  }
}
