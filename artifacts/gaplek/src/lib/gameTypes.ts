export type Tile = [number, number];

export interface PlayerInfo {
  id: string;
  nickname: string;
  avatar: string;
  profileId: string;
  tileCount: number;
  connected?: boolean;
}

export interface SpectatorInfo {
  id: string;
  nickname: string;
  avatar: string;
}

export interface GameState {
  roomId: string;
  players: PlayerInfo[];
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
  myTiles: Tile[];
  round: number;
  hostId: string;
  isSpectator: boolean;
}

export interface ChatMessage {
  nickname: string;
  message: string;
  time: number;
  avatar: string;
}

export interface RoundOverData {
  winnerId: string;
  winnerNickname: string;
  blocked: boolean;
  players: { id: string; nickname: string; tileCount: number; pips: number }[];
}
