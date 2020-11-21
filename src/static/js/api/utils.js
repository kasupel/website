/** @file Low level tools for interacting with the API. */
// Requires forge - https://unpkg.com/node-forge@0.7.0/dist/forge.min.js
// Requires socket.io - https://unpkg.com/socket.io-client@3.0.1/dist/socket.io.min.js

import {getCookie} from '../utils/cookies.js';
import {KasupelError} from './types.js';


const API_URL = 'https://chess-api.polytopia.win';

let _cached_session = null;

/** Storage for the session ID and token. */
class Session {
  /** Get a new session from credentials stored in cookies.
   *
   * @throws {Error} - The user is not logged in.
   */
  constructor() {
    this.sessionId = parseInt(getCookie('sessionId'));
    if (isNan(this.sessionId)) {
      throw Error('Not logged in.');
    }
    this.session_token = getCookie('sessionToken');
    _cached_session = this;
  }

  /** Get a session stored in cookies, or cached.
   *
   * @returns {Session} - The session.
   */
  static getSession() {
    return _cached_session ? _cached_session : new Session();
  }
}


/** Process the raw response sent by the server.
 *
 * @param {Response} response - The response to process.
 * @returns {Object} - The parsed response.
 * @throws {KasupelError} - An error returned by the server.
 */
async function handleResponse(response) {
  if (response.status === 200) {
    return response.json();
  } else if (response.status === 204) {
    return {};
  } else {
    throw await KasupelError(response.json());
  }
}

/** Get the server's encryption key (non-standard endpoint).
 *
 * @returns {forge.publicKey} - The RSA key.
 */
async function getPublicKey() {
  const response = await fetch(API_URL + '/rsa_key');
  const text = await response.text();
  return forge.pki.publicKeyFromPem(text);
}

/** Send a request with a body to the server.
 *
 * @param {String} endpoint - The endpoint to call.
 * @param {Object} payload - The data to send.
 * @param {Boolean} [encrypt] - Whether to encrypt the data.
 * @param {String} [method] - The HTTP verb - should be POST or PATCH.
 * @returns {Object} - The response from the server.
 * @throws {KasupelError} - An error from the server.
 */
async function postPayload(
    endpoint, payload, encrypt, method) {
  let payloadString = JSON.stringify(payload);
  if (encrypt) {
    const publicKey = await getPublicKey();
    payloadString = btoa(publicKey.encrypt(payloadString, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create()
      }
    }));
  }
  return fetch(API_URL + endpoint, {
    method: method,
    body: payloadString
  }).then(response => {return handleResponse(response);});
}

/** Send a request to the server without a body.
 *
 * @param {String} endpoint - The endpoint to call.
 * @param {Object} [query] - The query to send.
 * @param {String} [method] - The HTTP verb - should be GET or DELETE.
 * @returns {Object} - The response from the server.
 * @throws {KasupelError} - An error from the server.
 */
async function getEndpoint(endpoint, query, method) {
  const url = new URL(API_URL + endpoint);
  Object.keys(query).forEach(key => url.searchParams.append(key, query[key]));
  return fetch(url, {method: method}).then(
    response => {return handleResponse(response);}
  );
}

/** Send a request to the server.
 *
 * @param {String} method - The HTTP verb - POST, PATCH, GET or DELETE.
 * @param {String} endpoint - The endpoint to call.
 * @param {Object} params - The payload to send to the server, in the body or
 *                          URL params.
 * @param {Object} options - Extra options. Remember to specify empty params if
 *                           necessary.
 * @param {Boolean} [options.encrypt=false] - Whether or not to encrypt. Ignored
 *                                            for body-less requests.
 * @param {Boolean} [options.authenticate=false] - Whether or not to
 *                                                 authenticate.
 * @returns {Object} - The response from the server.
 * @throws {KasupelError} - An error from the server.
 */
async function call(
    method, endpoint, params = {},
    {encrypt = false, authenticate = false} = {}) {
  if (authenticate) {
    const session = Session.getSession();
    params.sessionId = session.sessionId;
    params.sessionToken = session.sessionToken;
  }
  if (method === 'POST' || method === 'PATCH') {
    return postPayload(endpoint, params, encrypt, method);
  } else if (method === 'GET' || method === 'DELETE') {
    return getEndpoint(endpoint, params, method);
  }
}


export {call, Session, API_URL};
