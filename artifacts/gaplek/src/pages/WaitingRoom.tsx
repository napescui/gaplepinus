import { useState, useRef, useEffect } from "react";
import { GameState, ChatMessage } from "../lib/gameTypes";

interface WaitingRoomProps {
  state: GameState;
  myId: string;
  myNickname: string;
  myAvatar: string;
  onStart: () => void;
  onPingHost: () => void;
  onKick: (targetId: string) => void;
  onExit: () => void;
  onSendChat: (msg: string) => void;
  chatMessages: ChatMessage[];
  roomId: string;
}

const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"];

export default function WaitingRoom({
  state, myId, myNickname, myAvatar, onStart, onPingHost, onKick, onExit, onSendChat, chatMessages, roomId,
}: WaitingRoomProps) {
  const canStart = state.players.length >= 2;
  const isHost = state.hostId === myId;
  const [chatInput, setChatInput] = useState("");
  const [pingCooldown, setPingCooldown] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  function sendChat() {
    const msg = chatInput.trim();
    if (!msg) return;
    onSendChat(msg);
    setChatInput("");
  }

  function handlePing() {
    if (pingCooldown) return;
    onPingHost();
    setPingCooldown(true);
    setTimeout(() => setPingCooldown(false), 5000);
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        maxHeight: "100dvh",
        background: "linear-gradient(160deg,#0b1628 0%,#0f2444 60%,#0b1628 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 12px",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        gap: 10,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 360 }}>
        <div>
          <div style={{ color: "#f0c040", fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>GP</div>
          <div style={{ color: "#334155", fontSize: 9, letterSpacing: 1 }}>Gaplek Pinus</div>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}
          onClick={() => { navigator.clipboard?.writeText(roomId).catch(() => {}); }}
          title="Tap untuk salin kode"
        >
          <span style={{ color: "#f59e0b", fontSize: 13, fontWeight: 800, letterSpacing: 2 }}>{roomId}</span>
          <span style={{ fontSize: 10 }}>📋</span>
        </div>
      </div>

      {/* Room card */}
      <div
        style={{
          background: "rgba(15,28,50,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: "16px",
          width: "100%",
          maxWidth: 360,
        }}
      >
        <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
          PEMAIN ({state.players.length}/4)
        </div>

        {/* Players */}
        {state.players.map((p, i) => {
          const isMe = p.id === myId;
          const isPlayerHost = p.id === state.hostId;
          const color = PLAYER_COLORS[i % 4];
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                background: isMe ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isMe ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 10,
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 22, lineHeight: 1, width: 28, textAlign: "center" }}>{p.avatar || "🎮"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                    {p.nickname}
                  </span>
                  {isMe && <span style={{ color: "#f59e0b", fontSize: 10, fontWeight: 600 }}>(Kamu)</span>}
                  {isPlayerHost && <span style={{ fontSize: 9, background: "rgba(245,158,11,0.2)", color: "#f59e0b", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>HOST</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} />
                  <span style={{ color: "#334155", fontSize: 9 }}>Online</span>
                </div>
              </div>
              {/* Kick button (host only, not for self) */}
              {isHost && !isMe && (
                <button
                  onClick={() => onKick(p.id)}
                  style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 6, padding: "3px 7px", color: "#f87171", fontSize: 10, cursor: "pointer", fontWeight: 700, flexShrink: 0 }}
                >
                  Kick
                </button>
              )}
            </div>
          );
        })}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 4 - state.players.length) }).map((_, i) => (
          <div
            key={i}
            style={{ padding: "8px 10px", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 10, marginBottom: 6, color: "#1e3a5f", fontSize: 12, textAlign: "center" }}
          >
            Menunggu pemain...
          </div>
        ))}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={onExit}
            style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.12)", color: "#f87171", fontSize: 12, cursor: "pointer", fontWeight: 700 }}
          >
            ← Keluar
          </button>

          {isHost ? (
            canStart ? (
              <button
                onClick={onStart}
                style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#1a1a2e", fontSize: 13, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5, boxShadow: "0 4px 12px rgba(245,158,11,0.35)" }}
              >
                MULAI GAME 🎮
              </button>
            ) : (
              <div style={{ flex: 2, padding: "9px", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.1)", color: "#334155", fontSize: 12, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ⏳ Min. 2 pemain
              </div>
            )
          ) : (
            <button
              onClick={handlePing}
              disabled={pingCooldown}
              style={{ flex: 2, padding: "9px", borderRadius: 8, border: "1px solid rgba(96,165,250,0.35)", background: pingCooldown ? "rgba(255,255,255,0.04)" : "rgba(96,165,250,0.15)", color: pingCooldown ? "#334155" : "#60a5fa", fontSize: 12, cursor: pingCooldown ? "not-allowed" : "pointer", fontWeight: 700 }}
            >
              {pingCooldown ? "Sudah dikirim ✓" : "📣 Minta Host Mulai"}
            </button>
          )}
        </div>
      </div>

      {/* Chat */}
      <div
        style={{
          background: "rgba(10,18,35,0.97)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          height: 200,
        }}
      >
        <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <span style={{ color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>💬 CHAT ROOM</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {chatMessages.length === 0 && (
            <p style={{ color: "#1e3a5f", fontSize: 11, textAlign: "center", marginTop: "auto", marginBottom: "auto" }}>Belum ada pesan...</p>
          )}
          {chatMessages.map((m, i) => {
            const isMe = m.nickname === myNickname;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                <span style={{ fontSize: 13 }}>{m.avatar || "🎮"}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isMe ? "#f59e0b" : "#60a5fa" }}>{m.nickname}</span>
                    <span style={{ fontSize: 8, color: "#1e3a5f" }}>{formatTime(m.time)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#cbd5e1", wordBreak: "break-word" }}>{m.message}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: "flex", gap: 5, padding: "6px 8px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder="Pesan..."
            maxLength={80}
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "5px 8px", color: "#f1f5f9", fontSize: 12, outline: "none" }}
          />
          <button onClick={sendChat} style={{ background: "#1d4ed8", border: "none", borderRadius: 6, padding: "5px 9px", color: "white", cursor: "pointer", fontSize: 13 }}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
