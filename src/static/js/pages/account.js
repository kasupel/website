/** @file Script to fill in an user's account detail page. */
import {
  prettyEnum, prettyTimedelta, prettyDate, escapeHtml
} from '../utils/prettify.js';
import {
  getCompletedGames, getGameInvites, getGameSearches, getOngoingGames,
  getCommonCompletedGames
} from '../api/games.js';
import {Winner, Enum, User} from '../api/types.js';
import {getAccount} from '../api/accounts.js';

const GameLogs = new Enum([
  'COMPLETED',
  'INVITES',
  'SEARCHES',
  'ONGOING',
  'COMMON_COMPLETED'
]);
const ColumnTypes = new Enum([
  'OPPONENT',
  'SIDE',
  'MODE',
  'TIME_CONTROL',
  'CURRENT_TURN',
  'RESULT',
  'WINNER',
  'OPEN_FOR',
  'ENDED_AT'
]);
const columnHeaders = new Map([
  [GameLogs.COMPLETED, [
    ColumnTypes.SIDE, ColumnTypes.RESULT, ColumnTypes.ENDED_AT
  ]],
  [GameLogs.INVITES, [ColumnTypes.OPEN_FOR]],
  [GameLogs.SEARCHES, [ColumnTypes.OPEN_FOR]],
  [GameLogs.ONGOING, [ColumnTypes.SIDE, ColumnTypes.CURRENT_TURN]],
  [GameLogs.COMMON_COMPLETED, [
    ColumnTypes.SIDE, ColumnTypes.WINNER, ColumnTypes.ENDED_AT
  ]]
]);

const switcherClass = 'game-log-viewer__switcher';
const optionClass = switcherClass + '__option';
const activeOptionClass = optionClass + '--active';

let paginator = null;

/** Get the available types of logs.
 *
 * @param {User} viewingAccount - The account the logs relate to.
 * @returns {Array<GameLogs>} - The available log types.
 */
function getLogOptions(viewingAccount) {
  let options = [GameLogs.COMPLETED];
  if (userAccount) {
    if (userAccount.id === viewingAccount.id) {
      options.push(GameLogs.INVITES, GameLogs.SEARCHES, GameLogs.ONGOING);
    } else {
      options.push(GameLogs.COMMON_COMPLETED);
    }
  }
  return options;
}

/** Get the log data.
 *
 * @param {User} viewingAccount - The user to get data on.
 * @param {GameLogs} logType - The type of data to get.
 * @returns {Paginator<Game>} - A paginator for the data.
 */
function getGameData(viewingAccount, logType) {
  switch (logType) {
    case GameLogs.COMPLETED: return getCompletedGames(viewingAccount.username);
    case GameLogs.INVITES: return getGameInvites();
    case GameLogs.SEARCHES: return getGameSearches();
    case GameLogs.ONGOING: return getOngoingGames();
    case GameLogs.COMMON_COMPLETED:
      return getCommonCompletedGames(viewingAccount.username);
  }
}

/** Get the value for some column from a game.
 *
 * @param {Game} game - The game to get the data from.
 * @param {ColumnTypes} column - The specific value to get.
 * @param {User} viewingAccount - The user the data relates to.
 * @returns {(String|User|Enum|null)} - The data for the column.
 */
function getLogCell(game, column, viewingAccount) {
  const host_id = game.host ? game.host.id : null;
  switch (column) {
    case ColumnTypes.OPPONENT:
      return (
        host_id !== viewingAccount.id ?
        game.host : game.away || game.invited
      );
    case ColumnTypes.SIDE:
      return host_id === viewingAccount.id ? 'Host' : 'Away';
    case ColumnTypes.MODE: return game.mode;
    case ColumnTypes.TIME_CONTROL: return game.timeControl.shortNotation;
    case ColumnTypes.CURRENT_TURN: return game.currentTurn;
    case ColumnTypes.RESULT:
      switch (game.winner) {
        case Winner.DRAW: return 'Draw';
        case Winner.HOME:
          return host_id === viewingAccount.id ? 'Win' : 'Loss';
        case Winner.AWAY:
          return host_id === viewingAccount.id ? 'Win' : 'Loss';
        default: return 'Incomplete';
      }
    case ColumnTypes.WINNER:
      switch (game.winner) {
        case Winner.DRAW: return 'Draw';
        case Winner.HOME: return game.host;
        case Winner.AWAY: return game.away;
        default: return 'Incomplete';
      }
    case ColumnTypes.OPEN_FOR:
      return prettyTimedelta((Date.now() - game.openedAt.getTime()) / 1000);
    case ColumnTypes.ENDED_AT: return prettyDate(game.endedAt);
  }
}

/** Get the name to display for some column type.
 *
 * @param {ColumnTypes} columnType - The column type.
 * @param {GameLogs} logType - The log type.
 * @returns {String} - The name to display.
 */
function getColumnTitle(columnType, logType) {
  switch (columnType) {
    case ColumnTypes.OPPONENT:
      switch (logType) {
        case GameLogs.INVITES: return 'Invited by';
        case GameLogs.SEARCHES: return 'Invited';
        default: return 'Opponent';
      }
    default:
      return prettyEnum(columnType);
  }
}

/** Get the names of the columns to display for some log type.
 *
 * @param {GameLogs} logType - The type of log.
 * @returns {String} - The column headers to display, as HTML.
 */
