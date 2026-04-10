import { useCallback, useRef } from "react";

type VoiceEvent = "coin" | "hit" | "start" | "gameover" | "milestone";

const VOICE_LINES: Record<VoiceEvent, string[]> = {
  coin: [
    "Got it!",
    "Nice!",
    "Sweet!",
    "Coins!",
    "Yeah!",
    "Money!",
  ],
  hit: [
    "Ouch!",
    "Watch out!",
    "Ugh!",
    "Not again!",
    "Noooo!",
  ],
  start: [
    "Let's go!",
    "Here we go!",
    "Ready!",
    "Time to run!",
  ],
  gameover: [
    "Game over!",
    "Try again!",
    "Better luck next time!",
    "So close!",
  ],
  milestone: [
    "Amazing!",
    "On fire!",
    "Incredible!",
    "Unstoppable!",
    "Keep going!",
  ],
};

export function useVoice() {
  const cooldownRef = useRef<Record<VoiceEvent, number>>({
    coin: 0,
    hit: 0,
    start: 0,
    gameover: 0,
    milestone: 0,
  });

  const speak = useCallback((event: VoiceEvent) => {
    if (!window.speechSynthesis) return;

    const now = Date.now();
    const cooldown = event === "coin" ? 500 : 1000;
    if (now - cooldownRef.current[event] < cooldown) return;
    cooldownRef.current[event] = now;

    const lines = VOICE_LINES[event];
    const text = lines[Math.floor(Math.random() * lines.length)];

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.2;
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang === "en-US" && v.name.toLowerCase().includes("female")
    ) || voices.find((v) => v.lang === "en-US") || voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak };
}
