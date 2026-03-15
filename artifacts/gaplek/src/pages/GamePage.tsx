import { useState, useEffect } from "react";
import { GameState, ChatMessage, RoundOverData, Tile } from "../lib/gameTypes";
import DominoTile from "../components/DominoTile";
import FloatingChat from "../components/FloatingChat";
import { sounds } from "../lib/sounds";

interface GamePageProps {
  state: GameState;
  myId: string;
  myNickname: string;
  chatMessages: ChatMessage[];
  onPlayTile: (tile: Tile, side: "left" | "right") => void;
  onPass: () => void;
  onPause: () => void;
  onResume: () => void;
  onEndGame: () => void;
  onSendChat: (msg: string) => void;
  roundOverData: RoundOverData | null;
  error: string;
}

const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"];

export default function GamePage({
  state, myId, myNickname, chatMessages,
  onPlayTile, onPass, onPause, onResume, onEndGame, onSendChat,
  roundOverData, error,
}: GamePageProps) {
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [showSideChoice, setShowSideChoice] = useState(false);
  const [showRoundOver, setShowRoundOver] = useState(false);

  const myTiles = state.myTiles ?? [];
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isMyTurn = !state.isSpectator && currentPlayer?.id === myId;
  const isPaused = state.phase === "paused";
  const pauserNickname = state.players.find((p) => p.id === state.pausedBy)?.nickname ?? "Seseorang";

  useEffect(() => {
    if (roundOverData) setShowRoundOver(true);
  }, [roundOverData]);

  function canPlayTile(tile: Tile): boolean {
    if (state.board.length === 0) return tile[0] === tile[1];
    return tile[0] === state.leftEnd || tile[1] === state.leftEnd ||
      tile[0] === state.rightEnd || tile[1] === state.rightEnd;
  }

  function canPlayAny(): boolean { return myTiles.some(canPlayTile); }

  function getPlayableSides(tile: Tile): ("left" | "right")[] {
    if (state.board.length === 0) return ["left"];
    const sides: ("left" | "right")[] = [];
    if (tile[0] === state.leftEnd || tile[1] === state.leftEnd) sides.push("left");
    if (tile[0] === state.rightEnd || tile[1] === state.rightEnd) sides.push("right");
    if (sides.length === 2 && state.leftEnd === state.rightEnd) return ["left"];
    return sides;
  }

  function handleTileClick(tile: Tile) {
    if (!isMyTurn || isPaused) return;
    if (!canPlayTile(tile)) return;
    if (selectedTile?.[0] === tile[0] && selectedTile?.[1] === tile[1]) {
      setSelectedTile(null); setShowSideChoice(false); return;
    }
    const sides = getPlayableSides(tile);
    if (sides.length === 1) {
      onPlayTile(tile, sides[0]); sounds.placeTile(); setSelectedTile(null);
    } else {
      setSelectedTile(tile); setShowSideChoice(true);
    }
  }

  function handleSideChoice(side: "left" | "right") {
    if (selectedTile) {
      onPlayTile(selectedTile, side); sounds.placeTile();
      setSelectedTile(null); setShowSideChoice(false);
    }
  }

  function handlePass() { onPass(); sounds.pass(); }

  function getStatusMsg() {
    if (state.isSpectator) return "👁 Kamu sedang menonton";
    if (state.board.length === 0) {
      if (isMyTurn) return myTiles.some(t => t[0] === t[1]) ? "🎯 Mainkan BALAK pembuka!" : "⏭ Kamu tidak punya BALAK, giliran dilewati";
      return `⏳ Menunggu ${currentPlayer?.nickname} buka dengan BALAK...`;
    }
    if (isMyTurn) return canPlayAny() ? "🎯 Giliran kamu! Pilih batu" : "❌ Tidak ada yang cocok — PASS";
    return `⏳ Giliran ${currentPlayer?.nickname}...`;
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        background: "linear-gradient(160deg,#0b1628 0%,#0f2444 60%,#0b1628 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", background: "rgba(0,0,0,0.45)", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18 }}>🀱</span>
          <div>
            <div style={{ color: "#f0c040", fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>GP</div>
            <div style={{ color: "#334155", fontSize: 9 }}>Ronde {state.round}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {state.phase === "playing" && !state.isSpectator && (
            <button onClick={() => { onPause(); sounds.pause(); }} style={btnS("amber")}>⏸ Pause</button>
          )}
          {isPaused && state.pausedBy === myId && (
            <button onClick={() => { onResume(); sounds.resume(); }} style={btnS("green")}>▶ Lanjut</button>
          )}
          <button onClick={() => { onEndGame(); sounds.gameEnd(); }} style={btnS("red")}>✕ End</button>
        </div>
      </div>

      {/* ── PAUSE BANNER ── */}
      {isPaused && (
        <div style={{ background: "rgba(245,158,11,0.15)", borderBottom: "1px solid rgba(245,158,11,0.3)", padding: "5px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 11 }}>
            ⏸ PAUSE — {state.pausedBy === myId ? "Kamu yang pause" : `Di-pause oleh ${pauserNickname}`}
          </span>
          {state.pausedBy === myId && (
            <button onClick={() => { onResume(); sounds.resume(); }} style={{ background: "#10b981", border: "none", borderRadius: 6, padding: "3px 10px", color: "white", fontSize: 10, cursor: "pointer", fontWeight: 700 }}>
              ▶ LANJUT
            </button>
          )}
        </div>
      )}

      {/* ── SPECTATOR BANNER ── */}
      {state.isSpectator && (
        <div style={{ background: "rgba(96,165,250,0.12)", borderBottom: "1px solid rgba(96,165,250,0.25)", padding: "4px 12px", flexShrink: 0 }}>
          <span style={{ color: "#60a5fa", fontSize: 11, fontWeight: 600 }}>👁 Mode Penonton — kamu sedang menonton permainan</span>
        </div>
      )}

      {/* ── PLAYERS BAR ── */}
      <div style={{ display: "flex", gap: 4, padding: "4px 8px", background: "rgba(0,0,0,0.3)", flexShrink: 0, overflowX: "auto" }}>
        {state.players.map((p, i) => {
          const isActive = state.currentPlayerIndex === i && !isPaused;
          const color = PLAYER_COLORS[i % 4];
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 7px", borderRadius: 8, background: isActive ? `${color}20` : "rgba(255,255,255,0.04)", border: isActive ? `1.5px solid ${color}` : "1.5px solid rgba(255,255,255,0.05)", flexShrink: 0, transition: "all 0.2s" }}>
              <span style={{ fontSize: 14 }}>{p.avatar || "🎮"}</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: isActive ? color : "#64748b", lineHeight: 1, maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.nickname}{p.id === myId ? "★" : ""}
                  {!p.connected && <span style={{ color: "#ef4444" }}> ●</span>}
                </div>
                <div style={{ fontSize: 8, color: "#334155" }}>{p.tileCount}🀱</div>
              </div>
              {isActive && <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, animation: "pulse 1s infinite", flexShrink: 0 }} />}
            </div>
          );
        })}
        {state.spectators.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 7px", borderRadius: 8, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)", flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "#60a5fa" }}>👁 {state.spectators.length}</span>
          </div>
        )}
      </div>

      {/* ── BOARD (WRAP / GRID) ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "8px 10px",
          background: "#071828",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          display: "flex",
          flexWrap: "wrap",
          alignContent: "flex-start",
          alignItems: "center",
          gap: 3,
        }}
      >
        {state.board.length === 0 ? (
          <div style={{ width: "100%", textAlign: "center", color: "#1e3a5f", fontSize: 13, fontWeight: 600, padding: "20px 0" }}>
            {isMyTurn ? "🎯 Kamu giliran pertama — mainkan BALAK!" : "⏳ Menunggu pemain pertama..."}
          </div>
        ) : (
          <>
            <EndBadge value={state.leftEnd} left />
            {state.board.map((tile, idx) => (
              <DominoTile key={idx} tile={tile} small horizontal />
            ))}
            <EndBadge value={state.rightEnd} />
          </>
        )}
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{ padding: "4px 10px", background: isPaused ? "rgba(245,158,11,0.08)" : isMyTurn ? "rgba(16,185,129,0.1)" : "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
        <div style={{ color: isPaused ? "#f59e0b" : isMyTurn ? "#34d399" : "#475569", fontSize: 11, fontWeight: isMyTurn ? 700 : 500 }}>
          {getStatusMsg()}
        </div>
      </div>

      {/* ── SIDE CHOICE ── */}
      {showSideChoice && selectedTile && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(7,24,40,0.97)", borderTop: "1px solid rgba(255,255,255,0.1)", padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, zIndex: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DominoTile tile={selectedTile} />
            <span style={{ color: "#94a3b8", fontSize: 12 }}>Letakkan di sisi mana?</span>
          </div>
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <button onClick={() => handleSideChoice("left")} style={sideBtn}>
              ← KIRI <div style={{ fontSize: 10, opacity: 0.7 }}>[ujung: {state.leftEnd}]</div>
            </button>
            <button onClick={() => handleSideChoice("right")} style={sideBtn}>
              KANAN → <div style={{ fontSize: 10, opacity: 0.7 }}>[ujung: {state.rightEnd}]</div>
            </button>
          </div>
          <button onClick={() => { setSelectedTile(null); setShowSideChoice(false); }} style={{ background: "none", border: "none", color: "#475569", fontSize: 11, cursor: "pointer" }}>Batal</button>
        </div>
      )}

      {/* ── MY TILES ── */}
      {!state.isSpectator && (
        <div style={{ flexShrink: 0, background: "rgba(0,0,0,0.45)", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "5px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ color: "#334155", fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>BATU KAMU ({myTiles.length})</span>
            {isMyTurn && !isPaused && (
              <button
                onClick={handlePass}
                disabled={canPlayAny()}
                style={{ background: canPlayAny() ? "rgba(255,255,255,0.03)" : "rgba(239,68,68,0.2)", border: `1px solid ${canPlayAny() ? "rgba(255,255,255,0.06)" : "rgba(239,68,68,0.4)"}`, borderRadius: 5, padding: "2px 8px", color: canPlayAny() ? "#1e293b" : "#f87171", fontSize: 10, cursor: canPlayAny() ? "not-allowed" : "pointer", fontWeight: 600 }}
              >
                PASS ⟳
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
            {myTiles.map((tile, i) => {
              const playable = isMyTurn && !isPaused && canPlayTile(tile);
              const isSelected = selectedTile?.[0] === tile[0] && selectedTile?.[1] === tile[1];
              return (
                <DominoTile key={i} tile={tile} onClick={playable ? () => handleTileClick(tile) : undefined} selected={isSelected} dimmed={isMyTurn && !isPaused && !playable} />
              );
            })}
            {myTiles.length === 0 && <div style={{ color: "#1e3a5f", fontSize: 11, padding: "8px 0" }}>Semua batu sudah dimainkan!</div>}
          </div>
        </div>
      )}

      {/* ── FLOATING CHAT ── */}
      <FloatingChat messages={chatMessages} onSend={onSendChat} myNickname={myNickname} />

      {/* ── ERROR TOAST ── */}
      {error && (
        <div style={{ position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)", background: "rgba(220,38,38,0.95)", color: "white", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, zIndex: 100, maxWidth: "90%", textAlign: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── ROUND OVER MODAL ── */}
      {showRoundOver && roundOverData && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "rgba(10,18,35,0.99)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 22, width: "100%", maxWidth: 310, textAlign: "center" }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>{roundOverData.blocked ? "🚫" : "🏆"}</div>
            <h3 style={{ color: "#f0c040", margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>
              {roundOverData.blocked ? "GAME BLOK!" : "RONDE SELESAI!"}
            </h3>
            <p style={{ color: "#475569", margin: "0 0 14px", fontSize: 12 }}>
              {roundOverData.blocked ? `Menang: ${roundOverData.winnerNickname} (pip paling kecil)` : `Menang: ${roundOverData.winnerNickname} 🎉`}
            </p>
            <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 4 }}>
              {roundOverData.players.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 10px", background: p.id === roundOverData.winnerId ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${p.id === roundOverData.winnerId ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: 8 }}>
                  <span style={{ color: p.id === roundOverData.winnerId ? "#f59e0b" : "#94a3b8", fontSize: 12, fontWeight: 600 }}>
                    {p.id === roundOverData.winnerId ? "🥇 " : ""}{p.nickname}{p.id === myId ? " (Kamu)" : ""}
                  </span>
                  <span style={{ color: "#334155", fontSize: 11 }}>{p.tileCount}🀱 · {p.pips}pip</span>
                </div>
              ))}
            </div>
            {/* Only "Selesai" — no "Ronde Baru" */}
            <button
              onClick={() => { setShowRoundOver(false); onEndGame(); sounds.gameEnd(); }}
              style={{ width: "100%", padding: 11, background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", borderRadius: 10, color: "#1a1a2e", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
            >
              SELESAI ✕
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
      `}</style>
    </div>
  );
}

function EndBadge({ value, left }: { value: number; left?: boolean }) {
  return (
    <div style={{ width: 18, height: 18, borderRadius: "50%", background: left ? "rgba(248,113,113,0.2)" : "rgba(96,165,250,0.2)", border: `1px solid ${left ? "rgba(248,113,113,0.5)" : "rgba(96,165,250,0.5)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: left ? "#f87171" : "#60a5fa", flexShrink: 0 }}>
      {value}
    </div>
  );
}

function btnS(color: "amber" | "green" | "red") {
  const c = { amber: { bg: "rgba(245,158,11,0.15)", b: "rgba(245,158,11,0.4)", t: "#f59e0b" }, green: { bg: "rgba(16,185,129,0.15)", b: "rgba(16,185,129,0.4)", t: "#34d399" }, red: { bg: "rgba(239,68,68,0.15)", b: "rgba(239,68,68,0.4)", t: "#f87171" } }[color];
  return { background: c.bg, border: `1px solid ${c.b}`, borderRadius: 6, padding: "4px 8px", color: c.t, fontSize: 10, cursor: "pointer" as const, fontWeight: 600 as const };
}

const sideBtn: React.CSSProperties = { flex: 1, padding: "10px", background: "linear-gradient(135deg,#1d4ed8,#2563eb)", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center" };
