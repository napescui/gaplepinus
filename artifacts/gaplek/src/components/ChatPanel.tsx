import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../lib/gameTypes";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  myNickname: string;
  compact?: boolean;
}

export default function ChatPanel({ messages, onSend, myNickname, compact }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
        display: "flex",
        flexDirection: "column",
        height: compact ? 180 : "100%",
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>💬 CHAT</span>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#374151", fontSize: 11, textAlign: "center", margin: "auto" }}>
            Belum ada pesan...
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: m.nickname === myNickname ? "#f59e0b" : "#60a5fa",
                  flexShrink: 0,
                }}
              >
                {m.nickname}
              </span>
              <span style={{ fontSize: 9, color: "#374151", flexShrink: 0 }}>{formatTime(m.time)}</span>
            </div>
            <div
              style={{
                background: m.nickname === myNickname ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 12,
                color: "#e2e8f0",
                wordBreak: "break-word",
              }}
            >
              {m.message}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "6px 8px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ketik pesan..."
          maxLength={80}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            padding: "6px 8px",
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
            padding: "6px 10px",
            color: "white",
            cursor: "pointer",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
