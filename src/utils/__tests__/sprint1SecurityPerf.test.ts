// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { gameReducer } from "../gameReducer";
import { createInitialState } from "../gameLogic";
import GameRoomServer, { maskStateForPlayer } from "../../server/index";
import { partyService } from "../partyPeer";
import { GameBoard } from "../../components/GameBoard";
import type { GameState } from "../../types/game";

describe("Sprint 1 (P0: Security, Network & Performance)", () => {
  describe("1. Защита экшена CAPTURE_SPY и античит победы", () => {
    it("gameReducer: CAPTURE_SPY игнорируется вне режима SECRET_SERVICE (никаких изменений стейта)", () => {
      const initialState = createInitialState("MANIAC_VS_OPERATIVE", "AI", "KILLER");
      const fakeExploitAction = {
        type: "CAPTURE_SPY",
        payload: {
          targetId: initialState.board[0][0].id,
          targetCardId: initialState.board[0][0].id,
          isHit: true,
          winner: "KILLER",
        },
      };

      const nextState = gameReducer(initialState, fakeExploitAction as any);
      expect(nextState).toBe(initialState);
      expect(nextState.winner).toBeNull();
    });

    it("gameReducer: INTERROGATE игнорируется вне режима SECRET_SERVICE", () => {
      const initialState = createInitialState("MANIAC_VS_OPERATIVE", "AI", "KILLER");
      const fakeAction = {
        type: "INTERROGATE",
        payload: { targetId: initialState.board[0][0].id },
      };

      const nextState = gameReducer(initialState, fakeAction as any);
      expect(nextState).toBe(initialState);
      expect(nextState.interrogationRadar).toBeUndefined();
    });

    it("gameReducer: в режиме SECRET_SERVICE payload.winner игнорируется, победа строго по трофеям", () => {
      const initialState = createInitialState("SECRET_SERVICE", "AI", "KILLER", 2, 2, 16);
      expect(initialState.mode).toBe("SECRET_SERVICE");

      // Допустим, шпион пойман, но трофеев недостаточно для победы
      const targetCharId = initialState.spies?.[1]?.secretId;
      expect(targetCharId).toBeDefined();

      const action = {
        type: "CAPTURE_SPY",
        payload: {
          targetId: targetCharId,
          targetCardId: targetCharId,
          isHit: true,
          caughtSpyId: initialState.spies?.[1]?.id,
          attackerSpyIndex: 0,
          winner: "KILLER", // Попытка подделать мгновенную победу
        },
      };

      const nextState = gameReducer(initialState, action as any);
      // У атакующего стало 1 трофей из targetTrophies (4). Победителя быть не должно!
      expect(nextState.spies?.[0]?.trophies).toBe(1);
      expect(nextState.winner).toBeNull();
    });

    it("GameRoomServer: validateActionLogic отклоняет CAPTURE_SPY вне SECRET_SERVICE", () => {
      const room = new GameRoomServer({ id: "TEST_ROOM" } as any);
      room.state = {
        roomCode: "TEST_ROOM",
        mode: "MANIAC_VS_OPERATIVE",
        gameState: createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER"),
        players: {},
        tvDisplays: {},
      } as any;

      const result = room.validateActionLogic(
        {
          type: "CAPTURE_SPY",
          payload: { targetId: "any_id" },
        },
        null
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("INVALID_ACTION_FOR_MODE");
    });

    it("GameRoomServer: клиентский экшен SET_MATCH_POT блокируется и не меняет банк", () => {
      const room = new GameRoomServer({ id: "TEST_ROOM" } as any);
      const mockState = createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER");
      mockState.matchPot = 500;
      room.state = {
        roomCode: "TEST_ROOM",
        mode: "MANIAC_VS_OPERATIVE",
        gameState: mockState,
        players: {
          client_1: { clientId: "client_1", connectionId: "conn_1", role: "KILLER", isHost: true },
        },
        tvDisplays: {},
      } as any;

      // Пытаемся накрутить банк через onMessage
      const sender = { id: "conn_1", send: vi.fn() };
      room.onMessage(
        JSON.stringify({
          type: "DISPATCH_ACTION",
          action: {
            type: "SET_MATCH_POT",
            payload: { pot: 99999999, bet: 99999999 },
          },
        }),
        sender
      );

      // Банк не должен измениться
      expect(room.state.gameState.matchPot).toBe(500);
    });
  });

  describe("2. Полное маскирование секретов в maskStateForPlayer", () => {
    let mockState: GameState;

    beforeEach(() => {
      mockState = {
        ...createInitialState("MANIAC_VS_OPERATIVE", "ONLINE", "KILLER"),
        killerSecretId: "killer_secret_1",
        detectiveSecretId: "detective_secret_2",
        duelSecretKillerId: "duel_killer_target",
        duelSecretDetectiveId: "duel_detective_target",
        killerRoleCard: { id: "k_card" } as any,
        detectiveRoleCard: { id: "d_card" } as any,
        killerHand: ["k_card_1"],
        detectiveHand: ["d_card_1"],
        robberHand: ["loot_1", "loot_2"],
        inspectorChoices: ["choice_1", "choice_2"],
        inspectorTargetId: "target_char",
        disguisedNotification: "killer_disguised",
      };
    });

    it("Для роли DETECTIVE: маскируются killerSecretId, duelSecretKillerId, killerRoleCard, killerHand, robberHand", () => {
      const masked = maskStateForPlayer(mockState, "DETECTIVE");

      expect(masked.killerSecretId).toBeNull();
      expect((masked as any).duelSecretKillerId).toBeNull();
      expect((masked as any).killerRoleCard).toBeNull();
      expect(masked.killerHand).toEqual([]);
      expect((masked as any).robberHand).toEqual([]);
      expect(masked.disguisedNotification).toBeNull();

      // Свои поля Детектива должны оставаться видимыми
      expect(masked.detectiveSecretId).toBe("detective_secret_2");
      expect((masked as any).duelSecretDetectiveId).toBe("duel_detective_target");
      expect((masked as any).detectiveRoleCard).toEqual({ id: "d_card" });
      expect(masked.detectiveHand).toEqual(["d_card_1"]);
    });

    it("Для роли KILLER: маскируются detectiveSecretId, duelSecretDetectiveId, detectiveRoleCard, detectiveHand, inspectorChoices", () => {
      const masked = maskStateForPlayer(mockState, "KILLER");

      expect(masked.detectiveSecretId).toBeNull();
      expect((masked as any).duelSecretDetectiveId).toBeNull();
      expect((masked as any).detectiveRoleCard).toBeNull();
      expect(masked.detectiveHand).toEqual([]);
      expect((masked as any).inspectorChoices).toEqual([]);
      expect((masked as any).inspectorTargetId).toBeNull();

      // Свои поля Киллера остаются видимыми
      expect(masked.killerSecretId).toBe("killer_secret_1");
      expect((masked as any).duelSecretKillerId).toBe("duel_killer_target");
      expect((masked as any).killerRoleCard).toEqual({ id: "k_card" });
      expect(masked.killerHand).toEqual(["k_card_1"]);
      expect((masked as any).robberHand).toEqual(["loot_1", "loot_2"]);
    });

    it("Для зрителя (SPECTATOR): маскируются все секреты обеих сторон", () => {
      const masked = maskStateForPlayer(mockState, undefined);

      expect(masked.killerSecretId).toBeNull();
      expect(masked.detectiveSecretId).toBeNull();
      expect((masked as any).duelSecretKillerId).toBeNull();
      expect((masked as any).duelSecretDetectiveId).toBeNull();
      expect((masked as any).killerRoleCard).toBeNull();
      expect((masked as any).detectiveRoleCard).toBeNull();
      expect(masked.killerHand).toEqual([]);
      expect(masked.detectiveHand).toEqual([]);
      expect((masked as any).robberHand).toEqual([]);
      expect((masked as any).inspectorChoices).toEqual([]);
    });
  });

  describe("3. Устранение утечки памяти в partyService (Event Bus)", () => {
    beforeEach(() => {
      partyService.clearAllListeners();
    });

    it("subscribe регистрирует слушатель, emit доставляет событие, unsubscribe удаляет из шины", () => {
      const actionSpy = vi.fn();
      const unsubscribe = partyService.subscribe("action", actionSpy);

      expect(partyService.getListenerCount("action")).toBe(1);

      partyService.emit("action", { type: "TEST_ACTION", payload: 123 });
      expect(actionSpy).toHaveBeenCalledWith({ type: "TEST_ACTION", payload: 123 });

      // Отписываемся
      unsubscribe();
      expect(partyService.getListenerCount("action")).toBe(0);

      // После отписки вызовы emit не доходят
      partyService.emit("action", { type: "ANOTHER_ACTION" });
      expect(actionSpy).toHaveBeenCalledTimes(1);
    });

    it("Legacy геттеры/сеттеры onAction/onSyncState корректно регистрируют и отписывают обработчик", () => {
      const syncSpy = vi.fn();
      partyService.onSyncState = syncSpy;

      expect(partyService.getListenerCount("syncState")).toBe(1);

      // Вызов emit через геттер onSyncState
      partyService.onSyncState({ mode: "MANIAC_VS_OPERATIVE" }, "KILLER", "PLAYING");
      expect(syncSpy).toHaveBeenCalledWith({ mode: "MANIAC_VS_OPERATIVE" }, "KILLER", "PLAYING");

      // Сброс через null отписывает слушатель
      partyService.onSyncState = null;
      expect(partyService.getListenerCount("syncState")).toBe(0);
    });

    it("Множественные независимые подписчики не перезаписывают друг друга", () => {
      const sub1 = vi.fn();
      const sub2 = vi.fn();

      const unsub1 = partyService.subscribe("roomStatus", sub1);
      const unsub2 = partyService.subscribe("roomStatus", sub2);

      expect(partyService.getListenerCount("roomStatus")).toBe(2);

      partyService.emit("roomStatus", { status: "PLAYING" });
      expect(sub1).toHaveBeenCalledTimes(1);
      expect(sub2).toHaveBeenCalledTimes(1);

      unsub1();
      expect(partyService.getListenerCount("roomStatus")).toBe(1);

      partyService.emit("roomStatus", { status: "FINISHED" });
      expect(sub1).toHaveBeenCalledTimes(1);
      expect(sub2).toHaveBeenCalledTimes(2);

      unsub2();
      expect(partyService.getListenerCount("roomStatus")).toBe(0);
    });
  });

  describe("4. Мемоизация GameBoard (Zero Layout Shift & Perf)", () => {
    it("GameBoard обёрнут в React.memo", () => {
      expect((GameBoard as any).$$typeof).toBe(Symbol.for("react.memo"));
    });
  });
});
