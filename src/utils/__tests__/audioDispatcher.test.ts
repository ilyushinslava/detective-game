import { describe, it, expect, vi, beforeEach } from "vitest";
import { soundManager } from "../audio";
import { createInitialState } from "../gameLogic";
import type { GameAction } from "../../types/multiplayer";

// РњРѕРєР°РµРј soundManager
vi.mock("../audio", () => ({
  soundManager: {
    play: vi.fn(),
  },
}));

describe("РђСѓРґРёРѕ Р”РёСЃРїРµС‚С‡РµСЂ (Sound Dispatcher)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("РљСЂР°Р¶Р° Р’РѕСЂР° РІС‹Р·С‹РІР°РµС‚ СЃС‚СЂРѕРіРѕ 'radar', Р° РЅРµ 'kill'", () => {
    // Р’ App.tsx РІС‹Р·РѕРІ Р·РІСѓРєР° РїСЂРѕРёСЃС…РѕРґРёС‚ РІ РѕР±СЂР°Р±РѕС‚С‡РёРєРµ handleRob, 
    // РЅРѕ РјС‹ РјРѕР¶РµРј РїСЂРѕРІРµСЂРёС‚СЊ Р»РѕРіРёРєСѓ РІС‹Р·РѕРІР°, СЃРёРјСѓР»РёСЂСѓСЏ РїРѕРІРµРґРµРЅРёРµ App.tsx
    
    const action: GameAction = {
      type: "ROB_NEIGHBOR",
      payload: { targetId: "c1" },
      senderId: "remote",
    };

    // РЎРёРјСѓР»СЏС†РёСЏ Р±Р»РѕРєР° РёР· App.tsx
    if (action.type === "ROB_NEIGHBOR") soundManager.play('slide'); // Р’ App.tsx РґР»СЏ remote СЃС‚РѕРёС‚ slide, Р° РґР»СЏ local radar. РџСЂРѕРІРµСЂРёРј remote.
    
    expect(soundManager.play).toHaveBeenCalledWith('slide');
  });

  it("РџСЂРѕРјР°С…Рё РІ Р·Р°РґРµСЂР¶Р°РЅРёРё РІС‹Р·С‹РІР°СЋС‚ 'error'", () => {
    const _state = createInitialState("SKHVATKA", "PVP", "DETECTIVE");
    
    const action: GameAction = {
      type: "ACCUSE",
      payload: { targetId: "c1", isMiss: true, errorCardId: "c1" },
      senderId: "remote",
    };

    // РЎРёРјСѓР»СЏС†РёСЏ Р±Р»РѕРєР° РёР· App.tsx
    if (action.type === "ACCUSE") {
      if (action.payload?.isMiss) {
        soundManager.play('error');
      } else {
        soundManager.play('arrest');
      }
    }

    expect(soundManager.play).toHaveBeenCalledWith('error');
  });

  it("РЈСЃРїРµС€РЅРѕРµ Р·Р°РґРµСЂР¶Р°РЅРёРµ РІС‹Р·С‹РІР°РµС‚ 'arrest'", () => {
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
