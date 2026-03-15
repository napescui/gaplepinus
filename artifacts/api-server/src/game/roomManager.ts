import {
  GameState,
  Player,
  SpectatorInfo,
  Tile,
  dealTiles,
  findFirstPlayer,
  canPlay,
  playTile,
  isDouble,
  getPlayerTotalPips,
} from "./domino.js";

const rooms: Map<string, GameState> = new Map();
const socketToRoom: Map<string, string> = new Map();
const profileToSocket: Map<string, string> = new Map();
const socketToProfile: Map<string, string> = new Map();

const BOT_NAMES = ["Macan", "Panda", "Singa", "Harimau"];
const BOT_AVATARS = ["🐯", "🐼", "🦁", "🐅"];
let botCounter = 0;

export function createRoom(roomId: string, hostSocketId: string, hostNickname: string, hostProfileId: string, hostAvatar: string): GameState {
  const host: Player = { id: hostSocketId, nickname: hostNickname, tiles: [], profileId: hostProfileId, avatar: hostAvatar, connected: true, isBot: false };
  const state: GameState = {
    roomId,
    players: [host],
    spectators: [],
    board: [],
    leftEnd: -1,
    rightEnd: -1,
    currentPlayerIndex: 0,
    consecutivePasses: 0,
    phase: "waiting",
    pausedBy: null,
    roundWinner: null,
    hiddenTiles: [],
    round: 0,
    spectatorTiles: [],
    hostId: hostSocketId,
  };
  rooms.set(roomId, state);
  socketToRoom.set(hostSocketId, roomId);
  profileToSocket.set(hostProfileId, hostSocketId);
  socketToProfile.set(hostSocketId, hostProfileId);
  return state;
}

export function getRoom(roomId: string): GameState | undefined {
  return rooms.get(roomId);
}

export function getRoomIdForSocket(socketId: string): string | undefined {
  return socketToRoom.get(socketId);
}

export interface JoinResult {
  state: GameState;
  type: "new_player" | "reconnect" | "spectator";
  player?: Player;
  spectator?: SpectatorInfo;
}

export function joinRoom(
  roomId: string,
  socketId: string,
  nickname: string,
  profileId: string,
  avatar: string
): JoinResult | { error: string } {
  const existingRoom = socketToRoom.get(socketId);
  if (existingRoom && existingRoom !== roomId) leaveRoom(socketId);

  let state = rooms.get(roomId);
  if (!state) {
    state = createRoom(roomId, socketId, nickname, profileId, avatar);
    return { state, type: "new_player", player: state.players[0] };
  }

  // Reconnect check
  const existingPlayer = state.players.find((p) => p.profileId === profileId);
  if (existingPlayer) {
    const oldSocketId = existingPlayer.id;
    existingPlayer.id = socketId;
    existingPlayer.connected = true;
    existingPlayer.isBot = false; // Player is back, disable bot mode
    socketToRoom.delete(oldSocketId);
    socketToRoom.set(socketId, roomId);
    profileToSocket.set(profileId, socketId);
    socketToProfile.delete(oldSocketId);
    socketToProfile.set(socketId, profileId);
    if (state.hostId === oldSocketId) state.hostId = socketId;
    return { state, type: "reconnect", player: existingPlayer };
  }

  const existingSpectator = state.spectators.find((s) => s.profileId === profileId);
  if (existingSpectator) {
    const oldId = existingSpectator.id;
    existingSpectator.id = socketId;
    socketToRoom.delete(oldId);
    socketToRoom.set(socketId, roomId);
    profileToSocket.set(profileId, socketId);
    socketToProfile.delete(oldId);
    socketToProfile.set(socketId, profileId);
    return { state, type: "spectator", spectator: existingSpectator };
  }

  if (state.phase !== "waiting") {
    const spectator: SpectatorInfo = { id: socketId, nickname, profileId, avatar };
    state.spectators.push(spectator);
    socketToRoom.set(socketId, roomId);
    profileToSocket.set(profileId, socketId);
    socketToProfile.set(socketId, profileId);
    return { state, type: "spectator", spectator };
  }

  if (state.players.length >= 4) return { error: "Room sudah penuh (max 4 pemain)" };

  const player: Player = { id: socketId, nickname, tiles: [], profileId, avatar, connected: true, isBot: false };
  state.players.push(player);
  socketToRoom.set(socketId, roomId);
  profileToSocket.set(profileId, socketId);
  socketToProfile.set(socketId, profileId);
  return { state, type: "new_player", player };
}

