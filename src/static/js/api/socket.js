/** Provide wrappers for the Socket.IO events. */
import {
  GameState, AllowedMoves, Move, Conclusion, DisconnectReason, Notification,
  KasupelError
} from './types.js';
import {Session, API_URL} from './utils.js';

/** A wrapper around the Socket.IO socket object. */
class KasupelSocket {
  /** Open a new connection.
   *
   * @param {Game} game - The game to connect to.
   */
  constructor(game) {
    this.game = game;
    const session = Session.getSession;
    const sessionKey = `${session.sessionId}|${bota(session.sessionToken)}`;
    this.socket = io(API_URL, {
      transportOptions: {
        polling: {
          extraHeaders: {
            'Authorization': `SessionKey ${sessionKey}`,
            'Game-ID': game.id,
          }
        }
      }
    });
    this.eventId = 0;
    this.handlers = {};
    this.processors = {
      game_disconnect: this._processGameDisconnect,
      game_start: this._processGameStart,
      game_end: this._processGameEnd,
      draw_offer: this._processDrawOffer,
      move: this._processMove,
      game_state: this._processGameState,
      allowed_moves: this._processAllowedMoves,
      notification: this._processNotification,
    };
    this.socket.onAny((eventName, ...data) => {
      if (eventName in this.handlers) {
        const args = this.processors[eventName](data);
        for (let handler in this.handlers[eventName]) {
          handler(...args);
        }
      }
    });
  }

  /** Send an event and wait for the response.
   *
   * @param {String} name - The name of the event to send.
   * @param {Object} [options.data={}] - A payload to send.
   * @param {String} [options.responseName='ack'] - The response to wait for.
   */
  async sendEvent(name, {data = {}, responseName = 'ack'} = {}) {
    const eventId = this.eventId++;
    data.event_id = eventId;
    this.socket.emit(name, data);
    return new Promise((resolve, reject) => {
      this.socket.on(responseName, (data) => {
        if (data.response_to === eventId) {
          resolve(data);
        }
      });
      this.socket.on('request_error', (data) => {
        if (data.response_to === eventId) {
          reject(KasupelError(data));
        }
      });
    });
  }

  /** Register a handler for an event.
   *
   * @param {String} event - The name of the event to register a handler for.
   * @param {CallableFunction} callback - The handler.
   */
  async on(event, callback) {
    if (event in this.handlers) {
      this.handlers[event].push(callback);
    } else {
      this.handlers[event] = [callback];
    }
  }

  /** Get the game state from the server.
   *
   * @returns {GameState} - The game state.
   * @throws {KasupelError} - An error returned by the server.
   */
  async getGameState() {
    return this.sendEvent('game_state', {responseName: 'game_state'}).then(
      response => GameState(response, this.game)
    );
  }

  /** Get the allowed moves from the server.
   *
   * @returns {AllowedMoves} - The allowed moves.
   * @throws {KasupelError} - An error returned by the server.
   */
  async getAllowedMoves() {
    return this.sendEvent(
      'allowed_moves', {responseName: 'allowed_moves'}
    ).then(response => AllowedMoves(response));
  }

  /** Make a move.
   *
   * @param {Move} move - The move to make.
   * @throws {KasupelError} - An error returned by the server.
   */
  async makeMove(move) {
    return this.sendEvent('move', {data: move.apiFormat()});
  }

  /** Offer the opponent a draw.
   *
   * @throws {KasupelError} - An error returned by the server.
   */
  async offerDraw() {
    return this.sendEvent('offer_draw');
  }

  /** Claim a draw.
   *
   * @param {Conclusion} reason - The reason for the draw.
   * @throws {KasupelError} - An error returned by the server.
   */
  async claimDraw(reason) {
    return this.sendEvent('claim_draw', {reason: Conclusion.valueFor(reason)});
  }

  /** Resign from the game.
   *
   * @throws {KasupelError} - An error returned by the server.
   */
  async resign() {
    return this.sendEvent('resign');
  }

  /** Assert that this player or the opponent has timed out.
   *
   * @throws {KasupelError} - An error returned by the server.
   */
  async timeout() {
    return this.sendEvent('timeout');
  }

  /** Process a warning that we will be disconnected.
   *
   * @param {Object} data - The raw event data.
   * @returns {Array<DisconnectReason>} - The reason we will be disconnected.
   */
  _processGameDisconnect(data) {
    return [DisconnectReason.getByValue(data.reason)];
  }

  /** Process a game start event.
   *
   * @param {Object} data - The raw event data (should be empty).
   * @returns {Array} - An empty array.
   */
  _processGameStart(data) {
    return [];
  }

  /** Process a game end event.
   *
   * @param {Object} data - The raw event data.
   * @returns {Array} - The game state and reason for game end.
   */
  _processGameEnd(data) {
    return [
      new GameState(data.game_state),
      Conclusion.getByValue(data.reason),
    ];
  }

  /** Process a draw offer event.
   *
   * @param {Object} data - The raw event data (should be empty).
   * @returns {Array} - An empty array.
   */
  _processDrawOffer(data) {
    return [];
  }

  /** Process an opponent move event.
   *
   * @param {Object} data - The raw event data.
   * @returns {Array} - The opponent's move, the state of the board and
   *                    possible moves for us.
   */
  _processMove(data) {
    return [
      Move.fromApiData(data.move),
      new GameState(data.game_state, this.game),
      new AllowedMoves(data.allowed_moves),
    ];
  }

  /** Process the game state being received.
   *
   * @param {Object} data - The raw event data.
   * @returns {Array<GameState>} - The game state as received.
   */
  _processGameState(data) {
    return [new GameState(data)];
  }

  /** Process the allowed moves being received.
   *
   * @param {Object} data - The raw event data.
   * @returns {Array<AllowedMoves>} - The allowed moves received.
   */
  _processAllowedMoves(data) {
    return [new AllowedMoves(data)];
  }

  /** Process a notification being received.
   *
   * @param {Object} data - The raw event data.
   * @returns {Array<Notification>} - The notification received.
   */
  _processNotification(data) {
    return [new Notification(data)];
  }
}

export {KasupelSocket};
