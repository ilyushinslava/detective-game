import React, { useState } from "react";
import type { GameModeType, Role } from "../../types/game";
import { RoleRevealIcons } from "./RoleRevealIcons";

export interface ActionTile {
  id: string;
  label: string;
  icon: React.ReactNode;
  desc: string;
}

export interface ActionTilesGridProps {
  mode: GameModeType;
  role: Role;
}

export const ActionTilesGrid: React.FC<ActionTilesGridProps> = ({ mode, role }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const tiles: ActionTile[] = [];
  const isRed = role === "KILLER" || role === "SPY_P1";
  const colorClass = isRed ? "text-red-400" : "text-blue-400";

  if (mode === "LINE_UP") {
    if (isRed) {
      tiles.push({
        id: "kill",
        label: "Ликвидация",
        icon: <RoleRevealIcons.Target className="w-6 h-6 text-red-400" />,
        desc: "Устранить соседнего персонажа (включая диагональ). При убийстве невиновного проводится опрос соперника.",
      });
      tiles.push({
        id: "shift",
        label: "Маневр",
        icon: <RoleRevealIcons.Shift className="w-6 h-6 text-rose-500" />,
        desc: "Выполнить маневр ряда или колонки на 1 клетку. Нельзя отменять ход противника.",
      });
      tiles.push({
        id: "disguise",
        label: "Конспирация",
        icon: <RoleRevealIcons.Eye className="w-6 h-6 text-red-400" />,
        desc: "Взять карту из колоды и сменить тайную личность.",
      });
    } else {
      tiles.push({
        id: "accuse",
        label: "Задержание",
        icon: <RoleRevealIcons.Shield className={`w-6 h-6 ${colorClass}`} />,
        desc: "Обвинить соседнюю клетку. Если это преступник — победа.",
      });
      tiles.push({
        id: "shift",
        label: "Маневр",
        icon: <RoleRevealIcons.Shift className="w-6 h-6 text-sky-400" />,
        desc: "Выполнить маневр ряда или колонки на 1 клетку. Нельзя отменять ход противника.",
      });
      tiles.push({
        id: "alibi",
        label: "Проверка алиби",
        icon: <RoleRevealIcons.Folder className="w-6 h-6 text-blue-400" />,
        desc: "Выложить доказательство из руки на поле и опросить преступника.",
      });
    }
  } else if (mode === "MANIAC_VS_OPERATIVE") {
    if (isRed) {
      tiles.push({
        id: "target_kill",
        label: "Ликвидация",
        icon: <RoleRevealIcons.Target className="w-6 h-6 text-red-400" />,
        desc: "Ликвидировать текущую цель строго по открытому списку из 4 жертв.",
      });
      tiles.push({
        id: "shift",
        label: "Маневр",
        icon: <RoleRevealIcons.Shift className="w-6 h-6 text-rose-500" />,
        desc: "Выполнить маневр ряда или колонки на 1 клетку. Нельзя отменять ход противника.",
      });
      tiles.push({
        id: "escape",
        label: "Конспирация",
        icon: <RoleRevealIcons.Eye className="w-6 h-6 text-red-400" />,
        desc: "Взять карту из колоды и сменить тайную личность.",
      });
    } else {
      tiles.push({
        id: "accuse",
        label: "Задержание",
        icon: <RoleRevealIcons.Shield className="w-6 h-6 text-blue-400" />,
        desc: "Обвинить соседнюю клетку. Если это преступник — победа.",
      });
      tiles.push({
        id: "shift",
        label: "Маневр",
        icon: <RoleRevealIcons.Shift className="w-6 h-6 text-sky-400" />,
        desc: "Выполнить маневр ряда или колонки на 1 клетку. Нельзя отменять ход противника.",
      });
      tiles.push({
        id: "alibi",
        label: "Проверка алиби",
        icon: <RoleRevealIcons.Folder className="w-6 h-6 text-blue-400" />,
        desc: "Выложить доказательство из руки на поле и опросить преступника.",
      });
    }
  } else if (mode === "THIEF_HUNT") {
    if (isRed) {
      tiles.push({
        id: "steal",
        label: "Кража",
        icon: <RoleRevealIcons.Coins className="w-6 h-6 text-zinc-300" />,
        desc: "Украсть сокровище из сейфа у себя или соседней клетки. Цель — 8 сокровищ.",
      });
      tiles.push({
        id: "shift",
        label: "Маневр",
        icon: <RoleRevealIcons.Shift className="w-6 h-6 text-rose-500" />,
        desc: "Выполнить маневр ряда или колонки на 1 клетку. Нельзя отменять ход противника.",
      });
      tiles.push({
        id: "disguise_thief",
        label: "Конспирация",
        icon: <RoleRevealIcons.Eye className="w-6 h-6 text-zinc-300" />,
        desc: "Взять карту из колоды и сменить тайную личность.",
      });
    } else {
      tiles.push({
        id: "accuse_thief",
        label: "Задержание",
        icon: <RoleRevealIcons.Shield className="w-6 h-6 text-blue-400" />,
        desc: "Обвинить клетку рядом со своей тайной личностью или любым из патрульных.",
      });
      tiles.push({
        id: "shift",
        label: "Маневр",
        icon: <RoleRevealIcons.Shift className="w-6 h-6 text-sky-400" />,
        desc: "Выполнить маневр ряда или колонки на 1 клетку. Нельзя отменять ход противника.",
      });
      tiles.push({
        id: "patrol",
        label: "Вызов патруля",
        icon: <RoleRevealIcons.Badge className="w-6 h-6 text-indigo-400" />,
        desc: "Заменить открытого патрульного картой из колоды (грабитель получает 1 сокровище).",
      });
    }
  } else if (mode === "SECRET_SERVICE") {
    tiles.push({
      id: "capture_spy",
      label: "Разоблачение",
      icon: <RoleRevealIcons.Target className={`w-6 h-6 ${isRed ? "text-red-400" : "text-blue-400"}`} />,
      desc: "Вскрыть соседнего подозреваемого. Если это чужой агент — забрать компромат.",
    });
    tiles.push({
      id: "shift",
      label: "Маневр",
      icon: <RoleRevealIcons.Shift className={`w-6 h-6 ${isRed ? "text-rose-500" : "text-sky-400"}`} />,
      desc: "Выполнить маневр ряда или колонки на 1 клетку. Нельзя отменять ход противника.",
    });
    tiles.push({
      id: "interrogate_spy",
      label: "Опрос свидетелей",
      icon: <RoleRevealIcons.Radar className={`w-6 h-6 ${isRed ? "text-red-400" : "text-blue-400"}`} />,
      desc: "Узнать, находится ли тайная личность соперника рядом с выбранной целью.",
    });
  }

  const selectedTile = tiles.find((t) => t.id === activeTooltip);

  return (
    <div className="w-full mt-3 text-left">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
          ДОСТУПНЫЕ ДЕЙСТВИЯ
        </span>
        <span className="text-[8px] font-sans text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1">
          <RoleRevealIcons.Info className="w-3 h-3 text-zinc-500" /> Нажмите для деталей
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 w-full">
        {tiles.map((t) => {
          const isCurrent = activeTooltip === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTooltip((prev) => (prev === t.id ? null : t.id))}
              className={`rounded-2xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer border ${
                isCurrent
                  ? isRed
                    ? "bg-rose-950/40 border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-[1.02]"
                    : "bg-blue-950/40 border-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.02]"
                  : "bg-zinc-900/80 border-white/10 hover:border-white/30 active:scale-95 shadow-md"
              }`}
            >
              {t.icon}
              <span className="text-[9px] font-black text-zinc-200 uppercase tracking-widest leading-tight">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Плашка пояснения выбранного действия */}
      {selectedTile && (
        <div className="mt-2.5 p-3 rounded-xl bg-zinc-900/90 border border-white/10 text-[10px] text-zinc-300 font-medium tracking-normal text-left animate-fadeIn leading-relaxed">
          <b className="text-white uppercase font-black block mb-0.5">{selectedTile.label}:</b>
          {selectedTile.desc}
        </div>
      )}
    </div>
  );
};
