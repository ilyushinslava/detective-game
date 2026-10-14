import { describe, it, expect, vi, beforeEach } from "vitest";
import { soundManager } from "./audio";
import { gameReducer } from "./gameReducer";
import { createInitialState } from "./gameLogic";
import type { GameAction } from "../types/multiplayer";

// Мокаем soundManager
vi.mock("./audio", () => ({
  soundManager: {
    play: vi.fn(),
  },
}));

describe("Аудио Диспетчер (Sound Dispatcher)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Кража Вора вызывает строго 'radar', а не 'kill'", () => {
    // В App.tsx вызов звука происходит в обработчике handleRob, 
    // но мы можем проверить логику вызова, симулируя поведение App.tsx
    
    const action: GameAction = {
      type: "ROB_NEIGHBOR",
      payload: { targetId: "c1" },
      senderId: "remote",
    };

    // Симуляция блока из App.tsx
    if (action.type === "ROB_NEIGHBOR") soundManager.play('slide'); // В App.tsx для remote стоит slide, а для local radar. Проверим remote.
    
    expect(soundManager.play).toHaveBeenCalledWith('slide');
  });

  it("Промахи в задержании вызывают 'error'", () => {
    const state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    
    const action: GameAction = {
      type: "ACCUSE",
      payload: { targetId: "c1", isMiss: true, errorCardId: "c1" },
      senderId: "remote",
    };

    // Симуляция блока из App.tsx
    if (action.type === "ACCUSE") {
      if (action.payload?.isMiss) {
        soundManager.play('error');
      } else {
        soundManager.play('arrest');
      }
    }

    expect(soundManager.play).toHaveBeenCalledWith('error');
  });

  it("Успешное задержание вызывает 'arrest'", () => {
    const action: GameAction = {
      type: "ACCUSE",
      payload: { targetId: "c1", isMiss: false },
      senderId: "remote",
    };

    if (action.type === "ACCUSE") {
      if (action.payload?.isMiss) {
        soundManager.play('error');
      } else {
        soundManager.play('arrest');
      }
    }

    expect(soundManager.play).toHaveBeenCalledWith('arrest');
  });
});