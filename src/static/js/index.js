import * as api from './api/index.js';

/** Logout and go to the home page. */
function logout() {
  api.accounts.logout().then(() => {
    window.location.href = '/';
  });
}

const getAccountPromise = api.accounts.getAuthenticatedAccount().then(
  account => {
    window.userAccount = account;
}).catch(error => {
  if (error instanceof api.NotLoggedInError) {
    window.userAccount = null;
  } else {
    throw error;
  }
});

window.addEventListener('load', function() {
  getAccountPromise.then(() => {
    const removeClass = userAccount ? '.logged-out' : '.logged-in';
    document.querySelectorAll(removeClass).forEach(elem => elem.remove());
    if (userAccount) {
      document.querySelectorAll('.account-name').forEach(elem => {
        elem.innerText = userAccount.username;
      });
    }
  });
});

window.logout = logout;
