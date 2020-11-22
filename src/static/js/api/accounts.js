/* Endpoints relating to user accounts. */

import {call, Session} from './utils.js';
import {User, Notification, Paginator} from './types.js';


/** Generate a 32 byte base64-encoded token.
 *
 * @returns {String} - The token in base 64.
 */
function generateRandomToken() {
  const numbers = new Uint8Array(32);
  window.crypto.getRandomValues(numbers);
  const binary = String.fromCharCode.apply(null, numbers);
  return btoa(binary);
}

/** Convert a blob to a base64 string.
 *
 * @param {Blob} blob - The blob to convert.
 * @returns {String} - The base64 string.
 */
async function blobToBase64(blob) {
  const reader = new FileReader();
  return new Promise((resolve, _reject) => {
    reader.addEventListener('load', function () {
      resolve(reader.result.split(',')[1]);
    }, false);
    reader.readAsDataURL(blob);
  });
}

/** Log in to the user's account. Stores a session with cookies.
 *
 * @param {String} username - The user's username.
 * @param {String} password - The user's password.
 * @throws {KasupelError} - An error returned by the server.
 */
async function login(username, password) {
  const token = generateRandomToken();
  return await call('POST', '/accounts/login', {
    username: username,
    password: password,
    token: token
  }, {encrypt: true}).then(response => {
    Session.storeSession(response.session_id, token);
  });
}

/** Delete the current session.
 *
 * @throws {KasupelError} - An error returned by the server.
 */
async function logout() {
  return call('GET', '/accounts/logout', {}, {authenticate: true}).then(
    _response => Session.forgetSession()
  );
}

/** Create a new user account.
 *
 * @param {String} username - The username for the new account.
 * @param {String} password - The password for the new account.
 * @param {String} email - The email address for the new account.
 * @throws {KasupelError} - An error returned by the server.
 */
async function createAccount(username, password, email) {
  return call(
    'POST', '/accounts/create',
    {username: username, password: password, email: email},
    {encrypt: true}
  );
}

/** Resend a verification email to the user.
 *
 * @throws {KasupelError} - An error returned by the server.
 */
async function resendVerificationEmail() {
  return call(
    'GET', '/accounts/resend_verification_email', {}, {authenticate: true}
  );
}

/** Verify the user's email address.
 *
 * @param {String} token - The six character token emailed to the user.
 * @throws {KasupelError} - An error returned by the server.
 */
async function verifyEmail(token) {
  return call(
    'GET', '/accounts/verify_email', {token: token}, {authenticate: true}
  );
}

/** Update the user's password or email address.
 *
 * @param {String} [fields.password=null] - A new password.
 * @param {String} [fields.email=null] - A new email address.
 * @throws {KasupelError} - An error returned by the server.
 */
async function updateAccount({password = null, email = null} = {}) {
  let payload = {};
  if (password) {
    payload.password = password;
  }
  if (email) {
    payload.email = email;
  }
  return call(
    'PATCH', '/accounts/me', payload, {encrypt: true, authenticate: true}
  ).then(_response => {
    if (password) Session.forgetSession();
  });
}

/** Update the user's avatar.
 * 
 * @param {Blob} avatar - A new avatar.
 */
async function updateAvatar(avatar) {
  return call(
    'PATCH', '/accounts/me/avatar', {avatar: await blobToBase64(avatar)},
    {authenticate: true}
  );
}

/** Delete the user's account
 *
 * @throws {KasupelError} - An error returned by the server.
 */
async function deleteAccount() {
  return call('DELETE', '/accounts/me', {}, {authenticate: true}).then(
    _response => Session.forgetSession()
  );
}

/** Get the user's account.
 *
 * @returns {User} - The logged in user.
 * @throws {KasupelError} - An error returned by the server.
 */
async function getAuthenticatedAccount() {
  return call('GET', '/accounts/me', {}, {authenticate: true}).then(
    response => new User(response)
  );
}

/** Get an account by user ID.
 *
 * @param {Number} id - The ID of the account to get.
 * @returns {User} - The account.
 * @throws {KasupelError} - An error returned by the server.
 */
async function getAccountById(id) {
  return call('GET', '/accounts/account', {id: id}).then(
    response => new User(response)
  );
}

/** Get an account by username.
 *
 * @param {String} username - The username of the account to get.
 * @returns {User} - The account.
 * @throws {KasupelError} - An error returned by the server.
 */
async function getAccount(username) {
  const endpoint = `/users/${encodeURIComponent(username)}`;
  return call('GET', endpoint).then(response => new User(response));
}

/** Get a paginator of all accounts ordered by ELO.
 *
 * @returns {Paginator} - A paginator of `User` objects.
 */
function getAccounts() {
  return new Paginator('/accounts/all', 'users', User);
}

/** Get a paginator of the user's notifications.
 *
 * @returns {Paginator} - A paginator of `Notification` objects.
 */
function getNotifications() {
  return new Paginator(
    '/accounts/notifications', 'notifications', Notification,
    {authenticate: true}
  );
}

/** Check how many unread notifications the user has.
 *
 * @returns {Number} - The number of unread notifications.
 * @throws {KasupelError} - An error returned by the server.
 */
async function getUnreadNotificationCount() {
  return call(
    'GET', '/accounts/notifications/unread_count', {}, {authenticate: true}
  ).then(response => response.count);
}

/** Mark a notification as read.
 *
 * @param {Number} id - The ID of the notification to mark as read.
 * @throws {KasupelError} - An error returned by the server.
 */
async function acknowledgeNotification(id) {
  return call(
    'POST', '/accounts/notifications/ack', {notification: id},
    {authenticate: true}
  );
}

export {
  login,
  logout,
  createAccount,
  verifyEmail,
  resendVerificationEmail,
  updateAccount,
  updateAvatar,
  deleteAccount,
  getAuthenticatedAccount,
  getAccountById,
  getAccount,
  getAccounts,
  getNotifications,
  getUnreadNotificationCount,
  acknowledgeNotification,
};
