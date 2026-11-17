import React from "react";
import { ModeCard } from "./ModeCard";
import { Icons } from "../ui/Icons";

export interface LobbyGridProps {
  onSelectSolo: () => void;
  onSelectLocalDuel: () => void;
  onOpenTvParty: () => void;
  onOpenTutorial: () => void;
  onOpenRules?: () => void;
  t: {
    menu: {
      soloCases?: string;
      localDuel?: string;
      tvMode?: string;
      tutorial?: string;
      rulebook?: string;
    };
  };
}

export const LobbyGrid: React.FC<LobbyGridProps> = ({
  onSelectSolo,
  onSelectLocalDuel,
  onOpenTvParty,
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
          className="h-8 px-3 rounded-xl bg-background-surface/80 hover:bg-background-panel border border-border-subtle hover:border-accent-warning/40 text-zinc-300 hover:text-white flex items-center gap-2 text-[11px] font-mono font-bold tracking-wider uppercase transition-all shadow-sm cursor-pointer group active:scale-[0.98]"
          title="Интерактивный обучающий курс"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-accent-warning shrink-0">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>{t.menu.tutorial || "Обучение"}</span>
        </button>

        {onOpenRules && (
          <button
            onClick={onOpenRules}
            className="h-8 px-3 rounded-xl bg-background-surface/80 hover:bg-background-panel border border-border-subtle hover:border-accent-primary/40 text-zinc-300 hover:text-white flex items-center gap-2 text-[11px] font-mono font-bold tracking-wider uppercase transition-all shadow-sm cursor-pointer group active:scale-[0.98]"
            title="Справочник правил"
          >
            <Icons.Shield className="w-3.5 h-3.5 text-accent-primary shrink-0" />
            <span>{t.menu.rulebook || "Справочник"}</span>
          </button>
        )}
      </div>

      {/* Сетка 3-х локальных режимов: 2 одиночных слота сверху + 1 широкий ТВ-режим снизу */}
      <div className="grid grid-cols-2 gap-4 xl:gap-5">
        {/* Карточка 1 (1 колонка): Одиночные дела (PVE) */}
        <ModeCard
          variant="pve"
          title={t.menu.soloCases || "Одиночные дела"}
          description="Смертельное противостояние один на один против расчетливого ИИ-соперника в неоновом нуаре."
          actionText="НАЧАТЬ РАССЛЕДОВАНИЕ"
          icon={<Icons.Cards className="w-5 h-5 xl:w-6 xl:h-6" />}
          onClick={onSelectSolo}
        />

        {/* Карточка 2 (1 колонка): На одном экране (PVP) - в синем стиле PVE */}
        <ModeCard
          variant="pvp"
          title={t.menu.localDuel || "На одном экране"}
          description="Локальная дуэль двух игроков на одном мониторе с закрытием шторки тайны личности."
          actionText="ОТКРЫТЬ ДУЭЛЬ"
          icon={<Icons.Users className="w-5 h-5 xl:w-6 xl:h-6" />}
          onClick={onSelectLocalDuel}
        />

        {/* Карточка 3 (2 колонки - широкий формат): ТВ Режим (TV PARTY) */}
        <ModeCard
          wide
          variant="tv"
          title={t.menu.tvMode || "ТВ РЕЖИМ"}
          description="Большой дисплей телевизора как общее игровое поле расследования и персональные мобильные контроллеры игроков для компании."
          actionText="ПОДКЛЮЧИТЬ ТВ ПАРТИЮ"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 xl:w-6 xl:h-6">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
          }
          onClick={onOpenTvParty}
        />
      </div>
    </div>
  );
};
