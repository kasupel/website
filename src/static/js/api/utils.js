/** @file Low level tools for interacting with the API. */
import {setCookie, getCookie, deleteCookie} from '../utils/cookies.js';
import {KasupelError} from './types.js';


const API_URL = 'https://chess-api.polytopia.win';

let _cached_session = null;

class NotLoggedInError extends Error {
  constructor(...params) {
    super('Not logged in.', ...params);
  }
}

/** Storage for the session ID and token. */
class Session {
  /** Get a new session from credentials stored in cookies.
   *
   * @throws {Error} - The user is not logged in.
   */
  constructor() {
    this.sessionId = parseInt(getCookie('sessionId'));
    if (isNaN(this.sessionId)) {
      throw new NotLoggedInError();
    }
    this.sessionToken = getCookie('sessionToken');
    _cached_session = this;
  }

  /** Get a session stored in cookies, or cached.
   *
   * @returns {Session} - The session.
   */
  static getSession() {
    return _cached_session ? _cached_session : new Session();
  }

  /** Store a new session.
   * 
   * @param {Number} id - The session ID.
   * @param {String} token - The session token.
   */
  static storeSession(id, token) {
    this.forgetSession();
    setCookie('sessionToken', token, 30);
    setCookie('sessionId', id, 30);
  }

  /** Delete any session there is. */
  static forgetSession() {
    _cached_session = null;
    deleteCookie('sessionId');
    deleteCookie('sessionToken');
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
    throw new KasupelError(await response.json());
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
 * @param {URL} url - The endpoint to call.
 * @param {Object} payload - The data to send.
 * @param {Boolean} [encrypt] - Whether to encrypt the data.
 * @param {String} [method] - The HTTP verb - should be POST or PATCH.
 * @returns {Object} - The response from the server.
 * @throws {KasupelError} - An error from the server.
 */
async function postPayload(
    url, payload, encrypt, method) {
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
  return fetch(url, {
    method: method,
    body: payloadString
  }).then(response => {return handleResponse(response);});
}

/** Send a request to the server without a body.
 *
 * @param {URL} url - The endpoint to call.
 * @param {Object} [query] - The query to send.
 * @param {String} [method] - The HTTP verb - should be GET or DELETE.
 * @returns {Object} - The response from the server.
 * @throws {KasupelError} - An error from the server.
 */
async function getEndpoint(url, query, method) {
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
  const url = new URL(API_URL + endpoint);
  if (authenticate) {
    const session = Session.getSession();
    params.session_id = session.sessionId;
    params.session_token = session.sessionToken;
  }
  if (method === 'POST' || method === 'PATCH') {
    return postPayload(url, params, encrypt, method);
  } else if (method === 'GET' || method === 'DELETE') {
    return getEndpoint(url, params, method);
  }
}


export {call, Session, NotLoggedInError, API_URL};
