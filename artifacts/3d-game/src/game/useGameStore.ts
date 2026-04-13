import { create } from "zustand";

export type GameState = "menu" | "playing" | "dancing" | "dying" | "gameover";
export type Lane = -1 | 0 | 1;
export type Powerup = "magnet" | "jetpack" | null;

interface GameStore {
  gameState: GameState;
  score: number;
  highScore: number;
  speed: number;
  speedBeforeDance: number;
  lane: Lane;
  lives: number;
  coins: number;
  watches: number;           // big watches collected this game
  powerup: Powerup;
  powerupTime: number;
  onTrain: boolean;

  startGame: () => void;
  startDying: () => void;
  endGame: () => void;
  goToMenu: () => void;
  addScore: (n: number) => void;
  addCoin: () => void;
  addWatch: () => void;
  setLane: (l: Lane) => void;
  setSpeed: (s: number) => void;
  loseLife: () => void;
  startDance: () => void;
  endDance: () => void;
  activatePowerup: (type: NonNullable<Powerup>, duration: number) => void;
  tickPowerup: (delta: number) => void;
  setOnTrain: (v: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: "menu",
  score: 0,
  highScore: 0,
  speed: 11,
  speedBeforeDance: 11,
  lane: 0,
  lives: 1,
  coins: 0,
  watches: 0,
  powerup: null,
  powerupTime: 0,
  onTrain: false,

  startGame: () =>
    set({ gameState: "playing", score: 0, speed: 11, lane: 0, lives: 1, coins: 0, watches: 0, powerup: null, powerupTime: 0, onTrain: false }),

  startDying: () => {
    const { score, highScore } = get();
    set({ gameState: "dying", highScore: Math.max(score, highScore), powerup: null, powerupTime: 0, onTrain: false });
  },

  endGame: () => set({ gameState: "gameover" }),

  goToMenu: () => set({ gameState: "menu" }),

  addScore: (n) => set((s) => ({ score: s.score + n })),

  addCoin: () => set((s) => ({ coins: s.coins + 1, score: s.score + 10 })),

  addWatch: () => set((s) => ({ watches: s.watches + 1 })),

  setLane: (lane) => set({ lane }),

  setSpeed: (speed) => set({ speed }),

  loseLife: () => {
    const { lives } = get();
    if (lives <= 1) {
      get().startDying();
    } else {
      set((s) => ({ lives: s.lives - 1 }));
    }
  },

  startDance: () => {
    const { speed } = get();
    set({ gameState: "dancing", speedBeforeDance: speed });
  },

  endDance: () => {
    const { speedBeforeDance } = get();
    set({ gameState: "playing", speed: speedBeforeDance });
  },

  activatePowerup: (type, duration) => set({ powerup: type, powerupTime: duration }),

  tickPowerup: (delta) => {
    const { powerupTime } = get();
    const next = powerupTime - delta;
    if (next <= 0) {
      set({ powerup: null, powerupTime: 0 });
    } else {
      set({ powerupTime: next });
    }
  },

  setOnTrain: (v) => set({ onTrain: v }),
}));
