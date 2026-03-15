import React from "react";

interface DominoTileProps {
  tile: [number, number];
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
  faceDown?: boolean;
  horizontal?: boolean;
  className?: string;
  dimmed?: boolean;
}

// Pip positions defined as [cx%, cy%] for each count (0-6)
const PIP_POSITIONS: Record<number, [number, number][]> = {
  0: [],
  1: [[50, 50]],
  2: [[25, 50], [75, 50]],
  3: [[20, 20], [50, 50], [80, 80]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

function PipCell({ count, size }: { count: number; size: number }) {
  const pipR = Math.max(2, size * 0.11);
  const positions = PIP_POSITIONS[count] ?? [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block", flexShrink: 0 }}
    >
      {positions.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={pipR * (100 / size)}
          fill="#1a1a2e"
        />
      ))}
    </svg>
  );
}

export default function DominoTile({
  tile,
  onClick,
  selected,
  small,
  faceDown,
  horizontal,
  className = "",
  dimmed = false,
}: DominoTileProps) {
  // Sizes
  const cellSize = small ? 22 : 30;
  const gap = small ? 2 : 3;
  const radius = small ? 3 : 5;
  const divColor = "#888";

  const border = selected
    ? "2px solid #f59e0b"
    : dimmed
    ? "1.5px solid #33415560"
    : "1.5px solid #4b5563";
  const bg = faceDown
    ? "linear-gradient(135deg,#1e3a8a,#1e40af)"
    : dimmed
    ? "#f5f5dc88"
    : "#fffff0";
  const shadow = selected
    ? "0 0 10px #f59e0baa, 0 2px 6px rgba(0,0,0,0.5)"
    : "0 2px 4px rgba(0,0,0,0.5)";
  const transform = selected ? "translateY(-7px) scale(1.07)" : "none";

  if (horizontal) {
    const isDoubleTile = !faceDown && tile[0] === tile[1];

    if (isDoubleTile) {
      // Doubles stand VERTICAL even when on the board
      const W = cellSize;
      const H = cellSize * 2 + gap + 2;
      return (
        <div
          onClick={onClick}
          className={className}
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            width: W,
            height: H,
            border: `2px solid ${selected ? "#f59e0b" : "#a78bfa"}`,
            borderRadius: radius,
            background: "#f5f0ff",
            boxShadow: selected
              ? "0 0 10px #f59e0baa, 0 2px 6px rgba(0,0,0,0.5)"
              : "0 0 6px rgba(167,139,250,0.4), 0 2px 4px rgba(0,0,0,0.5)",
            cursor: onClick ? "pointer" : "default",
            overflow: "hidden",
            flexShrink: 0,
            userSelect: "none",
            opacity: dimmed ? 0.5 : 1,
          }}
        >
          <div
            style={{
              width: W,
              height: cellSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: `1px solid #9061f9`,
              flexShrink: 0,
            }}
          >
            <PipCell count={tile[0]} size={cellSize - 4} />
          </div>
          <div
            style={{
              width: W,
              height: cellSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PipCell count={tile[1]} size={cellSize - 4} />
          </div>
        </div>
      );
    }

    // Non-double: render horizontal
    const W = cellSize * 2 + gap + 2;
    const H = cellSize;
    return (
      <div
        onClick={onClick}
        className={className}
        style={{
          display: "inline-flex",
          flexDirection: "row",
          alignItems: "center",
          width: W,
          height: H,
          border,
          borderRadius: radius,
          background: bg,
          boxShadow: shadow,
          cursor: onClick ? "pointer" : "default",
          overflow: "hidden",
          flexShrink: 0,
          userSelect: "none",
          opacity: dimmed ? 0.5 : 1,
        }}
      >
        {faceDown ? null : (
          <>
            <div
              style={{
                width: cellSize,
                height: H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRight: `1px solid ${divColor}`,
                flexShrink: 0,
              }}
            >
              <PipCell count={tile[0]} size={cellSize - 4} />
            </div>
            <div
              style={{
                width: cellSize,
                height: H,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PipCell count={tile[1]} size={cellSize - 4} />
            </div>
          </>
        )}
      </div>
    );
  }

  // Vertical (hand tiles)
  const W = cellSize;
  const H = cellSize * 2 + gap + 2;

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        width: W,
        height: H,
        border,
        borderRadius: radius,
        background: bg,
        boxShadow: shadow,
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
        flexShrink: 0,
        userSelect: "none",
        transition: "transform 0.12s, box-shadow 0.12s",
        transform,
        opacity: dimmed ? 0.45 : 1,
      }}
    >
      {faceDown ? null : (
        <>
          <div
            style={{
              width: W,
              height: cellSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: `1px solid ${divColor}`,
              flexShrink: 0,
            }}
          >
            <PipCell count={tile[0]} size={cellSize - 4} />
          </div>
          <div
            style={{
              width: W,
              height: cellSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PipCell count={tile[1]} size={cellSize - 4} />
          </div>
        </>
      )}
    </div>
  );
}
