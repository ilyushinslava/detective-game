import React from "react";
import { ModeCard } from "./ModeCard";
import { Icons } from "../ui/Icons";

export interface LobbyGridProps {
  onSelectSolo: () => void;
  onSelectLocalDuel: () => void;
  onOpenTvParty: () => void;
  onOpenOnline: () => void;
  onOpenTutorial: () => void;
  onOpenRules?: () => void;
  t: {
    menu: {
      soloCases?: string;
      localDuel?: string;
      tvMode?: string;
      onlineOps?: string;
      tutorial?: string;
      rulebook?: string;
    };
  };
}

export const LobbyGrid: React.FC<LobbyGridProps> = ({
  onSelectSolo,
  onSelectLocalDuel,
  onOpenTvParty,
  onOpenOnline,
  onOpenTutorial,
  onOpenRules,
  t,
}) => {
  return (
    <div className="w-[60%] xl:w-[63%] flex flex-col">
      {/* Аккуратная верхняя строка быстрых ссылок: Обучение и Справочник */}
      <div className="flex items-center gap-2.5 mb-3 shrink-0">
        <button
          onClick={onOpenTutorial}
          onPointerEnter={() => import("../TutorialScreen")}
          className="h-8 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-amber-500/40 text-zinc-300 hover:text-white flex items-center gap-2 text-[11px] font-mono font-bold tracking-wider uppercase transition-all shadow-sm cursor-pointer group active:scale-[0.98]"
          title="Интерактивный обучающий курс"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-amber-400 shrink-0">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>{t.menu.tutorial || "Обучение"}</span>
        </button>

        {onOpenRules && (
          <button
            onClick={onOpenRules}
            className="h-8 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-blue-500/40 text-zinc-300 hover:text-white flex items-center gap-2 text-[11px] font-mono font-bold tracking-wider uppercase transition-all shadow-sm cursor-pointer group active:scale-[0.98]"
            title="Справочник правил"
          >
            <Icons.Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{t.menu.rulebook || "Справочник"}</span>
          </button>
        )}
      </div>

      {/* Компактная сетка 4-х главных игровых режимов (2x2) */}
      <div className="grid grid-cols-2 gap-4 xl:gap-5">
        {/* Карточка 1: Одиночные дела (PVE) */}
        <ModeCard
          variant="pve"
          title={t.menu.soloCases || "Одиночные дела"}
          badge="ДЕЛО №1 • PVE"
          description="Смертельное противостояние один на один против расчетливого ИИ-соперника в неоновом нуаре."
          actionText="НАЧАТЬ РАССЛЕДОВАНИЕ"
          icon={<Icons.Cards className="w-5 h-5 xl:w-6 xl:h-6" />}
          onClick={onSelectSolo}
        />

        {/* Карточка 2: На одном экране (PVP) */}
        <ModeCard
          variant="pvp"
          title={t.menu.localDuel || "На одном экране"}
          badge="ДЕЛО №2 • PVP"
          description="Локальная дуэль двух игроков на одном мониторе с закрытием шторки тайны личности."
          actionText="ОТКРЫТЬ ДУЭЛЬ"
          icon={<Icons.Users className="w-5 h-5 xl:w-6 xl:h-6" />}
          onClick={onSelectLocalDuel}
        />

        {/* Карточка 3: ТВ Режим (TV PARTY) */}
        <ModeCard
          variant="tv"
          title={t.menu.tvMode || "ТВ РЕЖИМ"}
          badge="ДЕЛО №3 • TV PARTY"
          description="Большой дисплей ТВ как общее поле расследования и персональные пульты в смартфонах для компании."
          actionText="ПОДКЛЮЧИТЬ ТВ ПАРТИЮ"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 xl:w-6 xl:h-6">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
          }
          onClick={onOpenTvParty}
        />

        {/* Карточка 4: Сетевые операции (ONLINE) */}
        <ModeCard
          variant="online"
          title={t.menu.onlineOps || "Сетевые операции"}
          badge="ДЕЛО №4 • ONLINE"
          description="Оперативные столы по шифрам комнат и глобальный подбор соперников в реальном времени."
          actionText="К СЕТЕВЫМ СТОЛАМ"
          icon={<Icons.Radar className="w-5 h-5 xl:w-6 xl:h-6" />}
          onClick={onOpenOnline}
        />
      </div>
    </div>
  );
};
