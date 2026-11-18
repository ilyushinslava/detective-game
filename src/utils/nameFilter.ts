/**
 * nameFilter.ts — Модуль нормализации и фильтрации нецензурных и оскорбительных позывных
 *
 * Архитектура:
 * 1. Нормализация фонетического транслита (pizda -> пизда, cyka -> сука, loh -> лох).
 * 2. Нормализация визуальных гомоглифов (замена цифр и спецсимволов 0->о, @->а, 1->и).
 * 3. Корневой стемминг (поиск базовых корней во всех склонениях и производных).
 * 4. Белый список легитимных слов (защита от ложных срабатываний).
 */

// Белый список безопасных слов и корней
const SAFE_WHITELIST: RegExp[] = [
  /плох/i,        // плохой, плохо
  /рубл/i,        // рубль, рубли
  /колеб/i,       // колебаться, колебания
  /употреб/i,     // употреблять, потребление
  /истреб/i,      // истребитель, истреблять
  /оскорб/i,      // оскорблять, скорбь
  /гребл/i,       // гребля
  /скипидар/i,    // скипидар
  /страхов/i,     // страховка
  /ястреб/i,      // ястреб
  /стебл/i,       // стебель
  /тереб/i,       // теребить
  /хлеб/i,        // хлеб
  /сукно/i,       // сукно
  /суккуб/i,      // суккуб
  /сукцесс/i,     // сукцессия
  /щит/i,         // щит
];

// Английские корни обсценной лексики
const ENGLISH_PROFANITY_ROOTS: RegExp[] = [
  /fuck/i,
  /fuk/i,
  /shit/i,
  /bitch/i,
  /cunt/i,
  /dick/i,
  /asshole/i,
  /whore/i,
  /fag/i,
  /nigger/i,
  /nigga/i,
];

// Русские корни обсценной лексики и оскорблений
const RUSSIAN_PROFANITY_ROOTS: RegExp[] = [
  // 1. Оскорбление "лох", "лошок", "лохопед" (исключая "плохой", "плохо")
  /(?<!п)л[оo][хx]/i,
  /(?<!п)л[оo]ш[а-я]/i,

  // 2. Мат на "хуй" (хуй, хуевый, охуеть, нахуй, похуй, дохуя, хуи...)
  /х[уyеeё][йjяеиюев]/i,
  /х[уy]й/i,
  /х[уy]и/i,
  /х[уy]е/i,
  /х[уy]я/i,
  /х[уy]ю/i,
  /^х[уy]+$/i,
  /(?:^|[^а-я0-9])х[уy]+(?:$|[^а-я0-9])/i,

  // 3. Мат на "пизд" (пизда, пиздец, распиздяй, пиздатый...)
  /п[иiеe]зд/i,

  // 4. Мат на "еб" (ебать, ебу, долбоеб, выебон, переебать, ебок...)
  /(?:^|[^а-я0-9])(?:[а-я0-9]{0,4})?[еeё]б(?:[аaеeлlуuыyтtиiвvнnщsоoкk])/i,
  /долбо[еeё]б/i,
  /[еeё]б[аaеeиiоoуuыyлl]/i,

  // 5. Мат на "бля" (блядь, блядина, блять, бляха...)
  /бл[яy](?:[дтd]|х[аa])/i,
  /(?:^|[^а-я0-9])бл[яy](?:$|[^а-я0-9])/i,

  // 6. Оскорбления "сука", "сучара", "сучий"
  /с[уu][кk][аaеeиiоoуu]/i,
  /с[уu][чk]ар/i,
  /с[уu][чk]и[йяе]/i,

  // 7. Оскорбления: "мудак", "мудила", "мудозвон"
  /м[уu]д[аaиi][кkлl]/i,

  // 8. Оскорбления ориентации ("пидор", "пидорас", "педик")
  /п[иi]д[аoоeе][рr]/i,
  /п[еe]д[иi][кk]/i,

  // 9. Оскорбления: "говно", "говнюк"
  /г[оo]в[нn][оoяeе]/i,

  // 10. Оскорбления: "чмо", "чмошник"
  /(?:^|[^а-я0-9])чм[оo]/i,

  // 11. Оскорбления: "шлюха", "шалава"
  /шл[юu][хx]/i,
  /шал[аa]в/i,
];

