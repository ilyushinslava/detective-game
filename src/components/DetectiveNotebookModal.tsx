import React, { useState, useEffect, useMemo } from "react";
import type { Character } from "../types/game";
import { triggerHaptic } from "../utils/haptics";

export interface DetectiveNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  characterImages?: Record<string, { default: string }>;
}

export type SuspectStatus = "NONE" | "SUSPECT" | "ALIBI" | "EXCLUDED";

export const DetectiveNotebookModal: React.FC<DetectiveNotebookModalProps> = ({
  isOpen,
  onClose,
  characters,
  characterImages,
}) => {
  const sessionKey = useMemo(() => {
    return "requiem_notebook_" + characters.map((c) => c.id).slice(0, 3).join("_");
  }, [characters]);

  const [statuses, setStatuses] = useState<Record<string, SuspectStatus>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(sessionKey);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(sessionKey);
        setStatuses(saved ? JSON.parse(saved) : {});
      } catch {
        setStatuses({});
      }
    }
  }, [sessionKey]);

  const updateStatus = (id: string, nextStatus: SuspectStatus) => {
    triggerHaptic("light");
    setStatuses((prev) => {
      const updated = { ...prev, [id]: nextStatus };
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(sessionKey, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  const cycleStatus = (id: string) => {
    const current = statuses[id] || "NONE";
    const next: Record<SuspectStatus, SuspectStatus> = {
      NONE: "SUSPECT",
      SUSPECT: "ALIBI",
      ALIBI: "EXCLUDED",
      EXCLUDED: "NONE",
    };
    updateStatus(id, next[current]);
  };

  const handleReset = () => {
    triggerHaptic("medium");
    setStatuses({});
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {}
    }
  };

  const counts = useMemo(() => {
    let suspect = 0;
    let alibi = 0;
    let excluded = 0;
    for (const c of characters) {
      const s = statuses[c.id];
      if (s === "SUSPECT") suspect++;
      else if (s === "ALIBI") alibi++;
      else if (s === "EXCLUDED") excluded++;
    }
    return { total: characters.length, suspect, alibi, excluded };
  }, [characters, statuses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 select-none">
      <div className="w-full max-w-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex justify-between items-center mb-3 shrink-0 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-100 flex items-center gap-1.5">
              <span>Блокнот подозреваемых</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-200 bg-zinc-900 px-2.5 py-1 rounded-lg border border-white/5 transition cursor-pointer"
              title="Сбросить все пометки"
            >
              Сбросить
            </button>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 font-bold text-lg cursor-pointer p-1 transition"
              title="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3 shrink-0 font-mono text-[9px] sm:text-[10px]">
          <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-1.5 text-center">
            <span className="text-zinc-500 block">ВСЕГО</span>
            <span className="font-bold text-zinc-200">{counts.total}</span>
          </div>
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-1.5 text-center">
            <span className="text-red-400 block">ПОДОЗРЕНИЕ</span>
            <span className="font-bold text-red-300">{counts.suspect}</span>
          </div>
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-1.5 text-center">
            <span className="text-blue-400 block">АЛИБИ</span>
            <span className="font-bold text-blue-300">{counts.alibi}</span>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-1.5 text-center opacity-60">
            <span className="text-zinc-400 block">ИСКЛЮЧЕН</span>
            <span className="font-bold text-zinc-300">{counts.excluded}</span>
          </div>
        </div>

        <div className="text-[10px] font-mono text-zinc-500 mb-2 px-1 text-center shrink-0">
          Нажмите на карточку для смены статуса (Подозрение ➔ Алиби ➔ Исключён ➔ Сброс)
        </div>

        <div className="overflow-y-auto pr-1 pb-2 custom-scrollbar flex-1 min-h-0">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {characters.map((char) => {
              const status = statuses[char.id] || "NONE";
              const imgAsset = characterImages?.[`./assets/characters/${char.id}.webp`]?.default ||
                characterImages?.[`../assets/characters/${char.id}.webp`]?.default;

              let cardBorder = "border-zinc-800 bg-zinc-900/60";
              let badge = null;

              if (status === "SUSPECT") {
                cardBorder = "border-red-500/80 bg-red-950/40 shadow-[0_0_12px_rgba(239,68,68,0.25)]";
                badge = (
                  <span className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-black px-1 rounded uppercase tracking-wider shadow">
                    Враг
                  </span>
                );
              } else if (status === "ALIBI") {
                cardBorder = "border-blue-500/80 bg-blue-950/40 shadow-[0_0_12px_rgba(59,130,246,0.25)]";
                badge = (
                  <span className="absolute top-1 right-1 bg-blue-600 text-white text-[8px] font-black px-1 rounded uppercase tracking-wider shadow">
                    Алиби
                  </span>
                );
              } else if (status === "EXCLUDED") {
                cardBorder = "border-zinc-800/50 bg-zinc-950 opacity-35";
                badge = (
                  <span className="absolute top-1 right-1 bg-zinc-800 text-zinc-400 text-[8px] font-black px-1 rounded uppercase">
                    ✕
                  </span>
                );
              }

              return (
                <div
                  key={char.id}
                  onClick={() => cycleStatus(char.id)}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden border flex flex-col justify-between p-1.5 transition-all cursor-pointer active:scale-95 select-none ${cardBorder}`}
                >
                  {badge}
                  <div className="text-[8.5px] font-mono text-zinc-500">
                    #{char.id.replace("c", "").padStart(2, "0")}
                  </div>

                  {imgAsset && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <img
                        src={imgAsset}
                        alt={char.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="relative z-10">
                    <span className={`block text-[10px] font-bold uppercase leading-tight truncate ${
                      status === "SUSPECT"
                        ? "text-red-300"
                        : status === "ALIBI"
                        ? "text-blue-300"
                        : status === "EXCLUDED"
                        ? "text-zinc-600 line-through"
                        : "text-zinc-200"
                    }`}>
                      {char.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition border border-white/5 cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
