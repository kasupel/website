/** @file API endpoints relating to game information and matchmaking. */

import {call} from './utils.js';
import {GameMode, Game, Paginator} from './types.js';

/** Helper for getting endpoints that return paginated lists of games.
 *
 * @param {String} endpoint - The endpoint to get.
 * @param {Object} options.parameters - Extra parameters to pass.
 * @param {Boolean} options.authenticate - Whether to send session credentials.
 * @returns {Paginator} - A paginator of `Game` objects.
 */
function gamePaginator(endpoint, {parameters = {}, authenticate = false} = {}) {
  return new Paginator(endpoint, 'games', Game, {referenceFields: {
    host: 'users', away: 'users', invited: 'users'
  }, parameters: parameters, authenticate: authenticate});
}

/** Get a paginator of games this user has been invited to.
 *
 * @returns {Paginator} - A paginator of `Game` objects.
 */
function getGameInvites() {
  return gamePaginator('/games/invites', {authenticate: true});
}

/** Get a paginator of games where this user is looking for an opponent.
 *
 * @returns {Paginator} - A paginator of `Game` objects.
 */
function getGameSearches() {
  return gamePaginator('/games/searches', {authenticate: true});
}

/** Get a paginator of this user's ongoing games.
 *
 * @returns {Paginator} - A paginator of `Game` objects.
 */
function getOngoingGames() {
  return gamePaginator('/games/ongoing', {authenticate: true});
}

/** Get a paginator of games some user has completed.
 *
 * @param {String} username - The username of the user to look up.
 * @returns {Paginator} - A paginator of `Game` objects.
 */
function getCompletedGames(username) {
  return gamePaginator('/games/completed', {parameters: {account: username}});
}

/** Get a paginator of games some user has completed with the logged in user.
 *
 * @param {String} username - The username of the user to look up.
 * @returns {Paginator} - A paginator of `Game` objects.
 */
function getCommonCompletedGames(username) {
  return gamePaginator(
    '/games/common_completed', {parameters: {account: username}}
  );
}

/** Get a game by ID.
 *
 * @param {Number} id - The ID of the game to get.
 * @returns {Game} - The fetched game.
 * @throws {KasupelError} - An error returned by the server.
 */
async function getGame(id) {
  return call('GET', `/games/${id}`).then(response => new Game(response));
}

/** Create or join an un-started game.
 *
 * @param {TimeControl} timeControl - Time control options for the new game.
 * @param {GameMode} gameMode - The mode for the new game.
 * @returns {Game} - The new or joined game.
 * @throws {KasupelError} - An error returned by the server.
 */
async function findGame(timeControl, gameMode) {
  const response = await call('POST', '/games/find', {
    ...timeControl.apiFormat(),
    mode: GameMode.valueFor(gameMode),
  }, {authenticate: true});
  return getGame(response.game_id);
}

/** Send an invitation to another user.
 *
 * @param {String} invitee - The username of the user to invite.
 * @param {TimeControl} timeControl - Time control options for the new game.
 * @param {GameMode} gameMode - The mode for the new game.
 * @returns {Game} - The new or joined game.
 * @throws {KasupelError} - An error returned by the server.
 */
async function sendInvitation(invitee, timeControl, gameMode) {
  const response = await call('POST', '/games/send_invitation', {
    invitee: invitee,
    ...timeControl.apiFormat(),
    mode: GameMode.valueFor(gameMode),
  }, {authenticate: true});
  return getGame(response.game_id);
}

/** Accept an invitation to a game.
 *
 * @param {Number} id - The ID of the invitation to accept.
 * @throws {KasupelError} - An error returned by the server.
 */
async function acceptInvitation(id) {
  return call('POST', `/games/invites/${id}`, {}, {authenticate: true});
}

/** Decline an invitation to a game.
 *
 * @param {Number} id - The ID of the invitation to decline.
 * @throws {KasupelError} - An error returned by the server.
 */
async function declineInvitation(id) {
  return call('DELETE', `/games/invites/${id}`, {}, {authenticate: true});
}

export {
  getGameInvites,
  getGameSearches,
  getOngoingGames,
  getCompletedGames,
  getCommonCompletedGames,
  getGame,
  findGame,
  sendInvitation,
  acceptInvitation,
  declineInvitation,
};
