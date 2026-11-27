// @vitest-environment jsdom
/**
 * P0-4: Серверный античит record_match_result (проверка mock/offline-зеркала).
 *
 * Покрывает:
 *  1. Клиентские p_is_winner / p_mmr_delta игнорируются — результат пересчитывается.
 *  2. match_id обязателен и служит ключом идемпотентности награды.
 *  3. Длительность матча валидируется и клампится (без завышения).
 *  4. Награда cash ограничена серверными рамками.
 */

import { describe, it, expect } from "vitest";
import { supabase } from "../../lib/supabase";
import {
  CASH_MAX_REWARD,
  MATCH_MIN_DURATION_SECONDS,
  MMR_ABS_MAX_DELTA,
  MMR_LOSS_DELTA,
  MMR_WIN_DELTA,
  createMatchId,
} from "../matchRewards";

const baseParams = {
  p_mode: "MANIAC_VS_OPERATIVE",
  p_winner_role: "DETECTIVE",
  p_duration_seconds: 120,
  p_role: "DETECTIVE",
};

describe("record_match_result — серверный античит (mock/offline)", () => {
  it("игнорирует клиентский p_is_winner=true при поражении и не начисляет завышенный MMR", async () => {
    const { data, error } = await supabase.rpc("record_match_result", {
      ...baseParams,
      p_winner_role: "KILLER",
      p_role: "DETECTIVE",
      // Хакер пытается выдать поражение за победу
      p_is_winner: true,
      p_mmr_delta: 9999,
      p_match_id: createMatchId(),
    } as any);

    expect(error).toBeNull();
    expect(data?.is_winner).toBe(false);
    expect(data?.mmr_delta).toBe(MMR_LOSS_DELTA);
    expect(Math.abs(data?.mmr_delta ?? 0)).toBeLessThanOrEqual(MMR_ABS_MAX_DELTA);
    expect(data?.cash_awarded).toBeGreaterThanOrEqual(0);
    expect(data?.cash_awarded).toBeLessThanOrEqual(CASH_MAX_REWARD);
  });

  it("начисляет победу по серверным правилам (+25 MMR) при корректном winnerRole", async () => {
    const { data, error } = await supabase.rpc("record_match_result", {
      ...baseParams,
      p_is_winner: true,
      p_mmr_delta: -999,
      p_match_id: createMatchId(),
    } as any);

    expect(error).toBeNull();
    expect(data?.is_winner).toBe(true);
    expect(data?.mmr_delta).toBe(MMR_WIN_DELTA);
  });

  it("требует обязательный match_id", async () => {
    const { data, error } = await supabase.rpc("record_match_result", {
      ...baseParams,
      p_is_winner: true,
      p_mmr_delta: 25,
      p_match_id: null,
    } as any);

    expect(data).toBeNull();
    expect(error).toBeDefined();
    expect(error?.code).toBe("22023");
    expect(error?.message).toMatch(/match_id/i);
  });

  it("идемпотентность: повторный match_id не начисляет MMR/cash дважды", async () => {
    const matchId = createMatchId();

    const first = await supabase.rpc("record_match_result", {
      ...baseParams,
      p_is_winner: true,
      p_mmr_delta: 25,
      p_match_id: matchId,
    } as any);

    expect(first.error).toBeNull();
    expect(first.data?.idempotent).toBe(false);
    expect(first.data?.mmr_delta).toBe(MMR_WIN_DELTA);
    expect(first.data?.cash_awarded).toBeGreaterThan(0);

    const replay = await supabase.rpc("record_match_result", {
      ...baseParams,
      p_is_winner: true,
      p_mmr_delta: 25,
      p_match_id: matchId,
    } as any);

    expect(replay.error).toBeNull();
    expect(replay.data?.idempotent).toBe(true);
    expect(replay.data?.mmr_delta).toBe(0);
    expect(replay.data?.cash_awarded).toBe(0);
  });

  it("не принимает завышенную клиентом длительность (клампится по режиму)", async () => {
    const { data, error } = await supabase.rpc("record_match_result", {
      ...baseParams,
      p_duration_seconds: 999_999,
      p_is_winner: true,
      p_match_id: createMatchId(),
    } as any);

    expect(error).toBeNull();
    expect(data?.duration_seconds).toBeLessThanOrEqual(3600);
  });

  it("отклоняет нереалистично короткую длительность (спидхак)", async () => {
    const { data, error } = await supabase.rpc("record_match_result", {
      ...baseParams,
      p_duration_seconds: 1,
      p_is_winner: true,
      p_match_id: createMatchId(),
    } as any);

    expect(data).toBeNull();
    expect(error).toBeDefined();
    expect(error?.code).toBe("P0001");
    expect(error?.message).toMatch(/длительность/i);
    expect(MATCH_MIN_DURATION_SECONDS).toBe(11);
  });
});
