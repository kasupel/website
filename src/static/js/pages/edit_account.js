import * as accounts from '../api/accounts.js';
import {
  clearInputErrors, inputFieldError, uncaughtApiError
} from '../utils/forms.js';

/** Logout and go to the home page. */
function logout() {
  accounts.logout().then(() => {
    window.location.href = '/';
  });
}

/** Delete the user's account. */
function deleteAccount() {
  const actuallyDoIt = confirm(
    'Are you sure you want to delete your account? ' +
    'This action is irreversible.'
  );
  if (actuallyDoIt) {
    accounts.deleteAccount().then(() => {
      window.location.href = '/';
    });
  }
}

/** Update the user's email address */
function updateEmail() {
  let emailField = document.getElementById('account-email');
  clearInputErrors();
  accounts.updateAccount({email: emailField.value}).then(() => {
    window.location.reload();
  }).catch(error => {
    switch (error.code) {
      case 1131:
        inputFieldError(emailField, 'Email address too long.');
        break;
      case 1132:
        inputFieldError(emailField, 'Invalid email address.');
        break;
      case 1133:
        inputFieldError(emailField, 'That email address is already in use.');
        break;
      default:
        uncaughtApiError(error);
    }
  });
}

/** Resend the verification email. */
function resendVerificationEmail() {
  clearInputErrors();
  accounts.resendVerificationEmail().then(() => {
    show('verification-email-sent');
  }).catch(error => {
    const button = document.getElementById('resend-verification-button');
    switch (error.code) {
      case 1201:
        inputFieldError(button, 'Email address already verified.');
        break;
      default:
        uncaughtApiError(error);
    }
  });
}

/** Verify the user's email address. */
function verifyEmail() {
  clearInputErrors();
  const tokenField = document.getElementById('verification-code');
  accounts.verifyEmail(tokenField.value).then(() => {
    window.location.reload();
  }).catch(error => {
    switch (error.code) {
      case 1201:
        inputFieldError(tokenField, 'Email address already verified.');
        break;
      case 1202:
        inputFieldError(tokenField, 'Incorrect verification token.');
        break;
      default:
        uncaughtApiError(error);
    }
  });
}

/** Change the user's password. */
function updatePassword() {
  clearInputErrors();
  const passwordField = document.getElementById('new-password');
  const confirmationField = document.getElementById('confirm-password');
  if (passwordField.value !== confirmationField.value) {
    inputFieldError(confirmationField, 'Passwords do not match.');
    return;
  }
  accounts.updateAccount({password: passwordField.value}).then(() => {
    window.location.href = '/';
  }).catch(error => {
    if (error.isInDomain(1120)) {
      inputFieldError(passwordField, error.message);
    } else {
      uncaughtApiError(error);
    }
  });
}

/** Update the user's avatar. */
function updateAvatar() {
  clearInputErrors();
  const avatarField = document.getElementById('avatar-upload');
  const file = avatarField.files[0];
  accounts.updateAvatar(file).then(() => {
    window.location.reload();
  }).catch(error => {
    const avatarChanger = document.getElementById('avatar-changer');
    switch (error.code) {
      case (3115):
        inputFieldError(avatarChanger, 'Avatar must be gif, jpeg, png or webp.');
        break;
      case (3116):
        inputFieldError(avatarChanger, 'Avatar must be less than 1MB.');
        break;
      default:
        uncaughtApiError(error);
    }
  });
}

/** Show some hidden element.
 *
 * @param {String} className - The class name of the element.
 */
function show(className) {
  document.querySelectorAll('.' + className).forEach(elem => {
    elem.classList.remove(className + '--hidden');
  });
}

window.addEventListener('load', function() {
  getAccountPromise.then(account => {
    if (!account) {
      window.location.href = '/';
      return;
    }
    document.getElementById('account-name').innerText = account.username;
    document.getElementById('account-email').value = account.email;
    if (account.avatarUrl) {
      document.getElementById('account-avatar').src = account.avatarUrl;
    }
    if (!account.emailVerified) show('unverified-email-warning');
  });
});

window.logout = logout;
window.deleteAccount = deleteAccount;
window.updateEmail = updateEmail;
window.show = show;
window.updateAvatar = updateAvatar;
window.resendVerificationEmail = resendVerificationEmail;
window.verifyEmail = verifyEmail;
window.updatePassword = updatePassword;