export function leaveRoom(socketId: string): { roomId: string; state: GameState; wasHost: boolean } | null {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;
  const state = rooms.get(roomId);
  if (!state) return null;

  const profileId = socketToProfile.get(socketId);
  const wasPlayer = state.players.some((p) => p.id === socketId);
  const wasSpectator = state.spectators.some((s) => s.id === socketId);
  const wasHost = state.hostId === socketId;

  if (wasPlayer) state.players = state.players.filter((p) => p.id !== socketId);
  if (wasSpectator) state.spectators = state.spectators.filter((s) => s.id !== socketId);

  socketToRoom.delete(socketId);
  socketToProfile.delete(socketId);
  if (profileId) profileToSocket.delete(profileId);

  if (state.players.length === 0 && state.spectators.length === 0) {
    rooms.delete(roomId);
    return { roomId, state, wasHost };
  }

  if (wasHost && state.players.length > 0) {
    const nextRealPlayer = state.players.find((p) => !p.isBot);
    state.hostId = nextRealPlayer?.id ?? state.players[0].id;
  }

  if ((state.phase === "playing" || state.phase === "paused") && wasPlayer) {
    if (state.players.filter((p) => !p.isBot).length < 1) {
      // All real players left, end game
      state.phase = "waiting";
      state.board = [];
      state.players.forEach((p) => (p.tiles = []));
      state.hiddenTiles = [];
    } else if (state.currentPlayerIndex >= state.players.length) {
      state.currentPlayerIndex = 0;
    }
  }

  return { roomId, state, wasHost };
}

export function markDisconnected(socketId: string): { roomId: string; state: GameState } | null {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;
  const state = rooms.get(roomId);
  if (!state) return null;
  const player = state.players.find((p) => p.id === socketId);
  if (player) {
    player.connected = false;
    player.isBot = true; // Bot takes over while player is gone
  }
  return { roomId, state };
}

export function kickPlayer(roomId: string, hostSocketId: string, targetSocketId: string): { state: GameState } | { error: string } {
  const state = rooms.get(roomId);
  if (!state) return { error: "Room not found" };
  if (state.hostId !== hostSocketId) return { error: "Hanya host yang bisa kick" };
  if (targetSocketId === hostSocketId) return { error: "Tidak bisa kick diri sendiri" };

  const profileId = socketToProfile.get(targetSocketId);
  state.players = state.players.filter((p) => p.id !== targetSocketId);
  state.spectators = state.spectators.filter((s) => s.id !== targetSocketId);
  socketToRoom.delete(targetSocketId);
  socketToProfile.delete(targetSocketId);
  if (profileId) profileToSocket.delete(profileId);

  return { state };
}

export function addBot(roomId: string, hostSocketId: string): { state: GameState; bot: Player } | { error: string } {
  const state = rooms.get(roomId);
  if (!state) return { error: "Room not found" };
  if (state.hostId !== hostSocketId) return { error: "Hanya host yang bisa tambah bot" };
  if (state.players.length >= 4) return { error: "Room sudah penuh (max 4 pemain)" };
  if (state.phase !== "waiting") return { error: "Tidak bisa tambah bot saat game berlangsung" };

  const idx = botCounter % 4;
  botCounter++;
  const botId = `bot_${roomId}_${botCounter}`;
  const bot: Player = {
    id: botId,
    nickname: `Bot ${BOT_NAMES[idx]}`,
    tiles: [],
    profileId: botId,
    avatar: BOT_AVATARS[idx],
    connected: true,
    isBot: true,
  };
  state.players.push(bot);
  return { state, bot };
}

