import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../lib/gameTypes";

interface FloatingChatProps {
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  myNickname: string;
}

export default function FloatingChat({ messages, onSend, myNickname }: FloatingChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const lastSeen = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      lastSeen.current = messages.length;
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } else {
      const newCount = messages.length - lastSeen.current;
      if (newCount > 0) setUnread((u) => u + newCount > 99 ? 99 : u + newCount);
    }
  }, [messages.length, open]);

  function send() {
    const msg = input.trim();
    if (!msg) return;
    onSend(msg);
    setInput("");
  }

  function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 300,
        fontFamily: "'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
    >
      {open && (
        <div
          style={{
            width: 260,
            height: 320,
            background: "rgba(10,18,35,0.97)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            animation: "slideUp 0.18s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>💬 Chat Room</span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2 }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {messages.length === 0 && (
              <p style={{ color: "#1e3a5f", fontSize: 11, textAlign: "center", marginTop: "auto", marginBottom: "auto" }}>
                Belum ada pesan
              </p>
            )}
            {messages.map((m, i) => {
              const isMe = m.nickname === myNickname;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10 }}>{m.avatar}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: isMe ? "#f59e0b" : "#60a5fa" }}>{m.nickname}</span>
                    <span style={{ fontSize: 8, color: "#334155" }}>{formatTime(m.time)}</span>
                  </div>
                  <div
                    style={{
                      background: isMe ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.07)",
                      border: `1px solid ${isMe ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: isMe ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                      padding: "4px 8px",
                      fontSize: 12,
                      color: "#e2e8f0",
                      maxWidth: "85%",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            style={{
              display: "flex",
              gap: 5,
              padding: "6px 8px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Pesan..."
              maxLength={80}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                padding: "5px 7px",
                color: "#f1f5f9",
                fontSize: 12,
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              onClick={send}
              style={{
                background: "#1d4ed8",
                border: "none",
                borderRadius: 6,
                padding: "5px 9px",
                color: "white",
                cursor: "pointer",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: open ? "#1d4ed8" : "rgba(29,78,216,0.9)",
          border: "2px solid rgba(255,255,255,0.15)",
          color: "white",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        💬
        {unread > 0 && !open && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#ef4444",
              fontSize: 9,
              fontWeight: 800,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #0b1628",
            }}
          >
            {unread}
          </div>
        )}
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
