/** @file JS for the login page. */
import {
  inputFieldError, uncaughtApiError, followRedirectHint, clearInputErrors
} from '../utils/forms.js';

/** Read the form fields and attempt to login with them. */
function login(event) {
  event.preventDefault();
  let usernameField = document.getElementById('username-input');
  let passwordField = document.getElementById('password-input');
  clearInputErrors();
  api.accounts.login(usernameField.value, passwordField.value).then(resp => {
    followRedirectHint();
  }).catch(error => {
    switch (error.code) {
      case 1001:
        inputFieldError(usernameField, 'Username not found.');
        break;
      case 1302:
        inputFieldError(passwordField, 'Incorrect password.');
        break;
      default:
        uncaughtApiError(error);
    }
  });
  return false;    // Don't reload the page.
}

window.login = login;
