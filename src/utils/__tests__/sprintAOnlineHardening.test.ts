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

  it("strictly distributes opposite roles and maintains valid secret assignments for Host and Guest", () => {
    // Симулируем создание игры MANIAC_VS_OPERATIVE на сервере
    const rawState = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER", 2, 3, 16);
    expect(rawState.killerSecretId).toBeTruthy();
    expect(rawState.detectiveSecretId).toBeTruthy();
    expect(rawState.killerSecretId).not.toBe(rawState.detectiveSecretId);
    expect(rawState.currentTurn).toBe("KILLER"); // Первый ход всегда делает Маньяк

    // 1. Состояние для Хоста (Маньяк)
    const hostRole = "KILLER";
    const hostState = maskStateForPlayer(rawState, hostRole, true, false, 0);
    expect(hostState.playerRole).toBe("KILLER");
    expect(hostState.killerSecretId).toBe(rawState.killerSecretId); // Своя личность видна!
    expect(hostState.detectiveSecretId).toBeNull(); // Чужая личность скрыта!
    expect(hostState.currentTurn).toBe("KILLER");

    // Для хоста (KILLER) сейчас его ход:
    const isHostTurn = hostState.currentTurn === hostState.playerRole;
    expect(isHostTurn).toBe(true);

    // 2. Состояние для Гостя (Оперативник / Детектив)
    const guestRole = "DETECTIVE";
    const guestState = maskStateForPlayer(rawState, guestRole, false, false, 1);
    expect(guestState.playerRole).toBe("DETECTIVE");
    expect(guestState.detectiveSecretId).toBe(rawState.detectiveSecretId); // Своя личность видна!
    expect(guestState.killerSecretId).toBeNull(); // Чужая личность скрыта!
    expect(guestState.detectiveHand.length).toBeGreaterThan(0); // Досье алиби доступно!

    // Для гостя (DETECTIVE) сейчас ход врага:
    const isGuestTurn = guestState.currentTurn === guestState.playerRole;
    expect(isGuestTurn).toBe(false);

    // Роли строго противоположны
    expect(hostState.playerRole).not.toBe(guestState.playerRole);
  });

  it("updates partyService.role and preserves server-assigned role", () => {
    partyService.role = null;
    expect(partyService.role).toBeNull();

    partyService.role = "KILLER";
    expect(partyService.role).toBe("KILLER");

    // Имитация сброса при disconnect
    partyService.disconnect();
    expect(partyService.role).toBeNull();
  });
});
