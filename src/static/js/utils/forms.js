/** @file Utilities for processing forms. */
import {getCookie, deleteCookie} from './cookies.js';

/** Manage an unexpected API error being thrown.
 *
 * @param {KasupelError} error - The API error.
 */
function uncaughtApiError(error) {
  alert(`An unknown error (#${error.code}) has occurred.`);
}

/** Clear all displayed input errors. */
function clearInputErrors() {
  document.querySelectorAll('.input-error').forEach(elem => elem.remove());
}

/** Display an error associated with some form field.
 *
 * @param {Element} field - The input field in error.
 * @param {String} message - The message to display.
 */
function inputFieldError(field, message) {
  const messageElement = document.createElement('p');
  messageElement.className = 'input-error';
  const textNode = document.createTextNode(message);
  messageElement.appendChild(textNode);
  field.insertAdjacentElement('afterend', messageElement);
}

/** Follow a redirect that was delayed (eg. until after login). */
function followRedirectHint() {
  const redirect = getCookie('next-page') || '/';
  deleteCookie('next-page');
  window.location.href = redirect;
}

export {
  uncaughtApiError,
  inputFieldError,
  followRedirectHint,
  clearInputErrors
};
