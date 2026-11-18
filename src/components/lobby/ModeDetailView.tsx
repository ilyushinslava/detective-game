import React from "react";
import type { GameModeType, OpponentType, Role } from "../../types/game";
import type { GameModeCardData } from "../../constants/gameMeta";
import { GAME_MODES_META } from "../../constants/gameMeta";
import { Button } from "../ui/Button";
import { Icons } from "../ui/Icons";
import { triggerHaptic } from "../../utils/haptics";
import { soundManager } from "../../utils/audio";

export interface ModeDetailViewProps {
  modeData: GameModeCardData;
  modeBanners: Record<GameModeType, string>;
  selectedOpponent: OpponentType;
  setSelectedOpponent: (opp: OpponentType) => void;
  selectedRole: Role;
  setSelectedRole: (role: Role) => void;
  playerCount: number;
  setPlayerCount: (count: number) => void;
  onBack: () => void;
  onOpenBanner: (e: React.MouseEvent<HTMLElement>, url: string, title: string) => void;
  onStartOnline: () => void;
  onStartOffline: (effectiveCount: number, targetTrophies: number) => void;
}

interface ModeSummaryItem {
  icon: (props: { className?: string }) => JSX.Element;
  title: string;
  subtitle: string;
}

const getModeSummaryItems = (modeId: GameModeType): ModeSummaryItem[] => {
  switch (modeId) {
    case "MANIAC_VS_OPERATIVE":
      return [
        { icon: Icons.Grid, title: "25 ЖИТЕЛЕЙ", subtitle: "ПОДОЗРЕВАЕМЫЕ" },
        { icon: Icons.Target, title: "4 ЖЕРТВЫ", subtitle: "ЦЕЛЬ МАНЬЯКА" },
        { icon: Icons.RadioRadar, title: "РАДИУС 3×3", subtitle: "ЗОНА ОХОТЫ" },
      ];
    case "THIEF_HUNT":
      return [
        { icon: Icons.Grid, title: "25 КВАРТАЛОВ", subtitle: "ГОРОДСКАЯ СЕТКА" },
        { icon: Icons.Coins, title: "8 МОНЕТ", subtitle: "ЦЕЛЬ ГРАБИТЕЛЯ" },
        { icon: Icons.ShieldLock, title: "ОЦЕПЛЕНИЕ", subtitle: "БЛОК ПАТРУЛЕЙ" },
      ];
    case "SECRET_SERVICE":
      return [
        { icon: Icons.Users, title: "2–6 АГЕНТОВ", subtitle: "СПЕЦСЛУЖБЫ" },
        { icon: Icons.FileText, title: "КОМПРОМАТ", subtitle: "СБОР 4 УЛИК" },
        { icon: Icons.EyeOff, title: "ПРИКРЫТИЕ", subtitle: "ТАЙНЫЕ ЯВКИ" },
      ];
    case "LINE_UP":
      return [
        { icon: Icons.Search, title: "ДОСЬЕ 5×5", subtitle: "КАРТОТЕКА ЛИЦ" },
        { icon: Icons.HelpCircle, title: "ВОПРОСЫ", subtitle: "КАТАЛОГ УЛИК" },
        { icon: Icons.Scale, title: "ИСКЛЮЧЕНИЕ", subtitle: "ЧИСТЫЙ РАСЧЕТ" },
      ];
    default:
      return [
        { icon: Icons.Grid, title: "25 КАРТ", subtitle: "СЕТКА 5×5" },
        { icon: Icons.Target, title: "ДУЭЛЬ", subtitle: "1 НА 1" },
        { icon: Icons.Search, title: "ПОИСК", subtitle: "ДЕДУКЦИЯ" },
      ];
  }
};

