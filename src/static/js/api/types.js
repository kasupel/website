/** @file Classes for data returned by the API. */

import {call, API_URL} from './utils.js';
import {prettyTimedelta} from '../utils/prettify.js';

/** Convert a timestamp returned by the API to a Date object.
 *
 * @param {?Number} timestamp - Seconds since the epoch.
 * @returns {?Date} - `timestamp` as a `Date` object.
 */
function loadTimestamp(timestamp) {
  if (timestamp == null) return null;
  return new Date(timestamp * 1000);
}

/** An enum - maps names to unique values. */
class Enum {
  /** Create a new enum class.
   *
   * @param {Array<String>} names - The names of the options.
   */
  constructor(names) {
    this.values = {};
    for (let i in names) {
      this[names[i]] = Symbol(names[i]);
      this.values[names[i]] = parseInt(i) + 1;
    }
  }

  /** Get an option of this enum by value.
   *
   * @param {Number} value - The value to look for.
   * @returns {Symbol} - An option of this enum.
   */
  getByValue(value) {
    for (let name in this.values) {
      if (this.values[name] === value) {
        return this[name];
      }
    }
  }

  /** Get the value for some option.
   *
   * @param {Symbol} option - The option to look for.
   * @returns {Number} - The value the API uses for the given option.
   */
  valueFor(option) {
    for (let name in this.values) {
      if (name === option.description) {
        return this.values[name];
      }
    }
  }
}

// --- Enums

const GameMode = new Enum([
  'CHESS',
]);

const Winner = new Enum([
  'GAME_NOT_COMPLETE',
  'HOST',
  'AWAY',
  'DRAW',
]);

const Conclusion = new Enum([
  'GAME_NOT_COMPLETE',
  'CHECKMATE',
  'RESIGNATION',
  'TIME',
  'STALEMATE',
  'THREEFOLD_REPETITION',
  'FIFTY_MOVE_RULE',
  'AGREED_DRAW',
]);

const PieceType = new Enum([
  'PAWN',
  'ROOK',
  'KNIGHT',
  'BISHOP',
  'QUEEN',
  'KING',
]);

const Side = new Enum([
  'HOST',
  'AWAY',
]);

const DisconnectReason = new Enum([
  'INVITE_DECLINED',
  'NEW_CONNECTION',
  'GAME_OVER',
]);

// --- Dataclasses

/** A user account. */
class User {
  /** Create an instance from data returned by the API.
   *
   * @param {Object} data - The data as returned by the API.
   */
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.elo = data.elo;
    this.createdAt = loadTimestamp(data.created_at);
    this.avatarUrl = data.avatar_url ? API_URL + data.avatar_url : null;
    if (data.hasOwnProperty('email')) {
      this.hasEmail = true;
      this.email = data.email;
      this.emailVerified = data.email_verified;
    } else {
      this.hasEmail = false;
    }
  }
}

/** Meta-information about a game. */
class Game {
  /** Create an instance from data returned by the API.
   *
   * @param {Object} data - The data as returned by the API.
   */
  constructor(data) {
    this.id = data.id;
    this.mode = data.mode ? GameMode.getByValue(data.mode) : null;
    this.host = data.host ? new User(data.host) : null;
    this.away = data.away ? new User(data.away) : null;
    this.invited = data.invited ? new User(data.invited) : null;
    this.currentTurn = Side.getByValue(data.current_turn);
    this.turnNumber = data.turn_number;
    this.timeControl = new TimeControl(
      data.main_thinking_time, data.fixed_extra_time,
      data.time_increment_per_turn
    );
    this.hostTime = data.host_time;
    this.awayTime = data.away_time;
    this.hostOfferingDraw = data.host_offering_draw;
    this.awayOfferingDraw = data.away_offering_draw;
    this.winner = Winner.getByValue(data.winner);
    this.conclusionType = Conclusion.getByValue(data.conclusion_type);
    this.openedAt = loadTimestamp(data.opened_at);
    this.startedAt = loadTimestamp(data.started_at);
    this.endedAt = loadTimestamp(data.ended_at);
  }
}

/** A notification for the user. */
class Notification {
  /** Create an instance based on data from the API.
   *
   * @param {Object} data - Data from the API.
   */
  constructor(data) {
    this.id = data.id;
    this.sentAt = loadTimestamp(data.sent_at);
    this.typeCode = data.type_code;
    this.game = data.game ? new Game(data.game) : null;
    // TODO: Provide our own (localised?) message based on typeCode and game.
    this.message = data.message;
    this.read = data.read;
  }
}

