import { useState, useEffect } from "react";
import { AVATARS, loadProfile, saveProfile, Profile } from "../lib/profile";
import { sounds } from "../lib/sounds";

interface LobbyPageProps {
  onJoin: (roomId: string, profile: Profile) => void;
}

export default function LobbyPage({ onJoin }: LobbyPageProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setProfile(p);
    } else {
      setEditing(true); // First time: show profile setup
    }
    sounds.startLobbyAmbient();
    return () => sounds.stopLobbyAmbient();
  }, []);

  function handleSaveProfile() {
    if (!nickname.trim()) return setError("Masukkan nickname dulu ya!");
    if (nickname.trim().length > 14) return setError("Nickname max 14 karakter");
    setError("");
    const p = saveProfile(nickname.trim(), selectedAvatar);
    setProfile(p);
    setEditing(false);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return setError("Buat profil dulu!");
    if (!roomId.trim()) return setError("Masukkan kode room!");
    setError("");
    sounds.stopLobbyAmbient();
    onJoin(roomId.trim().toUpperCase(), profile);
  }

  function randomRoom() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let r = "";
    for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
    setRoomId(r);
  }

  function startEdit() {
    setNickname(profile?.nickname ?? "");
    setSelectedAvatar(profile?.avatar ?? AVATARS[0]);
    setEditing(true);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg,#0b1628 0%,#0f2444 60%,#0b1628 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 44, marginBottom: 4 }}>🀱</div>
        <div style={{ color: "#f0c040", fontWeight: 900, fontSize: 32, letterSpacing: 3, lineHeight: 1 }}>GP</div>
        <div style={{ color: "#f0c040", fontSize: 12, fontWeight: 600, letterSpacing: 2, opacity: 0.7, marginTop: 2 }}>Gaplek Pinus</div>
        <div style={{ color: "#334155", fontSize: 11, marginTop: 4 }}>Multiplayer 2–4 Pemain</div>
      </div>

      {/* Profile Setup Modal */}
      {editing && (
        <div
          style={{
            background: "rgba(15,28,50,0.98)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: "22px 20px",
            width: "100%",
            maxWidth: 340,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            marginBottom: 16,
          }}
        >
          <h3 style={{ color: "#f0c040", margin: "0 0 16px", fontSize: 16, fontWeight: 800, textAlign: "center" }}>
            {profile ? "Edit Profil" : "Buat Profil"}
          </h3>

          {/* Avatar picker */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
              PILIH AVATAR
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {AVATARS.map((av) => (
                <button
                  key={av}
                  onClick={() => setSelectedAvatar(av)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: selectedAvatar === av ? "2px solid #f59e0b" : "1.5px solid rgba(255,255,255,0.1)",
                    background: selectedAvatar === av ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
                    fontSize: 20,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.1s",
                    boxShadow: selectedAvatar === av ? "0 0 8px rgba(245,158,11,0.4)" : "none",
                  }}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              NICKNAME
            </label>
            <input
              type="text"
              placeholder="Nama kamu..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={14}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveProfile()}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1.5px solid rgba(255,255,255,0.15)",
                background: "rgba(15,23,42,0.8)",
                color: "#f1f5f9",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 8, padding: "7px 12px", color: "#fca5a5", fontSize: 12, marginBottom: 14 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {profile && (
              <button
                onClick={() => { setEditing(false); setError(""); }}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
              >
                Batal
              </button>
            )}
            <button
              onClick={handleSaveProfile}
              style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#1a1a2e", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
            >
              Simpan Profil ✓
            </button>
          </div>
        </div>
      )}

      {/* Profile Card + Join Form */}
      {!editing && profile && (
        <div
          style={{
            background: "rgba(15,28,50,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 18,
            padding: "20px",
            width: "100%",
            maxWidth: 340,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Profile display */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 12,
              marginBottom: 18,
              cursor: "pointer",
            }}
            onClick={startEdit}
          >
            <div style={{ fontSize: 32, lineHeight: 1 }}>{profile.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>{profile.nickname}</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>Ketuk untuk edit profil</div>
            </div>
            <div style={{ color: "#475569", fontSize: 14 }}>✏️</div>
          </div>

          {/* Room input */}
          <form onSubmit={handleJoin}>
            <label style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              KODE ROOM
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Contoh: ABCD"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                maxLength={8}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  background: "rgba(15,23,42,0.8)",
                  color: "#f1f5f9",
                  fontSize: 15,
                  outline: "none",
                  letterSpacing: 2,
                  fontWeight: 700,
                }}
              />
              <button
                type="button"
                onClick={randomRoom}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(100,116,139,0.2)", color: "#64748b", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                🎲 Acak
              </button>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 8, padding: "7px 12px", color: "#fca5a5", fontSize: 12, marginBottom: 14 }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#1a1a2e", fontSize: 15, fontWeight: 800, cursor: "pointer", letterSpacing: 1, boxShadow: "0 4px 12px rgba(245,158,11,0.35)" }}
            >
              MASUK ROOM 🎮
            </button>
          </form>
        </div>
      )}

      <div style={{ marginTop: 16, color: "#1e3a5f", fontSize: 11, textAlign: "center" }}>
        Bagikan kode room ke temanmu untuk main bersama
      </div>
    </div>
  );
}
