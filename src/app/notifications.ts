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

import * as utils from './utils';
import * as routing from './routing';

// hold the last received notifications, so applications can check against them, also
// when they didn't received the event
export let notifications = [ ];

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
  return new Promise((resolve, reject) => {
    firebase.getToken((token) => resolve(token), (error) => reject(error));
  });
};

const onTokenRefresh = async () => {
  firebase.onTokenRefresh((token) => {
    window.localStorage['evan-notification-token'] = token;

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
      resolve(data && data.isEnabled);
    }, (error) => {
      reject(new Error('Error while granting permissions: ' + error));
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
      reject(new Error('Error during subscribe: ' + error));
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
      reject(new Error('Error during unsubscribe: ' + error));
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
      reject(new Error('Error during unregistering: ' + error));
    });
  });
};


/**
 * Register and unregister device if notifications was enabled.
 */
const onNotificationsToggled = () => {
  // wait for last toggle to be finished
  return awaitNotificationToggled = <any>awaitNotificationToggled
    .then(async () => {
      try {
        if (window.localStorage['evan-notifications'] === 'true') {
          // check for permissions
          // on android we dont need to check for permissions
          let isPermitted: any = true;
          if (window['cordova'] && window['cordova'].platformId === 'ios') {
            isPermitted = await hasPermissions();

            // if ios is not permitted, grantPermissions
            await grantPermission();

            if (!isPermitted) {
              isPermitted = await hasPermissions();
            }
          }

          if (isPermitted) {
            // get the token and register us for notifications
            const token = await getToken();

            await registerDevice(token);

            window.localStorage['evan-notification-token'] = token;

            // subscribe for token changes
            onTokenRefresh();

            // if we arent subscribed before, subscribe!
            if (!window.localStorage['evan-notification-subscribed']) {
              // subscribe for even notifications
              await subscribe('evan-notification');

              // set we are subscribed
              window.localStorage['evan-notification-subscribed'] = true;
            }

            // return a new Promise to handle initial notifications
            // the function will be called immediatly, if the app was opened with a new notification
            // if this is the case, run the resolve using the called notification
            return new Promise((resolve, reject) => {
              // use an timeout of 100ms to ensure, that the resolve is called, even when no
              // notification is clicked
              const initialOnNotification: any = setTimeout(resolve, 100);

              // watch for opening notifications
              firebase.onNotificationOpen(function(notification) {
                // hold the last received notification, so applications can check against them, also
                // when they didn't received the event
                notifications.push(notification);

                // send the event to all dapps
                utils.sendEvent('evan-notification', notification);

                // log the notification
                try {
                  console.log(`New push notification: ${ JSON.stringify(notification) }`);
                  utils.log(`New push notification: ${ JSON.stringify(notification) }`, 'info');
                } catch (ex) { }

                // clear the timeout, to don't run resolve twice
                window.clearTimeout(initialOnNotification);

                // resolve using the new notification
                resolve(notification);
              }, function(ex) {
                utils.log(`Error while onNotificationOpen: ${ ex && ex.message ? ex.message + ' ' + ex.stack : ex }`, 'error');
              });
            });
          } else {
            utils.log('User disabled push notifications!', 'warning');
          }
        }
      } catch (ex) {
        utils.log(`${ ex && ex.message ? ex.message + ' ' + ex.stack : ex }`, 'error');
      }

      // reset everything if notifications are disabled or we have not permissiosn
      delete window.localStorage['evan-notification-token'];
      delete window.localStorage['evan-notification-subscribed'];
      await unsubscribe('evan-notification');
      await unregister();
    })
    .catch((ex) => {
      utils.log(`${ ex && ex.message ? ex.message + ' ' + ex.stack : ex }`, 'error');
    });
};


/**
 * Return the url of an notification that should be opened.
 *
 * @param      {any}     notification  firebase notification object
 * @return     {string}  dapp path to open
 */
export const getDAppUrlFromNotification = async (notification: any) => {
  let notificationPath;

  if (!notification.standalone || notification.standalone === 'false') {
    const rootDApp = routing.getActiveRootENS() || routing.defaultDAppENS || await routing.getDefaultDAppENS();

    notificationPath = `#/${ rootDApp }/${ notification.path }`;
  } else {
    notificationPath = `#/${ notification.path }`;
  }

  // return notificationPath and return falsly provided multiple start slashes
  return notificationPath.replace(/\/\//g, '/');
};

/**
 * Initialize the plugin.
 */
export const initialize = async () => {
  let initialNotification;

  // set the firebase for quick access
  firebase = window['FirebasePlugin'];

  // if firebase is available start everything!
  if (firebase) {
    initialNotification = await onNotificationsToggled();

    window.addEventListener('evan-notifications-toggled', onNotificationsToggled, false);
  }

  return initialNotification;
}
