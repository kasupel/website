/** @file Collate exports from the files in the directory. */

import * as accounts from './accounts.js';
import * as games from './games.js';
import * as types from './types.js';
import {KasupelSocket} from './socket.js';

window.api = {
  accounts: accounts,
  games: games,
  types: types,
  KasupelSocket: KasupelSocket,
};

export {
  accounts,
  games,
  types,
  KasupelSocket,
};
