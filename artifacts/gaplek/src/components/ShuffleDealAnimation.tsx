import { useEffect, useState, useRef } from "react";
import { sounds } from "../lib/sounds";

interface Props {
  playerCount: number;
  myIndex: number;
  onDone: () => void;
}

const TILE_COUNT = 28;

// Each tile tile is represented as a face-down domino
function FaceTile({
  x,
  y,
  rotate,
  scale,
  opacity,
  transition,
}: {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
  transition: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 22,
        height: 40,
        marginLeft: -11,
        marginTop: -20,
        borderRadius: 4,
        background: "linear-gradient(135deg,#1e3a8a 0%,#1e40af 60%,#1a2e60 100%)",
        border: "1.5px solid rgba(255,255,255,0.15)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
        transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
        opacity,
        transition,
        willChange: "transform, opacity",
      }}
    >
      {/* Domino back pattern */}
      <div
        style={{
          position: "absolute",
          inset: 3,
          borderRadius: 2,
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 10, opacity: 0.3, color: "white" }}>🀱</div>
      </div>
    </div>
  );
}

type Phase = "pile" | "shuffle" | "deal" | "done";

export default function ShuffleDealAnimation({ playerCount, myIndex, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>("pile");
  const [tiles, setTiles] = useState<{ x: number; y: number; rotate: number; scale: number; opacity: number; transition: string }[]>([]);
  const [statusText, setStatusText] = useState("Menyiapkan domino...");
  const doneRef = useRef(false);

  // Initialize tiles in a pile
  useEffect(() => {
    const initial = Array.from({ length: TILE_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
      rotate: (Math.random() - 0.5) * 12,
      scale: 1,
      opacity: 1,
      transition: "none",
    }));
    setTiles(initial);

    // Start shuffle after brief pause
    const t1 = setTimeout(() => {
      setPhase("shuffle");
      setStatusText("Mengacak domino...");
    }, 300);

    return () => clearTimeout(t1);
  }, []);

  // Shuffle phase: scatter tiles then re-pile
  useEffect(() => {
    if (phase !== "shuffle") return;

    const shuffleRounds = 3;
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    function doShuffle(round: number) {
      if (round >= shuffleRounds) {
        // Compact pile back
        setTiles((prev) =>
          prev.map((_, i) => ({
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10,
            rotate: (Math.random() - 0.5) * 15,
            scale: 1,
            opacity: 1,
            transition: "transform 0.35s ease",
          }))
        );
        const t = setTimeout(() => setPhase("deal"), 600);
        timeouts.push(t);
        return;
      }
      // Scatter
      sounds.shuffleTile();
      setTiles((prev) =>
        prev.map((_, i) => {
          const angle = (i / TILE_COUNT) * Math.PI * 2 + Math.random() * 0.8;
          const radius = 55 + Math.random() * 45;
          return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * 0.55,
            rotate: Math.random() * 360,
            scale: 0.9,
            opacity: 1,
            transition: `transform ${0.3 + Math.random() * 0.15}s ease`,
          };
        })
      );
      const t = setTimeout(() => {
        // Gather back to pile
        sounds.shuffleTile();
        setTiles((prev) =>
          prev.map(() => ({
            x: (Math.random() - 0.5) * 12,
            y: (Math.random() - 0.5) * 12,
            rotate: (Math.random() - 0.5) * 20,
            scale: 1,
            opacity: 1,
            transition: "transform 0.3s ease",
          }))
        );
        const t2 = setTimeout(() => doShuffle(round + 1), 380);
        timeouts.push(t2);
      }, 400);
      timeouts.push(t);
    }

    doShuffle(0);

    return () => timeouts.forEach(clearTimeout);
  }, [phase]);

  // Deal phase: deal tiles to each player corner one by one
  useEffect(() => {
    if (phase !== "deal") return;
    setStatusText("Membagikan batu...");

    // Destination directions for each player seat (relative to center)
    // Player positions: bottom=myIndex, then clockwise
    const seatOffsets = [
      { x: 0, y: 160 },   // bottom (me)
      { x: -180, y: 0 },  // left
      { x: 0, y: -160 },  // top
      { x: 180, y: 0 },   // right
    ];

    // Compute final seats based on myIndex
    function seatFor(absolutePlayerIdx: number) {
      const rel = (absolutePlayerIdx - myIndex + playerCount) % playerCount;
      return seatOffsets[rel] ?? seatOffsets[0];
    }

    // Tiles per player
    const perPlayer = playerCount === 2 ? 14 : playerCount === 3 ? 9 : 7;

    let timeouts: ReturnType<typeof setTimeout>[] = [];
    let tileIdx = 0;
    const newTiles = [...tiles];

    function dealNext(dealCount: number) {
      if (dealCount >= perPlayer * playerCount) {
        // All dealt — fade out remaining (hidden tiles)
        setTiles((prev) =>
          prev.map((t, i) =>
            i >= perPlayer * playerCount
              ? { ...t, opacity: 0, scale: 0.5, transition: "all 0.4s ease" }
              : t
          )
        );
        const t = setTimeout(() => {
          setStatusText("Siap bermain!");
          const t2 = setTimeout(() => {
            if (!doneRef.current) {
              doneRef.current = true;
              onDone();
            }
          }, 600);
          timeouts.push(t2);
        }, 500);
        timeouts.push(t);
        return;
      }

      const playerIdx = dealCount % playerCount;
      const seat = seatFor(playerIdx);

      sounds.dealCard();

      setTiles((prev) => {
        const next = [...prev];
        if (next[dealCount]) {
          next[dealCount] = {
            ...next[dealCount],
            x: seat.x + (Math.random() - 0.5) * 18,
            y: seat.y + (Math.random() - 0.5) * 12,
            rotate: (Math.random() - 0.5) * 25,
            scale: 0.75,
            opacity: 0.85,
            transition: `transform 0.18s cubic-bezier(.2,.8,.4,1), opacity 0.18s`,
          };
        }
        return next;
      });

      const delay = playerCount === 2 ? 75 : 65;
      const t = setTimeout(() => dealNext(dealCount + 1), delay);
      timeouts.push(t);
    }

    dealNext(0);

    return () => timeouts.forEach(clearTimeout);
  }, [phase]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse at center, #0f2a10 0%, #081208 60%, #050b05 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        overflow: "hidden",
      }}
    >
      {/* Table felt texture hint */}
      <div
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(20,60,20,0.5) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Tiles container */}
      <div
        style={{
          position: "relative",
          width: 1,
          height: 1,
        }}
      >
        {tiles.map((t, i) => (
          <FaceTile
            key={i}
            x={t.x}
            y={t.y}
            rotate={t.rotate}
            scale={t.scale}
            opacity={t.opacity}
            transition={t.transition}
          />
        ))}
      </div>

      {/* Status text */}
      <div
        style={{
          position: "absolute",
          bottom: "18%",
          color: "#94a3b8",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 0.5,
          fontFamily: "'Segoe UI', sans-serif",
          transition: "opacity 0.3s",
        }}
      >
        {statusText}
      </div>

      {/* Phase dots */}
      <div
        style={{
          position: "absolute",
          bottom: "13%",
          display: "flex",
          gap: 6,
        }}
      >
        {["pile", "shuffle", "deal"].map((p) => (
          <div
            key={p}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: phase === p ? "#60a5fa" : "rgba(255,255,255,0.2)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