/** Settings for a game's time control. */
class TimeControl {
  /** Create a new instance of the settings.
   *
   * @param {Number} mainThinkingTime - The time clocks start with.
   * @param {Number} fixedExtraTime - Time before the clock starts going down
   *                                  each turn.
   * @param {Number} timeIncrementPerTurn - Time added to the clock at the end
   *                                        of each turn.
   */
  constructor(mainThinkingTime, fixedExtraTime, timeIncrementPerTurn) {
    this.mainThinkingTime = mainThinkingTime;
    this.fixedExtraTime = fixedExtraTime;
    this.timeIncrementPerTurn = timeIncrementPerTurn;
    this.shortNotation = prettyTimedelta(mainThinkingTime);
    if (timeIncrementPerTurn) {
      this.shortNotation += `|${prettyTimedelta(timeIncrementPerTurn)}`;
    }
    if (fixedExtraTime) {
      this.shortNotation += ` delay ${prettyTimedelta(fixedExtraTime)}`;
    }
  }

  /** Get these settings in an easy way to pass to the API.
   *
   * @returns {Object} - Time control settings as an object with snake_case
   *                     keys.
   */
  apiFormat() {
    return {
      main_thinking_time: this.mainThinkingTime,
      fixed_extra_time: this.fixedExtraTime,
      time_increment_per_turn: this.timeIncrementPerTurn,
    };
  }
}

/** A piece on a board. */
class Piece {
  /** Create a piece from a piece type and a side.
   *
   * @param {PieceType} pieceType - The type of the piece.
   * @param {Side} side - Which side the piece is on.
   */
  constructor(pieceType, side) {
    this.pieceType = pieceType;
    this.side = side;
  }
}

/** The visual state of a game board. */
class Board {
  /** Load the board from data returned by the API.
   *
   * @param {Object} data - The data as returned by the API.
   */
  constructor(data) {
    this.ranks = [];
    for (let rank = 0; rank < 8; rank++) {
      let rank = [];
      for (let file = 0; file < 8; file++) {
        const positionKey = `${rank},${file}`;
        if (positionKey in data) {
          const pieceType = PieceType.getByValue(data[positionKey][0]);
          const side = Side.getByValue(data[positionKey][1]);
          rank.push(new Piece(pieceType, side));
        } else {
          rank.push(null);
        }
      }
      this.ranks.push(rank);
    }
  }

  /** Get the piece on a square, if any.
   *
   * @param {Number} rank - The rank of the square (0-7).
   * @param {Number} file - The file of the square (0-7).
   * @returns {?Piece} - The piece on the square, or null if there is none.
   */
  getSquare(rank, file) {
    return this.ranks[rank][file];
  }
}

/** The current state of the clocks in a game. */
class Clocks {
  /** Load the clocks from data returned by the API.
   *
   * @param {Object} data - The returned by the API.
   * @param {Game} game - The game this relates to.
   */
  constructor(data, game) {
    this.baseHostTime = data.host_time;
    this.baseAwayTime = data.away_time;
    this.lastTurnTime = data.last_turn;
    this.current_turn = Side.getByValue(data.current_turn);
    this.timeControl = game.timeControl;
  }
}

/** The state of a game, including the board and timers. */
class GameState {
  /** Load the game state from data returned by the API.
   *
   * @param {Object} data - The data returned by the API.
   * @param {Game} game - The game this relates to.
   */
  constructor(data, game) {
    this.board = new Board(data.board);
    this.clocks = new Clocks(data, game);
    this.currentTurn = Side.getByValue(data.current_turn);
    this.turnNumber = data.turn_number;
    this.game = game;
  }
}

/** A move on a board. */
class Move {
  /** Load a move from data returned by the API.
   *
   * @param {Object} - Data from the API.
   * @returns {Move} - A `Move` object representing the same data.
   */
  static fromApiData(data) {
    return new Move({
      startRank: data.start_rank,
      startFile: data.start_file,
      endRank: data.end_rank,
      endFile: data.end_file,
      promotion: PieceType.getByValue(data.promotion),
    });
  }