export function removeBot(roomId: string, hostSocketId: string, botId: string): { state: GameState } | { error: string } {
  const state = rooms.get(roomId);
  if (!state) return { error: "Room not found" };
  if (state.hostId !== hostSocketId) return { error: "Hanya host yang bisa hapus bot" };
  const bot = state.players.find((p) => p.id === botId && p.isBot);
  if (!bot) return { error: "Bot tidak ditemukan" };
  state.players = state.players.filter((p) => p.id !== botId);
  return { state };
}

function findPlayerWithDouble(players: Player[], fromIndex: number): number {
  const n = players.length;
  for (let offset = 0; offset < n; offset++) {
    const idx = (fromIndex + offset) % n;
    if (players[idx].tiles.some((t) => t[0] === t[1])) return idx;
  }
  return fromIndex;
}

export function startGame(roomId: string, hostSocketId: string): { state: GameState } | { error: string } {
  const state = rooms.get(roomId);
  if (!state) return { error: "Room not found" };
  if (state.hostId !== hostSocketId) return { error: "Hanya host yang bisa mulai game" };
  if (state.players.length < 2) return { error: "Minimal 2 pemain untuk mulai" };

  const { hands, hidden } = dealTiles(state.players.length);
  for (let i = 0; i < state.players.length; i++) state.players[i].tiles = hands[i];
  state.hiddenTiles = hidden;
  state.board = [];
  state.leftEnd = -1;
  state.rightEnd = -1;
  state.consecutivePasses = 0;
  state.roundWinner = null;
  state.round = 1;
  state.phase = "playing";
  state.pausedBy = null;

  const { playerIndex } = findFirstPlayer(state.players, 1);
  state.currentPlayerIndex = playerIndex;
  return { state };
}

export function startNextRound(roomId: string, winnerSocketId: string): { state: GameState } | { error: string } {
  const state = rooms.get(roomId);
  if (!state) return { error: "Room not found" };

  const { hands, hidden } = dealTiles(state.players.length);
  for (let i = 0; i < state.players.length; i++) state.players[i].tiles = hands[i];
  state.hiddenTiles = hidden;
  state.board = [];
  state.leftEnd = -1;
  state.rightEnd = -1;
  state.consecutivePasses = 0;
  state.roundWinner = null;
  state.round += 1;
  state.phase = "playing";
  state.pausedBy = null;

  const winnerIdx = state.players.findIndex((p) => p.id === winnerSocketId);
  const startIdx = winnerIdx >= 0 ? winnerIdx : 0;
  state.currentPlayerIndex = findPlayerWithDouble(state.players, startIdx);
  return { state };
}

export interface PlayResult {
  success: boolean;
  error?: string;
  state?: GameState;
  roundOver?: boolean;
  blocked?: boolean;
  winner?: string;
}

export function playMove(roomId: string, playerId: string, tile: Tile, side: "left" | "right"): PlayResult {
  const state = rooms.get(roomId);
  if (!state) return { success: false, error: "Room not found" };
  if (state.phase !== "playing") return { success: false, error: "Game not in playing state" };

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return { success: false, error: "Bukan giliran kamu" };

  if (state.board.length === 0 && !isDouble(tile)) {
    return { success: false, error: "Pembukaan harus dengan batu BALAK (angka sama)" };
  }

  const tileIdx = currentPlayer.tiles.findIndex((t) => t[0] === tile[0] && t[1] === tile[1]);
  if (tileIdx === -1) return { success: false, error: "Kamu tidak punya batu ini" };

  const result = playTile(tile, side, state.board, state.leftEnd, state.rightEnd);
  if (!result.valid) return { success: false, error: "Langkah tidak valid" };

  currentPlayer.tiles.splice(tileIdx, 1);
  state.board = result.board;
  state.leftEnd = result.leftEnd;
  state.rightEnd = result.rightEnd;
  state.consecutivePasses = 0;

  if (currentPlayer.tiles.length === 0) {
    state.phase = "round_end";
    state.roundWinner = playerId;
    return { success: true, state, roundOver: true, winner: playerId };
  }

  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return { success: true, state };
}

