import { describe, it, expect, beforeEach } from 'vitest';
import { guestRegistry } from '../guestManager';

describe('guestManager (пул и ротация номеров гостей)', () => {
  beforeEach(() => {
    guestRegistry.reset();
  });

  it('генерирует позывной в формате "Агент #[номер]" в диапазоне 100..999', () => {
    const callsign = guestRegistry.generateCallsign();
    expect(callsign).toMatch(/^Агент #\d{3,4}$/);

    const num = guestRegistry.parseNumberFromCallsign(callsign);
    expect(num).toBeGreaterThanOrEqual(100);
    expect(num).toBeLessThanOrEqual(999);
  });

  it('занимает номер и освобождает его при releaseNumber / releaseByCallsign', () => {
    const callsign = guestRegistry.generateCallsign();
    const num = guestRegistry.parseNumberFromCallsign(callsign)!;

    expect(guestRegistry.getOccupiedCount()).toBe(1);

    guestRegistry.releaseByCallsign(callsign);
    expect(guestRegistry.getOccupiedCount()).toBe(0);

    // Освобожденный номер можно занять снова
    const reclaimed = guestRegistry.claimNumber(num);
    expect(reclaimed).toBe(num);
  });

  it('избегает дублирования с уже занятыми номерами в комнате', () => {
    const busy = ['Агент #101', 'Агент #102', 103];
    const newCallsign = guestRegistry.generateCallsign(busy);
    const num = guestRegistry.parseNumberFromCallsign(newCallsign)!;

    expect([101, 102, 103]).not.toContain(num);
  });

  it('корректно парсит номер из различных форматов ("Агент #555", "Агент 777")', () => {
    expect(guestRegistry.parseNumberFromCallsign('Агент #555')).toBe(555);
    expect(guestRegistry.parseNumberFromCallsign('Агент 777')).toBe(777);
    expect(guestRegistry.parseNumberFromCallsign('Детектив Фокс')).toBeNull();
  });
});
