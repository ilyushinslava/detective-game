import React, { useState } from "react";
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
      tutorialDesc?: string;
      rulebook?: string;
      rulebookDesc?: string;
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
  const [isAcademyModalOpen, setIsAcademyModalOpen] = useState(false);

  return (
    <div className="w-[62%] xl:w-[65%] flex flex-col">
      {/* Сетка главных игровых режимов (2x2) */}
      <div className="grid grid-cols-2 gap-6">
        {/* Карточка 1: Одиночные дела (PVE) */}
        <ModeCard
          variant="pve"
          title={t.menu.soloCases || "Одиночные дела"}
          badge="ДЕЛО №1 • PVE"
          description="Смертельное противостояние один на один против расчетливого ИИ-соперника в неоновом нуаре."
          actionText="НАЧАТЬ РАССЛЕДОВАНИЕ"
          icon={<Icons.Cards className="w-6 h-6 xl:w-7 xl:h-7" />}
          onClick={onSelectSolo}
        />

        {/* Карточка 2: На одном экране (PVP) */}
        <ModeCard
          variant="pvp"
          title={t.menu.localDuel || "На одном экране"}
          badge="ДЕЛО №2 • PVP"
          description="Локальная дуэль двух игроков на одном мониторе с закрытием шторки тайны личности."
          actionText="ОТКРЫТЬ ДУЭЛЬ"
          icon={<Icons.Users className="w-6 h-6 xl:w-7 xl:h-7" />}
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 xl:w-7 xl:h-7">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
          }
          onClick={onOpenTvParty}
        />

        {/* Карточка 4: Академия (Обучение и Справочник) */}
        <ModeCard
          variant="academy"
          title={t.menu.tutorial || "Академия"}
          badge="БАЗА ЗНАНИЙ • HQ"
          description="Обучающий пролог механикам манипуляции улицами и подробный справочник правил всех дел."
          actionText="МАТЕРИАЛЫ РАССЛЕДОВАНИЯ"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 xl:w-7 xl:h-7">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          }
          onClick={() => setIsAcademyModalOpen(true)}
        />
      </div>

      {/* Модальное окно выбора раздела Академии */}
      {isAcademyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-zinc-950/95 border border-amber-500/30 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">
                      {t.menu.tutorial || "Академия расследований"}
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                      Материалы и протоколы
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsAcademyModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
                >
                  <Icons.Close className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {/* Опция 1: Обучающий курс */}
                <button
                  onClick={() => {
                    setIsAcademyModalOpen(false);
                    onOpenTutorial();
                  }}
                  className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-white/10 hover:border-amber-500/50 flex items-center justify-between transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Icons.Cards className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white uppercase tracking-wide block group-hover:text-amber-300 transition-colors">
                        {t.menu.tutorial || "Интерактивный пролог"}
                      </span>
                      <span className="text-xs text-zinc-400 leading-tight">
                        {t.menu.tutorialDesc || "Обучение базовым тактикам и сдвигам поля"}
                      </span>
                    </div>
                  </div>
                  <Icons.ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-300 group-hover:translate-x-1 transition-all shrink-0" />
                </button>

                {/* Опция 2: Справочник правил */}
                {onOpenRules && (
                  <button
                    onClick={() => {
                      setIsAcademyModalOpen(false);
                      onOpenRules();
                    }}
                    className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-white/10 hover:border-blue-500/50 flex items-center justify-between transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Icons.Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white uppercase tracking-wide block group-hover:text-blue-300 transition-colors">
                          {t.menu.rulebook || "Справочник регламента"}
                        </span>
                        <span className="text-xs text-zinc-400 leading-tight">
                          {t.menu.rulebookDesc || "Полный свод правил 4-х режимов расследования"}
                        </span>
                      </div>
                    </div>
                    <Icons.ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-300 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
