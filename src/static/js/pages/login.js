/** @file JS for the login page. */
import {
  inputFieldError, uncaughtApiError, followRedirectHint, clearInputErrors
} from '../utils/forms.js';
import {login as apiLogin} from '../api/accounts.js';

/** Read the form fields and attempt to login with them. */
function login() {
  let usernameField = document.getElementById('username-input');
  let passwordField = document.getElementById('password-input');
  clearInputErrors();
  apiLogin(usernameField.value, passwordField.value).then(() => {
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
}

window.login = login;
