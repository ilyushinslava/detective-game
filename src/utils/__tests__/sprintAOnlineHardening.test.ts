import { describe, it, expect, beforeEach } from "vitest";
import { createInitialState } from "../gameLogic";
import { maskStateForPlayer } from "../../server/index";
import { partyService } from "../partyPeer";

describe("Sprint A: Online Multiplayer Hardening & Security Invariants", () => {
  it("enforces complete secret masking in SECRET_SERVICE for player snapshots", () => {
    const rawState = createInitialState("SECRET_SERVICE", "ONLINE", "KILLER", 2, 2, 16);
    expect(rawState.spies).toBeDefined();
    expect(rawState.spies!.length).toBe(2);

    const spy0Secret = rawState.spies![0].secretId;
    const spy1Secret = rawState.spies![1].secretId;
    expect(spy0Secret).toBeTruthy();
    expect(spy1Secret).toBeTruthy();

    // Маскирование для Игрока 0 (Хост)
    const hostMasked = maskStateForPlayer(rawState, "KILLER", true, false, 0);
    expect(hostMasked.spies![0].secretId).toBe(spy0Secret);
    expect(hostMasked.spies![1].secretId).toBeNull(); // Секрет соперника скрыт!
    expect(hostMasked.detectiveSecretId).toBeNull();
    expect(hostMasked.killerSecretId).toBeNull();

    // Маскирование для Игрока 1 (Гость)
    const guestMasked = maskStateForPlayer(rawState, "DETECTIVE", false, false, 1);
    expect(guestMasked.spies![0].secretId).toBeNull(); // Секрет хоста скрыт от гостя!
    expect(guestMasked.spies![1].secretId).toBe(spy1Secret);
    expect(guestMasked.detectiveSecretId).toBeNull();
    expect(guestMasked.killerSecretId).toBeNull();
  });

  it("masks all evidenceDeck and future victim IDs for participants", () => {
    const state = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER", 2, 3, 16);
    state.victimList = ["c1", "c2", "c3"];

    const masked = maskStateForPlayer(state, "DETECTIVE", false, false, 1);
    expect(masked.evidenceDeck).toEqual([]);
    // Первая жертва известна обоим, последующие скрыты
    expect(masked.victimList![0]).toBe("c1");
    expect(masked.victimList![1]).toBe("UNKNOWN");
    expect(masked.victimList![2]).toBe("UNKNOWN");
  });

  it("ensures resolveEndpoints provides valid HTTP and WS endpoints in local dev", () => {
    const endpoints = partyService.resolveEndpoints();
    expect(endpoints.wsProtocol).toMatch(/^wss?:$/);
    expect(endpoints.httpProtocol).toMatch(/^https?:$/);
    expect(endpoints.host).toBeTruthy();
  });
});
