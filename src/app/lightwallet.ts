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

  You can be released from the requirements of the GNU Affero General Public
  License by purchasing a commercial license.
  Buying such a license is mandatory as soon as you use this software or parts
  of it on other blockchains than evan.network.

  For more information, please contact evan GmbH at this address:
  https://evan.network/license/
*/

/**
 * Before you start using the several functions of the mighty lightwallet
 * functions, be sure that you have set an global password functions that
 * handles the user interactions and returns a valid password for the mnemonic
 * and the underlying profile.
 */

/**
 * is inserted when the application was bundled, used to prevent window usage
 */
declare let evanGlobals: any;

/********************* !IMPORTANT: dont export it to avoid security leaks! ************************/
/**
 * cache existing vault locally
 */
let _vault;

/**
 * custom encryption keys, to overwrite the default one (password salted using accountId)
 */
let _customEncryptionKeys = { };
/**************************************************************************************************/

/**
 * cached password function, can set during the application runtime to implement
 * own password retrieve functions
 */
let passwordFunction;

/**
 * returns CoreBundle.keystore (eth-lightwallet/lib/keystore)
 *
 * @return     {any}  CoreBundle.keystore
 */
function getKeyStore() {
  return evanGlobals.CoreBundle.keystore;
}

/**
 * returns CoreBundle.Mnemonic
 *
 * @return     {any}  CoreBundle.Mnemonic.
 */
function getMnemonicLib() {
  return evanGlobals.CoreBundle.Mnemonic;
}

/**
 * Generates a new random seed.
 *
 * @return     {string}  12 word mnemomnic
 */
function generateMnemonic() {
  return getKeyStore().generateRandomSeed();
}

/**
 * Creates a new vault instance to handle lightwallet interactions.
 *
 * @param      {string}  mnemonic  mnemonic to create new vault.
 * @param      {string}  password  password to encrypt the vault.
 * @return     {vault}   vault created using mnemonic, encrypted via password
 */
function createVault(mnemonic: string, password: string): Promise<any> {
  return new Promise((resolve, reject) => {
    getKeyStore().createVault({
      seedPhrase: mnemonic,
      password: password,
      hdPathString : 'm/45\'/62\'/13\'/7'
    }, function (err, vault) {
      if (err) {
        reject(err);
      } else {
        resolve(vault);
      }
    });
  });
}

/**
 * Serializes a specific vault and saves it to the local storage.
 *
 * @param      {any}     vault   vault to save locally
 */
function setVaultActive(vault: any) {
  window.localStorage['evan-vault'] = vault.serialize();

  _vault = vault;
}

/**
 * Create new vault, set it active and set first account id
 *
 * @param      {string}  mnemonic  mnemonic to use
 * @param      {string}  password  password to encrypt mnemonic
 */
async function createVaultAndSetActive(mnemonic: string, password: string): Promise<void> {
  const vault = await getNewVault(mnemonic, password);

  const accounts = getAccounts(vault, 1);

  setVaultActive(vault);
  window.localStorage['evan-account'] = accounts[0];
}

/**
 * Gets the pwDerivedKey to interact with the vault.
 *
 * @param      {any}           vault         vault to unlock
 * @param      {string}        password      password of the locked vault
 * @return     {Promise<any>}  pwDerivedKey
 */
function keyFromPassword(vault: any, password: string): Promise<any> {
  return new Promise((resolve, reject) => {
    vault.keyFromPassword(password, function (err, pwDerivedKey) {
      if (err) {
        reject();
      } else {
        resolve(pwDerivedKey);
      }
    })
  });
}

/**
 * Creates an new vault and unlocks it
 *
 * @param      {string}  mnemonic  mnemonic to use for the vault
 * @param      {string}  password  password to encrypt the vault
 * @return     {any}  The new vault.
 */
