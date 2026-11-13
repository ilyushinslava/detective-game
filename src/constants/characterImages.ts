/**
 * src/constants/characterImages.ts
 * Модуль констант для маппинга изображений персонажей.
 * Заменяет тяжеловесную блокирующую eager-загрузку в App.tsx на отложенный маппинг по требованию.
 */

/**
 * Получить URL портрета персонажа по его идентификатору (например, 'c1', 'c15').
 */
export const getCharacterPortraitPath = (id: string): string => {
  try {
    return new URL(`../assets/characters/${id}.webp`, import.meta.url).href;
  } catch {
    return '';
  }
};

/**
 * Прокси-объект для полной обратной совместимости с компонентами,
 * ожидающими сигнатуру Record<string, { default: string }>.
 * Позволяет обращаться по ключам видов:
 * - characterImages['./assets/characters/c1.webp']?.default
 * - characterImages['../assets/characters/c1.webp']?.default
 * - characterImages['c1']?.default
 */
export const characterImages: Record<string, { default: string }> = new Proxy(
  {},
  {
    get: (_target, prop: string | symbol) => {
      if (typeof prop !== 'string') return undefined;
      const match = prop.match(/(?:c\d+|[a-zA-Z0-9_-]+)(?=\.webp|$)/);
      const id = match ? match[0] : prop;
      const url = getCharacterPortraitPath(id);
      return { default: url };
    },
  }
);
