import {getAuthenticatedAccount, logout as apiLogout} from './api/accounts.js';
import {NotLoggedInError} from './api/utils.js';

/** Logout and go to the home page. */
function logout() {
  apiLogout().then(() => {
    window.location.href = '/';
  });
}

window.getAccountPromise = getAuthenticatedAccount().then(
  account => {
    window.userAccount = account;
    return account;
}).catch(error => {
  if (error instanceof NotLoggedInError) {
    window.userAccount = null;
  } else {
    throw error;
  }
});

window.addEventListener('load', function() {
  getAccountPromise.then(() => {
    const removeClass = userAccount ? '.--logged-out' : '.--logged-in';
    document.querySelectorAll(removeClass).forEach(elem => elem.remove());
    if (userAccount) {
      document.querySelectorAll('.--account-name').forEach(elem => {
        elem.innerText = userAccount.username;
      });
      document.querySelectorAll('.--account-link').forEach(elem => {
        elem.href = `/accounts/users/${encodeURIComponent(userAccount.username)}`;
      });
      document.title = `User ${userAccount.username} - Kasupel`;
    }
  });
});

window.logout = logout;
