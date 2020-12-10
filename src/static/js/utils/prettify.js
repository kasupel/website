/** @file Utilities to format data in a human-readable way. */

/** Get a string representation of a number of seconds.
 *
 * @param {Number} seconds - The seconds to represent.
 * @returns {String} - The string representation.
 */
function prettyTimedelta(seconds) {
  const timePeriods = [
    ['d', 24 * 60 * 60],
    ['h', 60 * 60],
    ['m', 60],
    ['s', 1]
  ];
  let pretty = '';
  for (let idx in timePeriods) {
    const [periodName, periodSeconds] = timePeriods[idx];
    if (periodSeconds <= seconds) {
      const periodValue = Math.trunc(seconds / periodSeconds);
      seconds %= periodSeconds;
      pretty += `${periodValue}${periodName}`;
    }
  }
  return pretty || '0';
}

/** Get a string representation of a date.
 *
 * @param {Date} date - The date to represent.
 * @param {String} - A pretty string representation.
 */
function prettyDate(date) {
  return date.toLocaleString("en-US", {
    day: "numeric", month: "short", year: "numeric"
  });
}

/** Turn an enum value into a title case string.
 *
 * @param {Enum} enumValue - The enum value.
 * @returns {String} - The pretty string.
 */
function prettyEnum(enumValue) {
  const allCaps = enumValue.description.replace('_', ' ');
  return allCaps.charAt(0) + allCaps.slice(1).toLowerCase();
}

/** Escape text to prevent XSS.
 *
 * @param {String} unsafeValue - Arbitrary user input.
 * @returns {String} - The HTML-escaped version.
 */
function escapeHtml(unsafeValue) {
  const textNode = document.createTextNode(unsafeValue);
  const elem = document.createElement('span');
  elem.appendChild(textNode);
  return elem.innerHTML;
}

export {
  prettyTimedelta,
  prettyDate,
  prettyEnum,
  escapeHtml
};
