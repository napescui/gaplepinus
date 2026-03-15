import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import LobbyPage from "./pages/LobbyPage";
import WaitingRoom from "./pages/WaitingRoom";
import GamePage from "./pages/GamePage";
import ShuffleDealAnimation from "./components/ShuffleDealAnimation";
import { GameState, ChatMessage, RoundOverData, Tile } from "./lib/gameTypes";
import { Profile } from "./lib/profile";
import { sounds } from "./lib/sounds";

type AppPhase = "lobby" | "waiting" | "animating" | "game" | "kicked";

const SOCKET_URL = `${window.location.protocol}//${window.location.host}`;

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("lobby");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [myId, setMyId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [roundOverData, setRoundOverData] = useState<RoundOverData | null>(null);
  const [error, setError] = useState<string>("");
  const [kickReason, setKickReason] = useState<string>("");

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      path: "/api/socket.io",
      transports: ["websocket"],
    });
    s.on("connect", () => setMyId(s.id ?? ""));
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  // Track myId and profile in refs for use inside listeners
  const myIdRef = useRef(myId);
  const myProfileRef = useRef(myProfile);
  useEffect(() => { myIdRef.current = myId; }, [myId]);
  useEffect(() => { myProfileRef.current = myProfile; }, [myProfile]);

  useEffect(() => {
    if (!socket) return;

    function addSystemMsg(text: string) {
      const msg: ChatMessage = { nickname: "System", message: text, time: Date.now(), avatar: "🔔" };
      setChatMessages((prev) => [...prev, msg]);
    }

    socket.on("game_state", (state: GameState) => {
      setGameState(state);
      if (state.phase === "waiting") {
        setPhase((cur) => (cur === "animating" || cur === "game" ? "waiting" : cur === "lobby" ? "lobby" : "waiting"));
      }
      // Sound for your turn
      if (state.phase === "playing") {
        const cur = state.players[state.currentPlayerIndex];
        if (cur?.id === myIdRef.current) sounds.yourTurn();
      }
    });

    socket.on("game_started", ({ round }: { round: number }) => {
      if (round === 1) {
        setPhase("animating");
      } else {
        setPhase("game");
        setRoundOverData(null);
      }
    });

    socket.on("join_type", ({ type }: { type: "new_player" | "reconnect" | "spectator" }) => {
      setPhase((cur) => (cur === "lobby" ? "waiting" : cur));
      if (type === "reconnect" || type === "spectator") sounds.join();
    });

    socket.on("reconnected", () => { sounds.join(); });

    socket.on("player_reconnected", ({ nickname }: { nickname: string }) => {
      addSystemMsg(`🔄 ${nickname} kembali`);
    });

    socket.on("spectator_joined", ({ nickname }: { nickname: string }) => {
      addSystemMsg(`👁 ${nickname} menonton`);
    });

    socket.on("player_joined", ({ nickname }: { nickname: string }) => {
      sounds.join();
      addSystemMsg(`✅ ${nickname} bergabung`);
    });

    socket.on("kicked", ({ reason }: { reason: string }) => {
      sounds.kick();
      setKickReason(reason || "Kamu telah di-kick dari room");
      setPhase("kicked");
    });

    socket.on("room_exited", () => {
      setPhase("lobby");
      setGameState(null);
      setChatMessages([]);
      setRoundOverData(null);
    });

    socket.on("game_ended", () => {
      setPhase("waiting");
      setRoundOverData(null);
    });

    socket.on("chat_message", (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      if (msg.nickname !== myProfileRef.current?.nickname && msg.nickname !== "System") sounds.chat();
    });

    socket.on("chat_history", (history: ChatMessage[]) => {
      setChatMessages(history);
    });

    socket.on("round_over", (data: RoundOverData) => {
      setRoundOverData(data);
      if (data.winnerId === myIdRef.current) sounds.roundWin();
      else if (data.blocked) sounds.blocked();
      else sounds.roundLose();
    });

    socket.on("game_paused", () => { sounds.pause(); });
    socket.on("game_resumed", () => { sounds.resume(); });

    socket.on("start_requested", ({ from }: { from: string }) => {
      addSystemMsg(`📣 ${from} minta mulai game!`);
    });

    socket.on("error", ({ message }: { message: string }) => {
      setError(message);
      sounds.error();
    });

    return () => {
      socket.off("game_state");
      socket.off("game_started");
      socket.off("join_type");
      socket.off("reconnected");
      socket.off("player_reconnected");
      socket.off("spectator_joined");
      socket.off("player_joined");
      socket.off("kicked");
      socket.off("room_exited");
      socket.off("game_ended");
      socket.off("chat_message");
      socket.off("chat_history");
      socket.off("round_over");
      socket.off("game_paused");
      socket.off("game_resumed");
      socket.off("start_requested");
      socket.off("error");
    };
  }, [socket]);

  function handleJoin(rid: string, profile: Profile) {
    if (!socket) return;
    setMyProfile(profile);
    setRoomId(rid);
    socket.emit("join_room", {
      roomId: rid,
      nickname: profile.nickname,
      profileId: profile.profileId,
      avatar: profile.avatar,
    });
  }

  function handleStart() { socket?.emit("start_game"); }
  function handlePingHost() { socket?.emit("ping_host"); }
  function handleKick(targetId: string) { socket?.emit("kick_player", { targetId }); }
  function handleExit() { socket?.emit("exit_room"); }
  function handleSendChat(msg: string) { socket?.emit("chat_message", { message: msg }); }
  function handlePlayTile(tile: Tile, side: "left" | "right") { socket?.emit("play_tile", { tile, side }); }
  function handlePass() { socket?.emit("pass_turn"); }
  function handlePause() { socket?.emit("pause_game"); }
  function handleResume() { socket?.emit("resume_game"); }
  function handleEndGame() { socket?.emit("end_game"); }
  function handleAnimationDone() { setPhase("game"); }

  if (phase === "kicked") {
    return (
      <div style={{ minHeight: "100dvh", background: "#0b1628", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", padding: 24 }}>
        <div style={{ background: "rgba(15,28,50,0.98)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 18, padding: 28, maxWidth: 300, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
          <h2 style={{ color: "#f87171", margin: "0 0 8px", fontSize: 18 }}>Di-kick!</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>{kickReason}</p>
          <button
            onClick={() => { setPhase("lobby"); setGameState(null); setChatMessages([]); setKickReason(""); }}
            style={{ padding: "10px 24px", background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", borderRadius: 10, color: "#1a1a2e", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            Kembali ke Lobby
          </button>
        </div>
      </div>
    );
  }

  if (phase === "lobby") {
    return <LobbyPage onJoin={handleJoin} />;
  }

  if (phase === "animating" && gameState) {
    const myIndex = gameState.players.findIndex((p) => p.id === myId);
    return (
      <ShuffleDealAnimation
        playerCount={gameState.players.length}
        myIndex={myIndex >= 0 ? myIndex : 0}
        onDone={handleAnimationDone}
      />
    );
  }

  if (phase === "waiting" && gameState) {
    return (
      <WaitingRoom
        state={gameState}
        myId={myId}
        myNickname={myProfile?.nickname ?? ""}
        myAvatar={myProfile?.avatar ?? "🎮"}
        onStart={handleStart}
        onPingHost={handlePingHost}
        onKick={handleKick}
        onExit={handleExit}
        onSendChat={handleSendChat}
        chatMessages={chatMessages}
        roomId={roomId}
      />
    );
  }

  if (phase === "game" && gameState) {
    return (
      <GamePage
        state={gameState}
        myId={myId}
        myNickname={myProfile?.nickname ?? ""}
        chatMessages={chatMessages}
        onPlayTile={handlePlayTile}
        onPass={handlePass}
        onPause={handlePause}
        onResume={handleResume}
        onEndGame={handleEndGame}
        onSendChat={handleSendChat}
        roundOverData={roundOverData}
        error={error}
      />
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#0b1628", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🀱</div>
        <div style={{ color: "#f0c040", fontWeight: 900, fontSize: 24, letterSpacing: 3 }}>GP</div>
        <div style={{ color: "#334155", fontSize: 13, marginTop: 8 }}>Menghubungkan...</div>
      </div>
    </div>
  );
}