function getColumnNames(logType) {
  let columns = columnHeaders.get(logType).slice();
  columns.unshift(
    ColumnTypes.MODE, ColumnTypes.OPPONENT, ColumnTypes.TIME_CONTROL
  );
  let headerHtml = '<tr>';
  for (let idx in columns) {
    const displayName = getColumnTitle(columns[idx], logType);
    headerHtml += `<th>${displayName}</th>`;
  }
  return headerHtml + '</tr>';
}

/** Get the values to display for some list of games.
 *
 * @param {User} viewingAccount - The user the data relates to.
 * @param {GameLogs} logType - The type of log.
 * @param {Array<Game>} games - The games to get data from.
 * @returns {Array<Array<(String|User|Enum|null)>>} - The data to display.
 */
function formatLogData(viewingAccount, logType, games) {
  let columns = columnHeaders.get(logType).slice();
  columns.unshift(
    ColumnTypes.MODE, ColumnTypes.OPPONENT, ColumnTypes.TIME_CONTROL
  );
  let tableRows = [];
  for (let game_idx in games) {
    let row = [];
    for (let col_idx in columns) {
      row.push(getLogCell(games[game_idx], columns[col_idx], viewingAccount));
    }
    tableRows.push(row);
  }
  return tableRows;
}

/** Extend the table with the next page from the paginator.
 *
 * @param {User} viewingAccount - The account the data relates to.
 * @param {GameLogs} logType - The type of log.
 * @param {Element} table - The table element to extend.
 */
async function extendLog(viewingAccount, logType, table) {
  return await paginator.getPage().then(games => {
    const rows = formatLogData(viewingAccount, logType, games);
    let html = '';
    for (let row_idx in rows) {
      html += '<tr>';
      for (let col_idx in rows[row_idx]) {
        let value = rows[row_idx][col_idx];
        if (typeof value === 'symbol') {
          value = prettyEnum(value);
        } else if (value instanceof User) {
          value = (
            `<a href="/accounts/users/${encodeURIComponent(value.username)}">` +
            `${escapeHtml(value.username)}</a>`
          );
        } else if (value === null) {
          value = '-';
        }
        html += `<td>${value}</td>`;
      }
      html += '</tr>';
    }
    table.getElementsByTagName('tbody')[0].innerHTML += html;
    if (paginator.endReached) {
      table.classList.add('game-log-viewer__logs--complete');
    } else if (table.getBoundingClientRect().bottom < window.innerHeight) {
      return extendLog(viewingAccount, logType, table);
    }
  });
}

/** Select and display a certain log type.
 *
 * @param {User} viewingAccount - The user to get logs on.
 * @param {GameLogs} logType - The type of logs to get.
 */
async function selectLogType(viewingAccount, logType) {
  const table = document.getElementById('game-log-viewer__logs');
  table.innerHTML = getColumnNames(logType);
  paginator = getGameData(viewingAccount, logType);
  return await extendLog(viewingAccount, logType, table);
}

/** Get the username to get data for from the URL.
 *
 * @returns {String} - The username.
 */
function getUsernameFromUrl() {
  const pathParts = window.location.pathname.split('/');
  return decodeURIComponent(pathParts[pathParts.length - 1]);
}

/** Make a callback function for one of the log switcher options.
 *
 * @param {Element} elem - The element representing the switcher option.
 * @param {GameLogs} logType - The type of log to switch to.
 * @param {User} viewingAccount - The user the logs are about.
 * @param {Element} table - The table to display the logs in.
 */
function makeLogTypeSwitchCallback(elem, logType, viewingAccount, table) {
  return function() {
    document.querySelectorAll('.' + activeOptionClass).forEach(
      elem => {elem.classList.remove(activeOptionClass);}
    );
    elem.classList.add(activeOptionClass);
    selectLogType(viewingAccount, logType, table);
  };
}

/** Add each of the available log options to the switcher.
 *
 * @param {User} viewingAccount - The account the logs are for.
 * @param {Element} table - The table where logs will be shown.
 */
function showLogOptions(viewingAccount, table) {
  const logOptions = getLogOptions(viewingAccount);
  const switcher = document.getElementsByClassName(switcherClass)[0];
  for (let idx in logOptions) {
    const logType = logOptions[idx];
    const elem = document.createElement('div');
    const logTypeTextNode = document.createTextNode(prettyEnum(logType));
    elem.appendChild(logTypeTextNode);
    elem.classList.add(optionClass);
    if (idx === '0') elem.classList.add(activeOptionClass);
    switcher.appendChild(elem);
    elem.addEventListener('click', makeLogTypeSwitchCallback(
      elem, logType, viewingAccount, table
    ));
  }
}

/** Hide the edit account link if the account does not belong to the user.
 *
 * @param {User} viewingAccount - The account that is being viewed.
 */
function hideEditLink(viewingAccount) {
  if ((!userAccount) || (viewingAccount.id !== userAccount.id)) {
    document.querySelectorAll('.edit-account-button').forEach(elem => {
      elem.remove();
    });
  } else{
    document.querySelectorAll('.edit-account-button--hidden').forEach(elem => {
      elem.classList.remove('edit-account-button--hidden');
    });
  }
}

window.addEventListener('load', function() {
  getAccountPromise.then(_account => {
    const username = getUsernameFromUrl();
    getAccount(username).then(account => {
      hideEditLink(account);
      if (account.avatarUrl) {
        document.getElementById('account-avatar').src = account.avatarUrl;
      }
      document.getElementById('account-name').innerText = account.username;
      document.getElementById('account-elo').innerText = account.elo;
      const table = document.getElementById('game-log-viewer__logs');
      showLogOptions(account, table);
      selectLogType(account, GameLogs.COMPLETED);
      window.addEventListener('scroll', extendLog);
    });
    return _account;
  });
});
