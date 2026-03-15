import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import {
  joinRoom,
  leaveRoom,
  markDisconnected,
  kickPlayer,
  addBot,
  removeBot,
  startGame,
  startNextRound,
  playMove,
  passTurn,
  pauseGame,
  resumeGame,
  endGame,
  getRoomIdForSocket,
  getPublicState,
  getRoom,
} from "./game/roomManager.js";
import { canPlay } from "./game/domino.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/api/socket.io",
});

const chatMessages: Map<string, { nickname: string; message: string; time: number; avatar: string }[]> = new Map();

function broadcastState(roomId: string) {
  const state = getRoom(roomId);
  if (!state) return;
  const sockets = [...state.players, ...state.spectators];
  for (const p of sockets) {
    const s = io.sockets.sockets.get(p.id);
    if (s) s.emit("game_state", getPublicState(state, p.id));
  }
}

function broadcastRoundOver(roomId: string, winnerId: string, blocked: boolean) {
  const state = getRoom(roomId);
  if (!state) return;
  const winner = state.players.find((p) => p.id === winnerId);
  io.to(roomId).emit("round_over", {
    winnerId,
    winnerNickname: winner?.nickname ?? "Unknown",
    blocked,
    players: state.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      tileCount: p.tiles.length,
      pips: p.tiles.reduce((s, t) => s + t[0] + t[1], 0),
      isBot: p.isBot,
    })),
  });
}

// Bot auto-play: called after every turn change
function scheduleBotTurn(roomId: string) {
  setTimeout(() => {
    const state = getRoom(roomId);
    if (!state || state.phase !== "playing") return;
    const cur = state.players[state.currentPlayerIndex];
    if (!cur?.isBot) return;

    let result;
    if (state.board.length === 0) {
      // Opening — need a double
      const dbl = cur.tiles.find((t) => t[0] === t[1]);
      if (dbl) {
        result = playMove(roomId, cur.id, dbl, "left");
      } else {
        result = passTurn(roomId, cur.id);
      }
    } else {
      const validTiles = cur.tiles.filter((t) => canPlay(t, state.leftEnd, state.rightEnd));
      if (validTiles.length > 0) {
        const tile = validTiles[Math.floor(Math.random() * validTiles.length)];
        const canLeft = tile[0] === state.leftEnd || tile[1] === state.leftEnd;
        const canRight = tile[0] === state.rightEnd || tile[1] === state.rightEnd;
        const side = canLeft ? "left" : canRight ? "right" : "left";
        result = playMove(roomId, cur.id, tile, side);
      } else {
        result = passTurn(roomId, cur.id);
      }
    }

    if (result.success && result.state) {
      broadcastState(roomId);
      if (result.roundOver) {
        broadcastRoundOver(roomId, result.winner!, result.blocked ?? false);
      } else {
        // Check if next player is also a bot
        scheduleBotTurn(roomId);
      }
    }
  }, 1200 + Math.floor(Math.random() * 800));
}