export const ModeDetailView: React.FC<ModeDetailViewProps> = ({
  modeData,
  modeBanners,
  selectedOpponent,
  setSelectedOpponent,
  selectedRole,
  setSelectedRole,
  playerCount,
  setPlayerCount,
  onBack,
  onOpenBanner,
  onStartOnline,
  onStartOffline,
}) => {
  const summaryItems = getModeSummaryItems(modeData.id);
  const modeMeta = GAME_MODES_META[modeData.id];
  const bannerPath = modeBanners[modeData.id];
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const modeBannerSrc = bannerPath ? `${base}${bannerPath.startsWith("/") ? bannerPath : "/" + bannerPath}` : null;

  return (
    <div className="flex-1 flex flex-col bg-background-main overflow-hidden relative w-full h-full">
      <div className="flex items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shrink-0 border-b border-border-subtle z-10 bg-background-main relative">
        <Button variant="ghost" onClick={onBack} className="h-9 px-2 text-zinc-400 hover:text-white gap-1">
          <Icons.ChevronLeft />
          <span className="text-[10px] font-black uppercase tracking-widest">Назад</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 sm:pb-28">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 w-full max-w-xl mx-auto flex flex-col gap-4 sm:gap-4.5">
          {modeBannerSrc && (
            <div
              onClick={(e) => onOpenBanner(e, modeBannerSrc, modeData.title)}
              className="relative w-full h-[100px] sm:h-[120px] rounded-2xl overflow-hidden mb-3.5 shrink-0 border border-white/10 border-t-white/25 shadow-lg cursor-pointer group select-none bg-zinc-950"
              title="Нажмите для просмотра полного фото"
            >
              <img
                src={modeBannerSrc}
                alt={modeData.title}
                className="absolute inset-0 w-full h-full object-cover object-center opacity-80 pointer-events-none"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />

              <div className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 opacity-85 group-hover:opacity-100 transition-opacity pointer-events-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-zinc-300">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>

              <div className="absolute bottom-2.5 left-3.5 right-3.5 z-10 flex items-end pointer-events-none">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {modeData.title}
                </h3>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
              СВОДКА РАССЛЕДОВАНИЯ
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
              {summaryItems.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={idx}
                    className="neo-card rounded-2xl p-2.5 sm:p-3 flex flex-col items-center text-center justify-between min-h-[92px] sm:min-h-[96px]"
                  >
                    <ItemIcon className="w-5 h-5 text-zinc-300" />
                    <span className="text-xs sm:text-sm font-black font-mono text-zinc-100 tracking-wider mt-1.5">
                      {item.title}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-tight mt-0.5">
                      {item.subtitle}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
              Формат партии
            </h3>
            <div className="neo-card p-1 rounded-xl flex gap-1 w-full">
              {(["AI", "PVP", "ONLINE"] as OpponentType[]).map((opp) => {
                const isSelected = selectedOpponent === opp;
                return (
                  <button
                    key={opp}
                    onClick={() => {
                      setSelectedOpponent(opp);
                      if (opp === "PVP") setPlayerCount(2);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg text-center transition-all cursor-pointer ${
                      isSelected
                        ? "text-white bg-gradient-to-b from-slate-900/90 via-zinc-950 to-black border border-white/10 border-t-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {opp === "AI" ? "Против ИИ" : opp === "PVP" ? "Локально" : "Онлайн"}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedOpponent === "AI" && modeData.id !== "SECRET_SERVICE" && (
            <div>
              <h3 className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
                Ваша роль
              </h3>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setSelectedRole("DETECTIVE")}
                  className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                    selectedRole === "DETECTIVE"
                      ? "bg-gradient-to-b from-slate-900/90 via-zinc-950 to-black border border-blue-500/30 border-t-blue-400/50 text-white shadow-[inset_0_1px_0_rgba(59,130,246,0.2),0_4px_12px_rgba(0,0,0,0.5)]"
                      : "bg-zinc-950/60 border border-white/10 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {modeData.detectiveRoleName}
                </button>
                <button
                  onClick={() => setSelectedRole("KILLER")}
                  className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                    selectedRole === "KILLER"
                      ? "bg-gradient-to-b from-rose-950/70 via-zinc-950 to-black border border-rose-500/30 border-t-rose-400/50 text-white shadow-[inset_0_1px_0_rgba(244,63,94,0.2),0_4px_12px_rgba(0,0,0,0.5)]"
                      : "bg-zinc-950/60 border border-white/10 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {modeData.killerRoleName}
                </button>
              </div>
            </div>
          )}

          {modeData.id === "SECRET_SERVICE" && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">
                  Количество агентов
                </h3>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  Сетка: {playerCount >= 5 ? "6×6 (36 карт)" : "5×5 (25 карт)"}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {[2, 3, 4, 5, 6].map((num) => {
                  const isPvpDisabled = selectedOpponent === "PVP" && num > 2;
                  const isSelected = playerCount === num && !isPvpDisabled;
                  return (
                    <button
                      key={num}
                      disabled={isPvpDisabled}
                      onClick={() => !isPvpDisabled && setPlayerCount(num)}
                      className={`w-10 h-10 rounded-xl border text-xs font-bold uppercase transition flex items-center justify-center ${
                        isSelected
                          ? "bg-zinc-800 border-white/20 text-white font-black shadow-sm cursor-pointer"
                          : isPvpDisabled
                            ? "bg-zinc-950/40 border-white/[0.04] text-zinc-700 cursor-not-allowed opacity-50"
                            : "bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 cursor-pointer"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
                <div
                  title="Сетка 7×7 (49 карт) доступна только в ТВ-режиме"
                  className="w-10 h-10 rounded-xl border border-white/[0.04] bg-zinc-950/40 text-zinc-600 flex flex-col items-center justify-center cursor-not-allowed select-none opacity-50"
                >
                  <span className="text-[10px] font-bold">7×7</span>
                  <span className="text-[7px] font-black text-red-500/80 uppercase tracking-tighter">ТВ</span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                {selectedOpponent === "AI"
                  ? `Вы против ${playerCount - 1} агентов ИИ. Цель: 4 компромата.`
                  : `Локальный матч на ${playerCount} человек. Передача устройства по кругу.`}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background-main via-background-main/95 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
        <div className="w-full max-w-xl mx-auto">
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              triggerHaptic("medium");
              soundManager.play("confirm");
              if (selectedOpponent === "ONLINE") {
                onStartOnline();
              } else {
                const effectiveCount = modeData.id === "SECRET_SERVICE" && selectedOpponent === "PVP" ? 2 : playerCount;
                const targetTrophies = modeData.id === "SECRET_SERVICE" ? (effectiveCount === 3 ? 4 : 3) : 3;
                onStartOffline(effectiveCount, targetTrophies);
              }
            }}
            className="h-12 flex items-center justify-center gap-2 text-xs sm:text-sm font-black tracking-widest uppercase cursor-pointer"
          >
            <span>НАЧАТЬ ИГРУ</span>
            <span>➔</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
