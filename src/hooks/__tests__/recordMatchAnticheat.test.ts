// @vitest-environment jsdom
/**
 * P0-4: Клиентская интеграция античита record_match_result.
 *
 * Проверяет, что useProfile:
 *  1. Не доверяет клиентским isWin/mmrDelta — серверный ответ побеждает.
 *  2. Передаёт уникальный match_id (не null) и не начисляет награду повторно.
 *  3. Передаёт фактическую длительность матча (без Math.max(11, ...)).
 *  4. Синхронизирует cash из ответа RPC с локальным профилем.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { rpcMock, processedMatches } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  processedMatches: new Map<string, { is_winner: boolean; mmr_delta: number; cash_awarded: number }>(),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user" }, isCloudConnected: true }),
}));

vi.mock("../../lib/supabase", () => {
  const chain: any = {};
  ["select", "eq", "order", "limit"].forEach((method) => {
    chain[method] = () => chain;
  });
  chain.maybeSingle = async () => ({ data: null, error: null });
  chain.insert = () => Promise.resolve({ error: null });
  chain.update = () => ({ eq: () => Promise.resolve({ error: null }) });
  chain.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);

  return {
    isSupabaseConfigured: true,
    supabase: {
      rpc: (...args: any[]) => rpcMock(...args),
      from: () => chain,
    },
  };
});

import { useProfile } from "../useProfile";
import { createMatchId } from "../../utils/matchRewards";
import { safeLocalStorage } from "../../utils/storage";

describe("useProfile.recordMatchResult — античит и синхронизация награды", () => {
  beforeEach(() => {
    safeLocalStorage.clear();
    localStorage.clear();
    sessionStorage.clear();
    processedMatches.clear();
    rpcMock.mockReset();

    // Серверное зеркало: результат считается по role/winnerRole,
    // клиентские p_is_winner / p_mmr_delta игнорируются.
    rpcMock.mockImplementation(async (_fn: string, params: any) => {
      const existing = processedMatches.get(params.p_match_id);
      if (existing) {
        return {
          data: {
            ok: true,
            idempotent: true,
            match_id: params.p_match_id,
            is_winner: existing.is_winner,
            mmr_delta: 0,
            cash_awarded: 0,
            new_mmr: 1000,
            new_cash: 1500,
            duration_seconds: params.p_duration_seconds,
          },
          error: null,
        };
      }

      const isWinner = params.p_role === params.p_winner_role;
      const record = {
        is_winner: isWinner,
        mmr_delta: isWinner ? 25 : -20,
        cash_awarded: isWinner ? 100 : 25,
      };
      processedMatches.set(params.p_match_id, record);

      return {
        data: {
          ok: true,
          idempotent: false,
          match_id: params.p_match_id,
          ...record,
          new_mmr: isWinner ? 1025 : 980,
          new_cash: isWinner ? 1600 : 1525,
          duration_seconds: params.p_duration_seconds,
        },
        error: null,
      };
    });
  });

  it("не начисляет победу, если сервер определил поражение (клиентский isWin игнорируется)", async () => {
    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await result.current.recordMatchResult(true, {
        mode: "MANIAC_VS_OPERATIVE",
        role: "DETECTIVE",
        winnerRole: "KILLER", // фактически проигрыш
        durationSeconds: 120,
        mmrDelta: 9999, // попытка накрутки
        matchId: createMatchId(),
      });
    });

    const [, params] = rpcMock.mock.calls[0];
    expect(params.p_is_winner).toBe(false);
    expect(params.p_mmr_delta).toBe(-20);

    expect(result.current.profile.mmr).toBe(980);
    expect(result.current.profile.stats.wins).toBe(0);
    expect(result.current.profile.stats.losses).toBe(1);
  });

  it("не начисляет MMR/cash дважды при повторном завершении с тем же match_id", async () => {
    const { result } = renderHook(() => useProfile());
    const matchId = createMatchId();

    const details = {
      mode: "MANIAC_VS_OPERATIVE",
      role: "DETECTIVE",
      winnerRole: "DETECTIVE",
      durationSeconds: 120,
      matchId,
    };

    await act(async () => {
      await result.current.recordMatchResult(true, details);
    });

    const afterFirst = {
      mmr: result.current.profile.mmr,
      cash: result.current.profile.cash,
      matchesPlayed: result.current.profile.matchesPlayed,
    };

    await act(async () => {
      await result.current.recordMatchResult(true, details);
    });

    expect(matchId).not.toBeNull();
    expect(result.current.profile.mmr).toBe(afterFirst.mmr);
    expect(result.current.profile.cash).toBe(afterFirst.cash);
    expect(result.current.profile.matchesPlayed).toBe(1);
  });

  it("передаёт фактическую длительность матча, а не Math.max(11, ...)", async () => {
    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await result.current.recordMatchResult(true, {
        mode: "THIEF_HUNT",
        role: "DETECTIVE",
        winnerRole: "DETECTIVE",
        durationSeconds: 42,
        matchId: createMatchId(),
      });
    });

    const [, params] = rpcMock.mock.calls[0];
    expect(params.p_duration_seconds).toBe(42);
  });

  it("синхронизирует cash из ответа RPC с локальным профилем", async () => {
    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await result.current.recordMatchResult(true, {
        mode: "MANIAC_VS_OPERATIVE",
        role: "DETECTIVE",
        winnerRole: "DETECTIVE",
        durationSeconds: 120,
        matchId: createMatchId(),
      });
    });

    const [, params] = rpcMock.mock.calls[0];
    expect(params.p_match_id).not.toBeNull();
    expect(typeof params.p_match_id).toBe("string");

    // 1500 стартовых + 100 награда из ответа RPC + 150 за достижение
    expect(result.current.profile.cash).toBe(1750);
  });
});
