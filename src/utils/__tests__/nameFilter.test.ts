import { describe, it, expect } from 'vitest';
import { validatePlayerName, sanitizePlayerName, normalizeNameForCheck } from '../nameFilter';

describe('nameFilter (цензура и валидация имен)', () => {
  it('пропускает корректные и нейтральные позывные', () => {
    expect(validatePlayerName('Agent Smith').isValid).toBe(true);
    expect(validatePlayerName('Детектив Фокс').isValid).toBe(true);
    expect(validatePlayerName('Агент #777').isValid).toBe(true);
    expect(validatePlayerName('Neo').isValid).toBe(true);
  });

  it('пропускает слова из белого списка, содержащие безопасные подстроки', () => {
    expect(validatePlayerName('Плохой Детектив').isValid).toBe(true); // "плохой", не "лох"
    expect(validatePlayerName('Рубль').isValid).toBe(true); // "рубль", не "бля"
    expect(validatePlayerName('Колебание').isValid).toBe(true); // "колебание", не "еб"
    expect(validatePlayerName('Страховка').isValid).toBe(true);
    expect(validatePlayerName('Щит').isValid).toBe(true);
  });

  it('блокирует прямое оскорбление "лох" и его производные', () => {
    expect(validatePlayerName('Слава Лох').isValid).toBe(false);
    expect(validatePlayerName('лох').isValid).toBe(false);
    expect(validatePlayerName('лошок').isValid).toBe(false);
    expect(validatePlayerName('лооооох').isValid).toBe(false);
    expect(validatePlayerName('л.о.х').isValid).toBe(false);
    expect(validatePlayerName('л_о_х').isValid).toBe(false);
    expect(validatePlayerName('л0х').isValid).toBe(false); // замена о -> 0
  });

  it('блокирует обсценную лексику в различных склонениях и с транслитом', () => {
    // Хуй и производные
    expect(validatePlayerName('хуй').isValid).toBe(false);
    expect(validatePlayerName('хуевый').isValid).toBe(false);
    expect(validatePlayerName('охуеть').isValid).toBe(false);
    expect(validatePlayerName('xуй').isValid).toBe(false); // латинская x
    expect(validatePlayerName('x.y.u').isValid).toBe(false);

    // Пизда и производные
    expect(validatePlayerName('пизда').isValid).toBe(false);
    expect(validatePlayerName('пиздец').isValid).toBe(false);
    expect(validatePlayerName('pizda').isValid).toBe(false);

    // Ебать и производные
    expect(validatePlayerName('ебать').isValid).toBe(false);
    expect(validatePlayerName('долбоеб').isValid).toBe(false);
    expect(validatePlayerName('выебон').isValid).toBe(false);

    // Сука и производные
    expect(validatePlayerName('сука').isValid).toBe(false);
    expect(validatePlayerName('сучара').isValid).toBe(false);
    expect(validatePlayerName('cyka').isValid).toBe(false); // латиница
    expect(validatePlayerName('c.y.k.a').isValid).toBe(false);
  });

  it('блокирует английский мат', () => {
    expect(validatePlayerName('fuck').isValid).toBe(false);
    expect(validatePlayerName('fucker').isValid).toBe(false);
    expect(validatePlayerName('bitch').isValid).toBe(false);
    expect(validatePlayerName('b.i.t.c.h').isValid).toBe(false);
  });

  it('валидирует пустые и слишком короткие/длинные имена', () => {
    expect(validatePlayerName('').isValid).toBe(false);
    expect(validatePlayerName(' ').isValid).toBe(false);
    expect(validatePlayerName('A').isValid).toBe(false);
    expect(validatePlayerName('ОченьДлинныйПозывнойКоторыйПревышаетЛимитСимволовВСистеме').isValid).toBe(false);
  });

  it('sanitizePlayerName заменяет запрещенные имена на fallback', () => {
    expect(sanitizePlayerName('Слава Лох', 'Агент #101')).toBe('Агент #101');
    expect(sanitizePlayerName('cyka', 'Агент #555')).toBe('Агент #555');
    expect(sanitizePlayerName('Агент Спектр', 'Агент #101')).toBe('Агент Спектр');
  });
});
