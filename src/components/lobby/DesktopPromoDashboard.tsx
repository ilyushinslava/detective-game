import React from 'react';

export interface DesktopPromoDashboardProps {
  onOpenRules?: () => void;
}

const ICONS = {
  Grid: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-blue-400">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Mask: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-purple-400">
      <path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7H2v5z" />
      <circle cx="8" cy="11" r="1.5" fill="currentColor" />
      <circle cx="16" cy="11" r="1.5" fill="currentColor" />
    </svg>
  ),
  Server: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-emerald-400">
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
      <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
    </svg>
  ),
  Tv: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-amber-400">
      <rect x="2" y="7" width="20" height="15" rx="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  ),
  Rules: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
};

const MODE_CARDS = [
  {
    id: 'MANIAC',
    badge: 'Асимметрия',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-500/40',
    title: 'Маньяк против Сыщика',
    desc: 'Убийца ликвидирует жертв по диагоналям и заметает следы. Оперативник идёт по следу улик и отсекает невиновных.',
    tag: '1v1 • Тактика',
  },
  {
    id: 'THIEF',
    badge: 'Облава',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
    title: 'Полицейская облава',
    desc: 'Вор скрытно грабит горожан на перекрёстках. Полиция стягивает патрули, блокирует улицы и готовит арест.',
    tag: '1v1 • Кошки-мышки',
  },
  {
    id: 'SPY',
    badge: 'Шпионаж',
    badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-500/40',
    title: 'Война спецслужб',
    desc: 'Тайные резиденты под прикрытием ведут охоту за секретными информаторами среди уличной толпы.',
    tag: '1v1 / 2v2 • Блеф',
  },
  {
    id: 'LINE_UP',
    badge: 'Дедукция',
    badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-500/40',
    title: 'Очная дуэль',
    desc: 'Психологический допрос. Задавайте тактические вопросы из картотеки, анализируйте ответы и выносите вердикт.',
    tag: 'Быстрая дуэль',
  },
];

export const DesktopPromoDashboard: React.FC<DesktopPromoDashboardProps> = ({ onOpenRules }) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 xl:p-8 2xl:p-10 overflow-y-auto custom-scrollbar bg-[#05070a]">
      {/* Фоновый атмосферный арт с виньетированием */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/splash-bg-PC.webp"
          alt="Prime Suspect Background"
          className="w-full h-full object-cover opacity-25 scale-105 filter contrast-125 brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070a]/90 via-transparent to-[#05070a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_50%)]" />
      </div>

      {/* Верхний брендовый блок */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-[10px] xl:text-[11px] font-mono font-bold tracking-widest text-blue-300 uppercase shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span>CYBERPUNK DETECTIVE BOARD STRATEGY • СЕЗОН 2026</span>
        </div>

        <h1 className="font-display font-black text-4xl xl:text-5xl 2xl:text-6xl tracking-wider text-white uppercase mt-4 mb-1 drop-shadow-md">
          ПОД ПОДОЗРЕНИЕМ
        </h1>
        <div className="text-xs xl:text-sm font-mono tracking-[0.35em] uppercase text-zinc-400 font-bold">
          PRIME SUSPECT • WICKED CITY
        </div>

        <p className="text-sm xl:text-base text-zinc-300 font-sans mt-3 max-w-xl leading-relaxed">
          Тактическая стратегия разума в неоновом мегаполисе. Манипулируй улицами через маневр поля, скрывай свою тайную личность среди 25 персонажей и вычисли противника прежде, чем за тобой захлопнется ловушка.
        </p>

        {/* 3 тактических столпа игры */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="p-3 xl:p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1.5">
              <ICONS.Grid />
              <span className="text-[11px] xl:text-xs font-display font-bold uppercase tracking-wider text-zinc-200">
                Маневр поля
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Тороидальный сдвиг строк и столбцов изменяет городскую сетку 5×5 и дистанции контакта.
            </p>
          </div>

          <div className="p-3 xl:p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1.5">
              <ICONS.Mask />
              <span className="text-[11px] xl:text-xs font-display font-bold uppercase tracking-wider text-zinc-200">
                Тайная роль
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Твоя личность спрятана среди толпы. Одно неверное движение — и алиби разрушено.
            </p>
          </div>

          <div className="p-3 xl:p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-1.5">
              <ICONS.Server />
              <span className="text-[11px] xl:text-xs font-display font-bold uppercase tracking-wider text-zinc-200">
                Authoritative Net
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Строгая серверная валидация, античит и маскирование секретов для честных матчей.
            </p>
          </div>
        </div>
      </div>

      {/* Центральный блок: Карточки 4 игровых режимов */}
      <div className="relative z-10 my-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-display font-bold uppercase tracking-widest text-zinc-400">
            Игровые режимы расследования
          </span>
          {onOpenRules && (
            <button
              type="button"
              onClick={onOpenRules}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-blue-400 hover:text-blue-300 transition cursor-pointer"
            >
              <ICONS.Rules />
              <span>Правила игры</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MODE_CARDS.map((card) => (
            <div
              key={card.id}
              className="p-3.5 xl:p-4 rounded-2xl bg-zinc-900/50 border border-white/10 hover:border-white/20 transition backdrop-blur-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-lg border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {card.tag}
                  </span>
                </div>
                <h3 className="text-sm xl:text-base font-display font-bold uppercase tracking-wider text-white group-hover:text-blue-300 transition">
                  {card.title}
                </h3>
                <p className="text-[11px] xl:text-xs text-zinc-400 mt-1 leading-snug">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Нижний промо-блок TV Party и метаданные */}
      <div className="relative z-10 space-y-3">
        <div className="p-3.5 xl:p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-zinc-900/60 to-purple-950/30 border border-white/10 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/50 border border-amber-500/40 flex items-center justify-center shrink-0">
              <ICONS.Tv />
            </div>
            <div>
              <div className="text-xs xl:text-sm font-display font-bold uppercase tracking-wider text-white">
                Поддержка TV Party & Мобильных пультов
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Выведите поле на Smart TV, а смартфоны гостей используйте как персональные секретные контроллеры без проводов.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] xl:text-[11px] font-mono text-zinc-500 pt-1 border-t border-white/5">
          <span>v2.0 Neo-Noir Edition • Web / PWA / Android / TV</span>
          <span>© 2026 Wicked City Syndicate. Все права защищены.</span>
        </div>
      </div>
    </div>
  );
};