/**
 * Очищает строку от знаков препинания и схлопывает повторяющиеся буквы.
 */
function cleanSeparatorsAndDeduplicate(text: string): string {
  const stripped = text.replace(/[\s\.\-_,\*\/\\\|~`!@#\$%\^&\(\)\+=\[\]\{\}0-9]+/g, '');
  return stripped.replace(/(.)\1+/g, '$1');
}

/**
 * Преобразует фонетический транслит и гомоглифы в кириллицу.
 */
export function transliterateToCyrillic(raw: string): string {
  if (!raw) return '';
  let text = raw.toLowerCase().trim();

  // Замена цифр и спецсимволов на базовые буквы
  text = text
    .replace(/0/g, 'о')
    .replace(/1/g, 'и')
    .replace(/3/g, 'з')
    .replace(/4/g, 'ч')
    .replace(/5/g, 'с')
    .replace(/6/g, 'б')
    .replace(/8/g, 'в')
    .replace(/@/g, 'а')
    .replace(/\$/g, 'с');

  // Фонетические многобуквенные сочетания
  text = text
    .replace(/shch/g, 'щ')
    .replace(/sh/g, 'ш')
    .replace(/ch/g, 'ч')
    .replace(/zh/g, 'ж')
    .replace(/yo/g, 'ё')
    .replace(/yu/g, 'ю')
    .replace(/ya/g, 'я');

  // Фонетическая замена одиночных латинских букв
  const charMap: Record<string, string> = {
    a: 'а', b: 'б', v: 'в', w: 'в', g: 'г', d: 'д', e: 'е', z: 'з',
    i: 'и', j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п',
    r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', x: 'х', y: 'у', c: 'с'
  };

  let result = '';
  for (const ch of text) {
    result += charMap[ch] || ch;
  }

  return cleanSeparatorsAndDeduplicate(result);
}

/**
 * Нормализует английскую строку без разделителей и сжатыми буквами.
 */
export function normalizeEnglishWord(raw: string): string {
  if (!raw) return '';
  const lower = raw.toLowerCase().trim();
  const stripped = lower.replace(/[\s\.\-_,\*\/\\\|~`!@#\$%\^&\(\)\+=\[\]\{\}0-9]+/g, '');
  return stripped.replace(/(.)\1+/g, '$1');
}

/**
 * Проверяет позывной игрока на корректность и цензуру.
 */
export function validatePlayerName(name: string): { isValid: boolean; error?: string } {
  const trimmed = (name || '').trim();

  if (!trimmed) {
    return { isValid: false, error: 'Позывной не может быть пустым' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Минимум 2 символа' };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: 'Максимум 20 символов' };
  }

  // 1. Проверка на белый список (до любых преобразований)
  for (const safePattern of SAFE_WHITELIST) {
    if (safePattern.test(trimmed)) {
      return { isValid: true };
    }
  }

  // 2. Проверка английской ненормативной лексики
  const englishNormalized = normalizeEnglishWord(trimmed);
  for (const pattern of ENGLISH_PROFANITY_ROOTS) {
    if (pattern.test(trimmed) || pattern.test(englishNormalized)) {
      return {
        isValid: false,
        error: 'Позывной содержит недопустимые слова. Пожалуйста, выберите другое имя.',
      };
    }
  }

  // 3. Проверка русской ненормативной лексики с транслитерацией гомоглифов и фонетики
  const cyrillicNormalized = transliterateToCyrillic(trimmed);

  // Проверяем нормализованный вариант на белый список
  for (const safePattern of SAFE_WHITELIST) {
    if (safePattern.test(cyrillicNormalized)) {
      return { isValid: true };
    }
  }

  for (const pattern of RUSSIAN_PROFANITY_ROOTS) {
    if (pattern.test(trimmed) || pattern.test(cyrillicNormalized)) {
      return {
        isValid: false,
        error: 'Позывной содержит недопустимые слова. Пожалуйста, выберите другое имя.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Санитизирует имя игрока: если имя не проходит цензуру, заменяет его на безопасное значение.
 */
export function sanitizePlayerName(name: string, fallback = 'Агент'): string {
  const check = validatePlayerName(name);
  if (!check.isValid) {
    return fallback;
  }
  // Защита от XSS и инъекций разметки
  return name.replace(/[<>'"&]/g, '').trim().slice(0, 20);
}
