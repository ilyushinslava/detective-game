/**
 * guestManager.ts — Менеджер пула и ротации номеров для гостей ("Агент #[номер]")
 *
 * Архитектура:
 * 1. Генерация случайного номера в диапазоне 100..999 (с авто-расширением до 1000..9999 при высоком онлайне).
 * 2. Реестр занятых номеров онлайн-сессий (номера освобождаются при выходе игрока или авторизации под логином).
 * 3. Разрешение коллизий одинаковых имен гостей внутри комнаты.
 */

export const MIN_GUEST_NUM = 100;
export const MAX_GUEST_NUM = 999;

class GuestNumberRegistry {
  private occupiedNumbers = new Set<number>();

  /**
   * Занимает номер гостя. Если предпочитаемый номер свободен — возвращает его,
   * иначе выбирает случайный свободный номер.
   */
  public claimNumber(preferredNumber?: number): number {
    if (
      preferredNumber &&
      preferredNumber >= MIN_GUEST_NUM &&
      !this.occupiedNumbers.has(preferredNumber)
    ) {
      this.occupiedNumbers.add(preferredNumber);
      return preferredNumber;
    }

    // Ищем случайный свободный номер в диапазоне 100..999
    const totalSlots = MAX_GUEST_NUM - MIN_GUEST_NUM + 1;
    let attempts = 0;
    while (attempts < 50) {
      const candidate = Math.floor(MIN_GUEST_NUM + Math.random() * totalSlots);
      if (!this.occupiedNumbers.has(candidate)) {
        this.occupiedNumbers.add(candidate);
        return candidate;
      }
      attempts++;
    }

    // Если все 900 слотов плотно заняты — расширяем диапазон до 4 знаков
    const extendedCandidate = Math.floor(1000 + Math.random() * 9000);
    this.occupiedNumbers.add(extendedCandidate);
    return extendedCandidate;
  }

  /**
   * Освобождает номер гостя (при дисконнекте, выходе из игры или регистрации логина).
   */
  public releaseNumber(num: number): void {
    this.occupiedNumbers.delete(num);
  }

  /**
   * Извлекает числовой номер из позывного вида "Агент #427" или "Агент 427".
   */
  public parseNumberFromCallsign(callsign: string): number | null {
    if (!callsign) return null;
    const match = callsign.match(/агент\s*#?\s*(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  /**
   * Освобождает номер по строке позывного.
   */
  public releaseByCallsign(callsign: string): void {
    const num = this.parseNumberFromCallsign(callsign);
    if (num) {
      this.releaseNumber(num);
    }
  }

  /**
   * Генерирует уникальный позывной для гостя ("Агент #[номер]").
   * Принимает опциональный массив уже занятых имен/номеров в комнате.
   */
  public generateCallsign(busyInRoom?: (string | number)[]): string {
    const roomBusySet = new Set<number>();
    if (busyInRoom && busyInRoom.length > 0) {
      for (const item of busyInRoom) {
        if (typeof item === 'number') {
          roomBusySet.add(item);
        } else if (typeof item === 'string') {
          const parsed = this.parseNumberFromCallsign(item);
          if (parsed) roomBusySet.add(parsed);
        }
      }
    }

    let selectedNumber = this.claimNumber();
    let retries = 0;
    while (roomBusySet.has(selectedNumber) && retries < 10) {
      this.releaseNumber(selectedNumber);
      selectedNumber = this.claimNumber();
      retries++;
    }

    return `Агент #${selectedNumber}`;
  }

  /**
   * Возвращает текущее количество занятых номеров.
   */
  public getOccupiedCount(): number {
    return this.occupiedNumbers.size;
  }

  /**
   * Очищает реестр (для тестов или перезапуска).
   */
  public reset(): void {
    this.occupiedNumbers.clear();
  }
}

export const guestRegistry = new GuestNumberRegistry();