export function passTurn(roomId: string, playerId: string): PlayResult {
  const state = rooms.get(roomId);
  if (!state) return { success: false, error: "Room not found" };
  if (state.phase !== "playing") return { success: false, error: "Game not in playing state" };

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return { success: false, error: "Bukan giliran kamu" };

  if (state.board.length === 0) {
    const hasDouble = currentPlayer.tiles.some((t) => t[0] === t[1]);
    if (hasDouble) return { success: false, error: "Kamu punya BALAK — harus mainkan untuk membuka" };
  } else {
    const canPlayAny = currentPlayer.tiles.some((t) => canPlay(t, state.leftEnd, state.rightEnd));
    if (canPlayAny) return { success: false, error: "Kamu masih punya batu yang bisa dimainkan" };
  }

  state.consecutivePasses += 1;
  if (state.consecutivePasses >= state.players.length) {
    let minPips = Infinity;
    let winnerSocketId = state.players[0].id;
    for (const p of state.players) {
      const pips = getPlayerTotalPips(p.tiles);
      if (pips < minPips) { minPips = pips; winnerSocketId = p.id; }
    }
    state.phase = "round_end";
    state.roundWinner = winnerSocketId;
    return { success: true, state, roundOver: true, blocked: true, winner: winnerSocketId };
  }

  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return { success: true, state };
}

export function pauseGame(roomId: string, socketId: string): { state: GameState } | { error: string } {
  const state = rooms.get(roomId);
  if (!state) return { error: "Room not found" };
  if (state.phase !== "playing") return { error: "Hanya bisa pause saat main" };
  state.phase = "paused";
  state.pausedBy = socketId;
  return { state };
}

export function resumeGame(roomId: string, socketId: string): { state: GameState } | { error: string } {
  const state = rooms.get(roomId);
  if (!state) return { error: "Room not found" };
  if (state.phase !== "paused") return { error: "Game tidak sedang pause" };
  if (state.pausedBy !== socketId) return { error: "Hanya yang pause bisa lanjutkan" };
  state.phase = "playing";
  state.pausedBy = null;
  return { state };
}

export function endGame(roomId: string): { state: GameState } | { error: string } {
  const state = rooms.get(roomId);
  if (!state) return { error: "Room not found" };
  state.phase = "waiting";
  state.board = [];
  // Keep bots, reset tiles for all
  state.players.forEach((p) => (p.tiles = []));
  // Remove bots that were temporary (mid-game disconnected bots are removed, permanent bots stay)
  // Actually, keep all bots — they were added intentionally by host
  // But restore isBot=false for players that reconnected
  state.hiddenTiles = [];
  state.round = 0;
  return { state };
}

export function getPublicState(state: GameState, forSocketId: string) {
  const isSpectator = state.spectators.some((s) => s.id === forSocketId);
  return {
    roomId: state.roomId,
    players: state.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      profileId: p.profileId,
      tileCount: p.tiles.length,
      connected: p.connected,
      isBot: p.isBot,
    })),
    spectators: state.spectators.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      avatar: s.avatar,
    })),
    board: state.board,
    leftEnd: state.leftEnd,
    rightEnd: state.rightEnd,
    currentPlayerIndex: state.currentPlayerIndex,
    consecutivePasses: state.consecutivePasses,
    phase: state.phase,
    pausedBy: state.pausedBy,
    roundWinner: state.roundWinner,
    hiddenTiles: state.hiddenTiles,
    myTiles: isSpectator ? [] : (state.players.find((p) => p.id === forSocketId)?.tiles ?? []),
    round: state.round,
    hostId: state.hostId,
    isSpectator,
  };
}