  /** Create a new move.
   *
   * @param {Number} data.startRank - The current rank of the piece to move.
   * @param {Number} data.startFile - The current file of the piece to move.
   * @param {Number} data.endRank - The rank to move the piece to.
   * @param {Number} data.endFile - The file to move the piece to.
   * @param {PieceType} [data.promotion=null] - What piece to promote to, if
   *     the move moves a pawn to the final rank.
   */
  constructor(
      {startRank, startFile, endRank, endFile, promotion = null} = {}) {
    this.startRank = startRank;
    this.startFile = startFile;
    this.endRank = endRank;
    this.endFile = endFile;
    this.promotion = promotion;
  }

  /** Get this move in an easy way to pass to the API.
   *
   * @returns {Object} - This move as an object with snake_case keys.
   */
  apiFormat() {
    return {
      start_rank: this.startRank,
      start_file: this.startFile,
      end_rank: this.endRank,
      end_file: this.endFile,
      promotion: this.promotion ? PieceType.valueFor(this.promotion) : null,
    };
  }
}

/** A list of possible moves and a draw claim. */
class AllowedMoves {
  /** Load the allowed moves from raw API data.
   *
   * @param {Object} data - The data as returned by the API.
   */
  constructor(data) {
    this.moves = [];
    for (let move in data.moves) {
      this.moves.push(Move.fromApiData(move));
    }
    this.drawClaim = Conclusion.getByValue(data.draw_claim);
  }
}

// --- Other types

/** A class to assist in reading paginated API responses. */
class Paginator {
  /** Create a new paginator.
   *
   * @param {String} endpoint - The endpoint to call.
   * @param {String} paginatedField - The field where paginated data will be.
   * @param {Class} type - The data class to be used for the data.
   * @param {Object} [options.referenceFields={}] - Keys are fields that will
   *     be included in the paginated objects, values are corresponding fields
   *     that will be included in the response body.
   * @param {Object} [options.parameters={}] - Extra parameters to pass.
   * @param {Boolean} [options.authenticate=false] - Whether to authenticate
   *                                                 requests.
   */
  constructor(
      endpoint, paginatedField, type,
      {referenceFields = {}, parameters = {}, authenticate = false} = {}) {
    this.endpoint = endpoint;
    this.paginatedField = paginatedField;
    this.type = type;
    this.referenceFields = referenceFields;
    this.parameters = parameters;
    this.authenticate = authenticate;
    this.page = 0;
    this.pages = null;
    this.endReached = false;
  }

  /** Get a page, defaults to the next.
   *
   * @param {Number} [page=null] - The page to fetch.
   * @returns {Array} - An array where elements are of type `this.type`.
   */
  async getPage(page = null) {
    let autoPage = false;
    if (page === null) {
      page = this.page++;
      autoPage = true;
    }
    this.parameters.page = page;
    return call(
      'GET', this.endpoint, this.parameters, {authenticate: this.authenticate}
    ).then(response => {
      this.pages = response.pages;
      let page = [];
      for (let itemIndex in response[this.paginatedField]) {
        let item = response[this.paginatedField][itemIndex];
        for (let field in this.referenceFields) {
          if (field in item) {
            item[field] = response[this.referenceFields[field]][item[field]];
          }
        }
        page.push(new this.type(item));
      }
      return page;
    }).catch(error => {
      if ((error.code === 3201) && autoPage) {
        this.endReached = true;
        return [];
      } else {
        throw error;
      }
    });
  }
}

class KasupelError extends Error {
  /** Load a new error from the API.
   *
   * @param {Object} data - The data returned by the API.
   * @param {Object} params - Any other parameters passed by JS. Should not be
   *                          used.
  */
  constructor(data, ...params) {
    super(...params);
    this.code = data.error;
    this.message = data.message;
  }

  /** Check if the error is in some domain.
   * Eg. "2134" and "2198" are in the domain "2100" but not "2130".
   *
   * @param {Number} domain - The domain to check.
   * @returns {Boolean} - Whether the error is in the domain.
   */
  isInDomain(domain) {
    let regex = '^';
    for (let char of domain.toString()) {
      if (char === '0') break;
      regex += char;
    }
    return new RegExp(regex).test(this.code.toString());
  }
}

export {
  Enum,
  GameMode,
  Winner,
  Conclusion,
  PieceType,
  Side,
  DisconnectReason,
  User,
  Game,
  Notification,
  TimeControl,
  Piece,
  Board,
  GameState,
  Move,
  AllowedMoves,
  Paginator,
  KasupelError,
};
