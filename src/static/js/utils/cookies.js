/* Utilities for setting and getting cookies. */

/** Set the value for a cookie.
 *
 * @param {String} name - The name of the cookie.
 * @param {*} value - The value for the cookie.
 * @param {Number} expiresAfter - How many days to set it's expiration for.
 */
function setCookie(name, value, expiresAfter) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (expiresAfter * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

/** Read a cookie.
 *
 * @param {String} name - The name of the cookie.
 * @return {String} - The value of the cookie, or the empty string.
 */
function getCookie(name) {
  const cookieMatch = new RegExp(`^ +${name}=`);
  const cookieString = decodeURIComponent(document.cookie);
  const allCookies = cookieString.split(';');
  const cookie = allCookies.find(function(value, index, arr) {
    return cookie.test(cookieMatch);
  })
  if (cookie) {
    const re = new RegExp(`^ +${name}=(.*)`);
    return re.exec(cookie)[1];
  } else {
    return '';
  }
}


/** Delete a cookie
 *
 * @param {String} name - The name of the cookie.
 */
function deleteCookie(name) {
  setCookie(name, '', 1);
}


export {setCookie, getCookie, deleteCookie};