async function getNewVault(mnemonic: string, password: string): Promise<any> {
  const vault = await createVault(mnemonic, password);
  const pwDerivedKey = await keyFromPassword(vault, password);

  vault.pwDerivedKey = pwDerivedKey;
  vault.encryptionKey = getEncryptionKeyFromPassword(getPrimaryAccount(vault), password);

  // if the accountId was specified externally, we should load the first account to be able to run
  // calls for this account
  getAccounts(vault, 1);

  return vault;
}

/**
 * Get an specific amount of accounts from the vault.
 *
 * @param      {any}            vault   vault to get accounts from
 * @param      {number}         amount  number of accounts to return
 * @return     {Array<string>}  The accounts.
 */
function getAccounts(vault: any, amount?: number): Array<string> {
  let accounts = vault.getAddresses();

  // only generate so much accounts, that are realy needed, do not generate new ones, if the amount
  // of addresses are already loaded
  if (amount && (!accounts || accounts.length < amount)) {
    if (!vault.pwDerivedKey) {
      throw new Error('could not generate new addresses on locked vault!');
    }

    // generate new ones and reload
    vault.generateNewAddress(vault.pwDerivedKey, amount - accounts.length);
    accounts = vault.getAddresses();
  }

  return accounts.map(account => evanGlobals.CoreRuntime.web3.utils.toChecksumAddress(account));
}

/**
 * Get the first account from the vault.
 *
 * @param      {any}  vault   vault to get accounts from
 * @return     {string}  The account.
 */
function getPrimaryAccount(vault: any) {
  return getAccounts(vault, 1)[0];
}

/**
 * Gets the private key for an account.Given the derived key, decrypts and returns the private key
 * corresponding to address. This should be done sparingly as the recommended practice is for the
 * keystore to sign transactions using signing.signTx, so there is normally no need to export
 * private keys.
 *
 * @param      {any}     vault      vault where the account lives
 * @param      {string}  accountId  account to get the private key from
 * @return     {<type>}  The private key.
 */
function getPrivateKey(vault: any, accountId: string) {
  return vault.exportPrivateKey(accountId.toLowerCase(), vault.pwDerivedKey);
}

/**
 * Load locked vault from localStorage or unlocked memory vault.
 *
 * @return     {any}  deserialized, cached vault
 */
function loadVault(): any {
  if (!_vault && window.localStorage['evan-vault']) {
    try {
      _vault = getKeyStore().deserialize(window.localStorage['evan-vault']);
    } catch (ex) { };
  }

  return _vault;
}

/**
 * Sets the password function. The dapp-browser does not includes any library / framework / css that
 * handles a good and nice ui development (e.g. angular, react, bootstrap, ...). To handle coporate
 * design and a better DApp development freedom, each DApp must specify its own password dialog. In
 * case of Angular 5 development have a look at the default one, provided by the angular-core:
 * globalPasswordDialog
 * https://github.com/evannetwork/ui-angular-core/blob/4f539a2f5492b137d6be82c133427871073c3929/src/services/evan/bcc.ts#L300
 *
 * @param      {Function}  newPasswordFunction  The new password function
 */
function setPasswordFunction(newPasswordFunction: Function) {
  passwordFunction = newPasswordFunction;
}

/**
 * Shows the global-password modal.
 *
 * @param      {string}           accountId  additional account id to get the
 *                                           password from
 * @return     {Promise<string>}  password input
 */
async function getPassword(accountId?: string): Promise<string> {
  // if a password was specified over the url, use this one
  if (evanGlobals.queryParams.password) {
    return evanGlobals.queryParams.password;
  } else if (passwordFunction) {
    return await passwordFunction(accountId);
  } else {
    console.error('No password function for lightwallet service set...');
    throw new Error('No password function for lightwallet service set...');
  }
}

/**
 * Return current unlocked vault. Asks for password when vault is locked.
 *
 * @return     {Promise<any>}  unlocked vault
 */
