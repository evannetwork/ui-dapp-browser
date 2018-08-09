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

import * as utils from './utils';

// wrap firebase to access it easily
let firebase;

// only run one onNotificationToggled function
let awaitNotificationToggled = Promise.resolve();

/**
 * Register the token for the current devices.
 *
 * @param      {string}         token   token of the current devices
 * @return     {Promise<void>}  Resolved when done
 */
const registerDevice = async (token: any) => {
  utils.log(`New notification token: ${ token }`, 'info');
}

/**
 * Load the token from firebase and register the user in the smart-agent.
 *
 * @return     {Promise<void>}  Resolved when done
 */
const getToken = async () => {
  await new Promise((resolve, reject) => {
    firebase.getToken((token) => resolve(token), (error) => reject(error));
  });
};

const onTokenRefresh = async () => {
  firebase.onTokenRefresh((token) => {
    // save this server-side and use it to push notifications to this device
    registerDevice(token);
  }, (error) => {
    utils.log('Error while refreshing notification token!', 'error');
  });
};

/**
 * Grant permissions for the current device (only IOS).
 *
 * @return     {Promise<void>}  Resolved when done
 */
const grantPermission = () => {
  return new Promise((resolve, reject) => {
    firebase.grantPermission((data) => {
      resolve(data.isEnabled);
    }, (error) => {
      utils.log('Error while granting permissions!', 'error');

      reject(error);
    });
  });
};

/**
 * Subscribe the current user for evan.network notifications.
 *
 * @param      {string}         eventName  event name to subscribe for
 * @return     {Promise<void>}  Resolved when done
 */
const subscribe = (eventName: string) => {
  return new Promise((resolve, reject) => {
    firebase.subscribe(eventName, (data) => {
      resolve();
    }, (error) => {
      utils.log('Error during subscribe!', 'error');

      reject(error);
    });
  });
};

/**
 * Unsubscribe the current user for evan.network notifications.
 *
 * @param      {string}         eventName  event name to unsubscribe for
 * @return     {Promise<void>}  Resolved when done
 */
const unsubscribe = (eventName: string) => {
  return new Promise((resolve, reject) => {
    firebase.unsubscribe(eventName, (data) => {
      resolve();
    }, (error) => {
      utils.log('Error during subscribe!', 'error');

      reject(error);
    });
  });
};

/**
 * Check if the user has enabled push notifications.
 * @return     {Promise<boolean>}  True if has permissions, False otherwise.
 */
const hasPermissions = () => {
  return new Promise((resolve, reject) => {
    firebase.hasPermission((data) => {
      resolve(data.isEnabled);
    });
  });
};

/**
 * Grant permissions for the current device (only IOS).
 *
 * @return     {Promise<void>}  Resolved when done
 */
const unregister = () => {
  return new Promise((resolve, reject) => {
    firebase.unregister((data) => {
      resolve();
    }, (error) => {
      utils.log('Error while unregistering!', 'error');

      reject(error);
    });
  });
};


/**
 * Register and unregister device if notifications was enabled.
 */
const onNotificationsToggled = () => {
  // wait for last toggle to be finished
  return awaitNotificationToggled = awaitNotificationToggled
    .then(async () => {
      try {
        if (window.localStorage['evan-notifications'] === 'true') {
          // check for permissions
          // on android we dont need to check for permissions
          let isPermitted: any = true;
          if (window['cordova'] && window['cordova'].platformId === 'ios') {
            isPermitted = await hasPermissions();

            // if ios is not permitted, grantPermissions
            if (!isPermitted) {
              await grantPermission();
              isPermitted = await hasPermissions();
            }
          }

          if (isPermitted) {
            // get the token and register us for notifications
            if (!window.localStorage['evan-notification-token']) {
              const token = await getToken();

              await registerDevice(token);

              window.localStorage['evan-notification-token'] = token;
            }

            // subscribe for token changes
            onTokenRefresh();

            // if we arent subscribed before, subscribe!
            if (!window.localStorage['evan-notification-subscribed']) {
              // subscribe for even notifications
              await subscribe('evan-notification');

              // set we are subscribed
              window.localStorage['evan-notification-subscribed'] = true;

              // watch for opening notifications
              firebase.onNotificationOpen(function(notification) {
                // send the event to all dapps
                utils.sendEvent('evan-notification', notification);

                // log the notification
                try {
                  console.log(`New push notification: ${ JSON.stringify(notification) }`);
                  utils.log(`New push notification: ${ JSON.stringify(notification) }`, 'info');
                } catch (ex) { }
              }, function(ex) {
                utils.log(`Error while onNotificationOpen: ${ ex.message } : ${ ex.stack }`, 'error');
              });
            }


            // return and dont unregister
            return;
          } else {
            utils.log('User disabled push notifications!', 'warning');
          }
        }
      } catch (ex) {
        utils.log(`${ ex.message } : ${ ex.stack }`, 'error');
      }

      // reset everything if notifications are disabled or we have not permissiosn
      delete window.localStorage['evan-notification-token'];
      delete window.localStorage['evan-notification-subscribed'];
      await unsubscribe('evan-notification');
      await unregister();
    })
    .catch((ex) => {
      utils.log(`${ ex.message } : ${ ex.stack }`, 'error');
    });
};

/**
 * Initialize the plugin.
 */
export const initialize = async () => {
  // set the firebase for quick access
  firebase = window['FirebasePlugin'];

  // if firebase is available start everything!
  if (firebase) {
    await onNotificationsToggled();

    window.addEventListener('evan-notifications-toggled', onNotificationsToggled, false);
  }
}
