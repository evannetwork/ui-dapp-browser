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

(function () {
  var ipfs = {};
  ipfs.localProvider = { host: '127.0.0.1', port: '5001', protocol: 'http', root: '/api/v0' };

  /**
   * set localProvider configuration
   *
   * @param      {any}  opts    e.g. {host: 'localhost', port: '5001'}
   */
  ipfs.setProvider = function (opts) {
    if (!opts) opts = this.localProvider;
    if (typeof opts === 'object' && !opts.hasOwnProperty('host')) {
      return;
    }
    ipfs.api = opts;
  };

  /**
   * build the api connection url
   *
   * @param      {string}  path    path to build the api url for ()
   * @return     {string}  full api enchanced path
   * 
   * Usage:
   *  restIpfs.api_url(`/ipfs/Qmb...`) => http://localhost:5001/api/v0/ipfs/Qmb
   * 
   */
  ipfs.api_url = function (path) {
    var api = ipfs.api;
    return api.protocol + "://" + api.host +
      (api.port ? ":" + api.port : "") +
      (api.root ? api.root : "") + path;
  }

  /**
   * Check if brovider is set
   *
   * @param      {Function}  callback  callback function on invalid provider
   * @return     {boolean}   true if provider set, false if provider unset
   */
  function ensureProvider(callback) {
    if (!ipfs.api) {
      callback("No provider set", null);
      return false;
    }
    return true;
  }

  /**
   * Submit a new rest request
   *
   * @param      {any}  opts    options for the request
   * 
   * Usage:
   *  request({ callback: callback, uri: ("/ipfs/" + ipfsHash) })
   */
  function request(opts) {
    if (!ensureProvider(opts.callback)) return;
    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
      if (req.readyState == 4) {
        if (req.status != 200)
          opts.callback(req.responseText, null);
        else {
          var response = req.responseText;
          if (opts.transform) {
            response = opts.transform(response);
          }
          opts.callback(null, response);
        }
      }
    };

    req.open(opts.method || "GET", ipfs.api_url(opts.uri));
    if (opts.accept) {
      req.setRequestHeader("accept", opts.accept);
    }
    if (opts.payload) {
      req.enctype = "multipart/form-data";
      req.send(opts.payload);
    } else {
      req.send()
    }
  }

  /**
   * Adds a file to the ipfs
   *
   * @param      {string}    input     string input of the file
   * @param      {Function}  callback  callback called when finished adding
   */
  ipfs.add = function (input, callback) {
    var form = new FormData();
    var data = (isBuffer(input) ? input.toString('binary') : input);
    var blob = new Blob([data], {})
    form.append("file", blob);
    request({
      callback: callback,
      method: "POST",
      uri: "/add",
      payload: form,
      accept: "application/json",
      transform: function (response) { return response ? JSON.parse(response)["Hash"] : null }
    });
  };

  /**
   * Returns a string that is loaded from a ipfs hash
   *
   * @param      {string}    ipfsHash  ipfs hash to load
   * @param      {Function}  callback  callback that is called when finished request
   */
  ipfs.catText = function (ipfsHash, callback) {
    request({ callback: callback, uri: ("/ipfs/" + ipfsHash) })
  };

  /**
   * Alias for catText
   */
  ipfs.cat = ipfs.catText; // Alias this for now

  /**
   * Serializes a json object and saves it using ipfs.add
   *
   * @param      {any}       jsonObject  json object to save
   * @param      {Function}  callback    callback that is called when finished request
   */
  ipfs.addJson = function (jsonObject, callback) {
    var jsonString = JSON.stringify(jsonObject);
    ipfs.add(jsonString, callback);
  };

  /**
   * Load data from an ipfs hash and tries an JSON.parse on the result
   *
   * @param      {string}    ipfsHash  ipfs hash to load
   * @param      {Function}  callback  callback that is called when finished request
   */
  ipfs.catJson = function (ipfsHash, callback) {
    ipfs.catText(ipfsHash, function (err, jsonString) {
      if (err) callback(err, {});
      var jsonObject = {};
      try {
        jsonObject = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      } catch (e) {
        err = e;
      }
      callback(err, jsonObject);
    });
  };

  // From https://github.com/feross/is-buffer
  
  /**
   * Determines if an object is an buffer.
   *
   * @param      {any}      obj     object to check
   * @return     {boolean}  True if buffer, False otherwise
   */
  function isBuffer(obj) {
    return !!(obj != null &&
      (obj._isBuffer || // For Safari 5-7 (missing Object.prototype.constructor)
        (obj.constructor &&
          typeof obj.constructor.isBuffer === 'function' &&
          obj.constructor.isBuffer(obj))
      ))
  }

  if (typeof window !== 'undefined') {
    window.ipfs = ipfs;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ipfs;
  }
})();