function broadcastGameStarted(roomId: string) {
  const state = getRoom(roomId);
  if (!state) return;
  const allSockets = [...state.players, ...state.spectators];
  for (const p of allSockets) {
    const s = io.sockets.sockets.get(p.id);
    if (s) {
      s.emit("game_state", getPublicState(state, p.id));
      s.emit("game_started", { round: state.round });
    }
  }
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join_room", ({ roomId, nickname, profileId, avatar }: { roomId: string; nickname: string; profileId: string; avatar: string }) => {
    const result = joinRoom(roomId, socket.id, nickname, profileId, avatar);
    if ("error" in result) { socket.emit("error", { message: result.error }); return; }

    socket.join(roomId);
    if (!chatMessages.has(roomId)) chatMessages.set(roomId, []);

    socket.emit("game_state", getPublicState(result.state, socket.id));
    socket.emit("join_type", { type: result.type });
    socket.emit("chat_history", chatMessages.get(roomId) ?? []);

    if (result.type === "reconnect") {
      io.to(roomId).emit("player_reconnected", { nickname, playerId: socket.id });
      // After reconnect, check if it was their turn and trigger game continue
      broadcastState(roomId);
      // Don't schedule bot — they're back now (isBot=false set in joinRoom)
    } else if (result.type === "spectator") {
      io.to(roomId).emit("spectator_joined", { nickname });
      broadcastState(roomId);
    } else {
      sounds_join(roomId, nickname);
      broadcastState(roomId);
    }
  });

  socket.on("exit_room", () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    socket.leave(roomId);
    const result = leaveRoom(socket.id);
    if (result) {
      io.to(result.roomId).emit("player_left", { playerId: socket.id });
      broadcastState(result.roomId);
    }
    socket.emit("room_exited", {});
  });

  socket.on("kick_player", ({ targetId }: { targetId: string }) => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    const result = kickPlayer(roomId, socket.id, targetId);
    if ("error" in result) { socket.emit("error", { message: result.error }); return; }
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) { targetSocket.emit("kicked", { reason: "Kamu di-kick oleh host" }); targetSocket.leave(roomId); }
    io.to(roomId).emit("player_left", { playerId: targetId });
    broadcastState(roomId);
  });

  socket.on("add_bot", () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    const result = addBot(roomId, socket.id);
    if ("error" in result) { socket.emit("error", { message: result.error }); return; }
    io.to(roomId).emit("player_joined", { nickname: result.bot.nickname, playerCount: result.state.players.length });
    broadcastState(roomId);
  });

  socket.on("remove_bot", ({ botId }: { botId: string }) => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    const result = removeBot(roomId, socket.id, botId);
    if ("error" in result) { socket.emit("error", { message: result.error }); return; }
    io.to(roomId).emit("player_left", { playerId: botId });
    broadcastState(roomId);
  });

  socket.on("ping_host", () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    const state = getRoom(roomId);
    if (!state) return;
    const pinger = state.players.find((p) => p.id === socket.id);
    const hostSocket = io.sockets.sockets.get(state.hostId);
    if (hostSocket && pinger) hostSocket.emit("start_requested", { from: pinger.nickname });
  });

  socket.on("start_game", () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) { socket.emit("error", { message: "Kamu tidak berada di room" }); return; }
    const result = startGame(roomId, socket.id);
    if ("error" in result) { socket.emit("error", { message: result.error }); return; }
    broadcastGameStarted(roomId);
    scheduleBotTurn(roomId);
  });

  socket.on("play_tile", ({ tile, side }: { tile: [number, number]; side: "left" | "right" }) => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) { socket.emit("error", { message: "Kamu tidak berada di room" }); return; }
    const result = playMove(roomId, socket.id, tile, side);
    if (!result.success) { socket.emit("error", { message: result.error }); return; }
    broadcastState(roomId);
    if (result.roundOver) {
      broadcastRoundOver(roomId, result.winner!, result.blocked ?? false);
    } else {
      io.to(roomId).emit("tile_played", { playerId: socket.id, tile, side });
      scheduleBotTurn(roomId);
    }
  });

  socket.on("pass_turn", () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) { socket.emit("error", { message: "Kamu tidak berada di room" }); return; }
    const result = passTurn(roomId, socket.id);
    if (!result.success) { socket.emit("error", { message: result.error }); return; }
    broadcastState(roomId);
    if (result.roundOver) {
      broadcastRoundOver(roomId, result.winner!, result.blocked ?? false);
    } else {
      io.to(roomId).emit("player_passed", { playerId: socket.id });
      scheduleBotTurn(roomId);
    }
  });

  socket.on("next_round", () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    const state = getRoom(roomId);
    if (!state) return;
    const result = startNextRound(roomId, state.roundWinner ?? socket.id);
    if ("error" in result) { socket.emit("error", { message: result.error }); return; }
    broadcastGameStarted(roomId);
    scheduleBotTurn(roomId);
  });

  socket.on("pause_game", () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    const result = pauseGame(roomId, socket.id);
    if ("error" in result) { socket.emit("error", { message: result.error }); return; }
    broadcastState(roomId);
    const pauser = result.state.players.find((p) => p.id === socket.id);
    io.to(roomId).emit("game_paused", { pausedBy: socket.id, pausedByNickname: pauser?.nickname ?? "Someone" });
  });

  socket.on("resume_game", () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    const result = resumeGame(roomId, socket.id);
    if ("error" in result) { socket.emit("error", { message: result.error }); return; }
    broadcastState(roomId);
    io.to(roomId).emit("game_resumed", {});
    scheduleBotTurn(roomId);
  });

  socket.on("end_game", () => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    const result = endGame(roomId);
    if ("error" in result) { socket.emit("error", { message: result.error }); return; }
    broadcastState(roomId);
    io.to(roomId).emit("game_ended", {});
  });

  socket.on("chat_message", ({ message }: { message: string }) => {
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    const state = getRoom(roomId);
    const player = state?.players.find((p) => p.id === socket.id);
    const spec = state?.spectators.find((s) => s.id === socket.id);
    const nickname = player?.nickname ?? spec?.nickname ?? "Anonymous";
    const avatar = player?.avatar ?? spec?.avatar ?? "🎮";
    const msg = { nickname, message, time: Date.now(), avatar };
    const msgs = chatMessages.get(roomId) ?? [];
    if (msgs.length > 200) msgs.shift();
    msgs.push(msg);
    chatMessages.set(roomId, msgs);
    io.to(roomId).emit("chat_message", msg);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    const roomId = getRoomIdForSocket(socket.id);
    if (!roomId) return;
    const state = getRoom(roomId);
    if (!state) return;

    if (state.phase === "playing" || state.phase === "paused") {
      const res = markDisconnected(socket.id);
      if (res) {
        io.to(roomId).emit("player_disconnected", { playerId: socket.id });
        broadcastState(roomId);
        // If it was this player's turn, schedule bot to take over
        scheduleBotTurn(roomId);
      }
    } else {
      const result = leaveRoom(socket.id);
      if (result) {
        io.to(result.roomId).emit("player_left", { playerId: socket.id });
        broadcastState(result.roomId);
      }
    }
  });
});

function sounds_join(roomId: string, nickname: string) {
  io.to(roomId).emit("player_joined", { nickname, playerCount: 0 });
}

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
