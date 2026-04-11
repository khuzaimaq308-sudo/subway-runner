import { create } from "zustand";

export type GameState = "menu" | "playing" | "dancing" | "gameover";
export type Lane = -1 | 0 | 1;

interface GameStore {
  gameState: GameState;
  score: number;
  highScore: number;
  speed: number;
  speedBeforeDance: number;
  lane: Lane;
  lives: number;
  coins: number;

  startGame: () => void;
  endGame: () => void;
  goToMenu: () => void;
  addScore: (n: number) => void;
  addCoin: () => void;
  setLane: (l: Lane) => void;
  setSpeed: (s: number) => void;
  loseLife: () => void;
  startDance: () => void;
  endDance: () => void;
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

  startGame: () =>
    set({ gameState: "playing", score: 0, speed: 11, lane: 0, lives: 1, coins: 0 }),

  endGame: () => {
    const { score, highScore } = get();
    set({ gameState: "gameover", highScore: Math.max(score, highScore) });
  },

  goToMenu: () => set({ gameState: "menu" }),

  addScore: (n) => set((s) => ({ score: s.score + n })),

  addCoin: () => set((s) => ({ coins: s.coins + 1, score: s.score + 10 })),

  setLane: (lane) => set({ lane }),

  setSpeed: (speed) => set({ speed }),

  loseLife: () => {
    const { lives } = get();
    if (lives <= 1) {
      get().endGame();
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
}));
