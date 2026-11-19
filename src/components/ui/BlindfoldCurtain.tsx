import React, { useEffect, useCallback } from "react";
import type { GameState, Role } from "../../types/game";
import { triggerHaptic } from "../../utils/haptics";
import { playClickSound } from "../../utils/tvAudio";
import { resolveNextPlayerInfo } from "../../utils/gameLogic";

export interface BlindfoldCurtainProps {
  isOpen?: boolean;
  isActive?: boolean;
  nextRole?: Role;
  nextPlayerName?: string;
  nextPlayerColor?: string;
  onDismiss?: () => void;
  onConfirmTakeDevice?: () => void;
  gameState?: GameState;
  zIndexClass?: string;
}

/**
 * Шторка тайны личности (Privacy Screen / Pass & Play Curtain).
 * Гарантирует сокрытие тактической информации при передаче устройства между игроками
 * в оффлайн PVP режиме в строгом стиле Neo-Noir.
 */
export const BlindfoldCurtain: React.FC<BlindfoldCurtainProps> = ({
  isOpen,
  isActive,
  nextRole,
  nextPlayerName,
  nextPlayerColor,
  onDismiss,
  onConfirmTakeDevice,
  gameState,
  zIndexClass = "z-[9999]",
}) => {
  const isVisible = Boolean(isOpen ?? isActive);
  const handleDismiss = useCallback(() => {
    try {
      triggerHaptic("success");
    } catch {}
    try {
      playClickSound();
    } catch {}

    if (onDismiss) {
      onDismiss();
    } else if (onConfirmTakeDevice) {
      onConfirmTakeDevice();
    }
  }, [onDismiss, onConfirmTakeDevice]);

  // Поддержка горячих клавиш Space / Enter для быстрого принятия хода
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.code === "Space") {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, handleDismiss]);

  if (!isVisible) return null;

  // Определение параметров следующего игрока
  const fallbackInfo = gameState ? resolveNextPlayerInfo(gameState) : null;
  const effectiveRole = nextRole ?? fallbackInfo?.nextRole ?? "DETECTIVE";
  const defaultRoleName = effectiveRole === "KILLER" ? "Бандит" : "Инспектор";
  const defaultRoleColor = effectiveRole === "KILLER" ? "text-rose-400" : "text-blue-400";
  const defaultBorderColor = effectiveRole === "KILLER" ? "border-rose-500/40" : "border-blue-500/40";
  const defaultBgGlow = effectiveRole === "KILLER"
    ? "bg-rose-950/20 shadow-[0_0_30px_rgba(244,63,94,0.15)]"
    : "bg-blue-950/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]";

  const displayName = nextPlayerName || fallbackInfo?.nextPlayerName || defaultRoleName;
  const displayColor = nextPlayerColor || fallbackInfo?.nextPlayerColor || defaultRoleColor;

  return (
    <div
      role="dialog"
      aria-label="Смена игрока"
      onClick={handleDismiss}
      className={`fixed inset-0 ${zIndexClass} flex flex-col items-center justify-between bg-black/95 backdrop-blur-2xl text-white p-6 select-none cursor-pointer font-mono animate-fadeIn`}
      style={{ touchAction: "manipulation" }}
      data-testid="blindfold-curtain"
    >
      {/* Верхний гриф конфиденциальности */}
      <div className="w-full flex items-center justify-between border-b border-white/10 pb-4 pt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-zinc-400">
            ОФФЛАЙН РЕЖИМ • PASS & PLAY
          </span>
        </div>
        <span className="text-[10px] sm:text-xs font-mono text-zinc-500">
          СЕКРЕТНОСТЬ ДАННЫХ
        </span>
      </div>

      {/* Центральный терминальный блок передачи хода в Neo-Noir карточке */}
      <div className="flex flex-col items-center text-center max-w-md my-auto px-6 py-8 neo-card border-t-white/20 rounded-3xl shadow-2xl">
        {/* Технический видоискатель / иконка передачи */}
        <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border ${defaultBorderColor} ${defaultBgGlow} text-zinc-300 transition-all duration-300`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 7h6" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>

        {/* Индикатор протокола */}
        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">
          ПРОТОКОЛ СМЕНЫ ХОДА
        </div>

        {/* Главный заголовок передачи хода */}
        <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-zinc-300 mb-1">
          ПЕРЕДАЙТЕ УСТРОЙСТВО [{displayName}]...
        </h2>

        <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mt-2 mb-1">
          ПЕРЕДАЧА ХОДА:
        </div>

        {/* Имя следующего игрока с акцентным цветом */}
        <div className={`text-2xl sm:text-3xl font-black uppercase tracking-wider ${displayColor} drop-shadow-md mb-2`}>
          {displayName}
        </div>

        <div className="text-xs text-zinc-400 mb-4">
          Передайте телефон следующему игроку
        </div>

        {/* Текст секретности */}
        <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mb-6 border-t border-b border-white/10 py-3">
          Секретные данные предыдущего хода скрыты шторкой. Убедитесь, что экран скрыт от глаз оппонента, прежде чем принять управление.
        </p>

        {/* Терминальная кнопка готовности в стиле Neo-Noir */}
        <button
          type="button"
          role="button"
          aria-label="Я взял телефон"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="w-full max-w-xs h-12 rounded-xl neo-button-primary uppercase tracking-widest text-xs font-black transition-all active:scale-95 touch-manipulation cursor-pointer shadow-lg flex items-center justify-center"
        >
          [ Я ГОТОВ • ПРИНЯТЬ ХОД ]
        </button>

        {/* Подсказка клавиш и тапа */}
        <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase mt-4">
          НАЖМИТЕ НА ЭКРАН ДЛЯ ПРОДОЛЖЕНИЯ ИЛИ [ПРОБЕЛ] / [ENTER]
        </span>
      </div>

      {/* Нижняя сервисная строка */}
      <div className="w-full flex justify-between items-center border-t border-white/5 pt-3">
        <span className="text-[10px] font-mono text-zinc-600 tracking-wider">
          ТАЙНА ЛИЧНОСТИ: АКТИВНА
        </span>
        <span className="text-[10px] font-mono text-zinc-600 tracking-wider">
          КОСНИТЕСЬ В ЛЮБОМ МЕСТЕ
        </span>
      </div>
    </div>
  );
};
