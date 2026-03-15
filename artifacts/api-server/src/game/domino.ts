export type Tile = [number, number];

export interface Player {
  id: string; // current socket id
  nickname: string;
  tiles: Tile[];
  profileId: string;
  avatar: string;
  connected: boolean;
  isBot: boolean;
}

export interface SpectatorInfo {
  id: string;
  nickname: string;
  profileId: string;
  avatar: string;
}

export interface GameState {
  roomId: string;
  players: Player[];
  spectators: SpectatorInfo[];
  board: Tile[];
  leftEnd: number;
  rightEnd: number;
  currentPlayerIndex: number;
  consecutivePasses: number;
  phase: "waiting" | "playing" | "round_end" | "paused";
  pausedBy: string | null;
  roundWinner: string | null;
  hiddenTiles: Tile[];
  round: number;
  spectatorTiles: Tile[];
  hostId: string; // socket id of the host
}

export function generateAllTiles(): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push([i, j]);
    }
  }
  return tiles;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealTiles(playerCount: number): { hands: Tile[][]; hidden: Tile[] } {
  const all = shuffle(generateAllTiles());
  let perPlayer: number;
  if (playerCount === 2) perPlayer = 14;
  else if (playerCount === 3) perPlayer = 9;
  else perPlayer = 7;

  const hands: Tile[][] = [];
  for (let i = 0; i < playerCount; i++) {
    hands.push(all.splice(0, perPlayer));
  }
  return { hands, hidden: all };
}

export function findFirstPlayer(players: Player[], round: number): { playerIndex: number; tile: Tile } {
  if (round === 1) {
    for (let d = 0; d <= 6; d++) {
      for (let i = 0; i < players.length; i++) {
        const has = players[i].tiles.some((t) => t[0] === d && t[1] === d);
        if (has) return { playerIndex: i, tile: [d, d] };
      }
    }
  }
  return { playerIndex: 0, tile: [0, 0] };
}

export function canPlay(tile: Tile, leftEnd: number, rightEnd: number): boolean {
  return tile[0] === leftEnd || tile[1] === leftEnd || tile[0] === rightEnd || tile[1] === rightEnd;
}

export function playTile(
  tile: Tile,
  side: "left" | "right",
  board: Tile[],
  leftEnd: number,
  rightEnd: number
): { board: Tile[]; leftEnd: number; rightEnd: number; valid: boolean } {
  let newLeft = leftEnd;
  let newRight = rightEnd;
  const newBoard = [...board];

  if (board.length === 0) {
    newBoard.push(tile);
    newLeft = tile[0];
    newRight = tile[1];
    return { board: newBoard, leftEnd: newLeft, rightEnd: newRight, valid: true };
  }

  if (side === "left") {
    if (tile[1] === leftEnd) {
      newBoard.unshift(tile);
      newLeft = tile[0];
    } else if (tile[0] === leftEnd) {
      newBoard.unshift([tile[1], tile[0]]);
      newLeft = tile[1];
    } else {
      return { board, leftEnd, rightEnd, valid: false };
    }
  } else {
    if (tile[0] === rightEnd) {
      newBoard.push(tile);
      newRight = tile[1];
    } else if (tile[1] === rightEnd) {
      newBoard.push([tile[1], tile[0]]);
      newRight = tile[0];
    } else {
      return { board, leftEnd, rightEnd, valid: false };
    }
  }

  return { board: newBoard, leftEnd: newLeft, rightEnd: newRight, valid: true };
}

export function getTileValue(tile: Tile): number {
  return tile[0] + tile[1];
}

export function isDouble(tile: Tile): boolean {
  return tile[0] === tile[1];
}

export function getPlayerTotalPips(tiles: Tile[]): number {
  return tiles.reduce((sum, t) => sum + getTileValue(t), 0);
}