async function loadUnlockedVault(): Promise<any> {
  let vault;
  let primaryAccount;

  // if a mnemonic and a password were specified over the url, load the vault with this values
  if (evanGlobals.queryParams.mnemonic && evanGlobals.queryParams.password) {
    vault = await getNewVault(evanGlobals.queryParams.mnemonic, evanGlobals.queryParams.password);
  } else {
    vault = loadVault();
  }

  if (vault && !vault.pwDerivedKey) {
    const password = await getPassword();
    vault.pwDerivedKey = await keyFromPassword(vault, password);

    // only load the encryption key, when it wasn't set before (could be overwritten by using
    // overwriteVaultEncryptionKey for old or custom logic accounts)
    primaryAccount = getPrimaryAccount(vault);
    if (!_customEncryptionKeys[primaryAccount]) {
      vault.encryptionKey = getEncryptionKeyFromPassword(getPrimaryAccount(vault), password);
    }
  }

  // if the accountId was specified externally, we should load the first account to be able to run
  // calls for this account
  primaryAccount = primaryAccount || getPrimaryAccount(vault);
  if (_customEncryptionKeys[primaryAccount]) {
    vault.encryptionKey = _customEncryptionKeys[primaryAccount];
  }

  return vault;
}

/**
 * Returns the encryption key for the current password.
 *
 * @return     {string}  encryption key
 */
async function getEncryptionKey(): Promise<string> {
  // if an executor agent should be used, return the key instantly
  if (evanGlobals.agentExecutor) {
    return evanGlobals.agentExecutor.key;
  // if the url was opened using an specific mnemonic and password, use this one!
  } else {
    const currentProvider = evanGlobals.core.getCurrentProvider();

    if (currentProvider === 'internal') {
      const vault = await loadUnlockedVault();

      if (vault) {
        return vault.encryptionKey;
      }
    } else {
      const password = await getPassword();

      return getEncryptionKeyFromPassword(
        evanGlobals.CoreRuntime.web3.eth.defaultAccount,
        password
      );
    }
  }
}

/**
 * Hashes a password using sha3.
 *
 * @param      {string}  password  password that should be hashed
 * @return     {string}  The encryption key from password.
 */
function getEncryptionKeyFromPassword(accountId: string, password: string): string {
  return evanGlobals.CoreBundle.CoreRuntime.nameResolver
    .sha3(accountId + password)
    .replace(/0x/g, '');
}

/**
 * Overwrites the encryption key for the current vault.
 *
 * @param      {string}  encryptionKey  the encryption key that should be used
 */
async function overwriteVaultEncryptionKey(accountId: string, encryptionKey: string) {
  _customEncryptionKeys[accountId] = encryptionKey
}

/**
 * Remove current active vault from browser.
 */
function deleteActiveVault() {
  _vault = '';

  delete window.localStorage['evan-vault'];
}

/**
 * Returns if an mnemonic is a valid mnemonic. (wrapper for getKeyStore().isSeedValid)
 *
 * @param      {string}   mnemonic  The mnemonic
 * @return     {boolean}  True if valid mnemonic, False otherwise.
 */
function isValidMnemonic(mnemonic: string) {
  try {
    return getKeyStore().isSeedValid(mnemonic);
  } catch (ex) {
    return false;
  }
}

/**
 * Returns if an word is a valid mnemonic word.
 *
 * @param      {string}   word    word to check
 * @return     {boolean}  True if valid mnemonic word, False otherwise.
 */
function isValidMnemonicWord(word: string) {
  return getMnemonicLib().Words.ENGLISH.indexOf(word) !== -1;
}

export {
  createVault,
  createVaultAndSetActive,
  deleteActiveVault,
  generateMnemonic,
  getAccounts,
  getEncryptionKey,
  getEncryptionKeyFromPassword,
  getMnemonicLib,
  getNewVault,
  getPassword,
  getPrimaryAccount,
  getPrivateKey,
  isValidMnemonic,
  isValidMnemonicWord,
  keyFromPassword,
  loadUnlockedVault,
  loadVault,
  overwriteVaultEncryptionKey,
  setPasswordFunction,
  setVaultActive,
}
