import React, { useState, useEffect, useMemo } from "react";
import type { Character } from "../types/game";
import { triggerHaptic } from "../utils/haptics";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      zIndexClass="z-[75]"
      className="p-4 sm:p-6 max-h-[92vh] text-left"
    >
      <div className="flex justify-between items-center mb-3 shrink-0 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
          <h2 className="text-sm font-black uppercase tracking-widest text-[#f1f5f9] flex items-center gap-1.5">
            <span>Блокнот подозреваемых</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleReset}
            className="!h-8 !px-3 text-[10px] font-mono uppercase tracking-wider"
            title="Сбросить все пометки"
          >
            Сбросить
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="!h-8 !w-8 !p-0 text-zinc-400 hover:text-white"
            title="Закрыть"
          >
            ✕
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-3 shrink-0 font-mono text-[9px] sm:text-[10px]">
        <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-1.5 text-center">
          <span className="text-[#a1a1aa] block">ВСЕГО</span>
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
          <span className="text-[#a1a1aa] block">ИСКЛЮЧЕН</span>
          <span className="font-bold text-zinc-300">{counts.excluded}</span>
        </div>
      </div>

      <div className="text-[10px] font-mono text-[#a1a1aa] mb-2 px-1 text-center shrink-0">
        Нажмите на карточку для смены статуса (Подозрение ➔ Алиби ➔ Исключён ➔ Сброс)
      </div>

      <div className="overflow-y-auto pr-1 pb-2 custom-scrollbar flex-1 min-h-0">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {characters.map((char) => {
            const status = statuses[char.id] || "NONE";
            const imgAsset = characterImages?.[`./assets/characters/${char.id}.webp`]?.default ||
              characterImages?.[`../assets/characters/${char.id}.webp`]?.default;

            const statusBorder =
              status === "SUSPECT"
                ? "border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] ring-1 ring-red-500/60"
                : status === "ALIBI"
                  ? "border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)] ring-1 ring-blue-500/60"
                  : status === "EXCLUDED"
                    ? "border-zinc-700 opacity-40 grayscale"
                    : "border-white/10 hover:border-white/30";

            const badgeBg =
              status === "SUSPECT"
                ? "bg-red-950/90 text-red-300 border-red-500/80"
                : status === "ALIBI"
                  ? "bg-blue-950/90 text-blue-300 border-blue-500/80"
                  : status === "EXCLUDED"
                    ? "bg-zinc-900 text-zinc-500 border-zinc-700"
                    : "bg-black/80 text-zinc-400 border-white/10";

            const badgeLabel =
              status === "SUSPECT"
                ? "ВИНОВЕН?"
                : status === "ALIBI"
                  ? "АЛИБИ"
                  : status === "EXCLUDED"
                    ? "НЕ ОН"
                    : "НЕИЗВЕСТНО";

            return (
              <div
                key={char.id}
                onClick={() => cycleStatus(char.id)}
                className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-950/80 border transition-all duration-150 cursor-pointer flex flex-col justify-between p-2 select-none group shadow-md hover:scale-[1.02] active:scale-[0.98] ${statusBorder}`}
              >
                {imgAsset && (
                  <img
                    src={imgAsset}
                    alt={char.name}
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${
                      status === "EXCLUDED" ? "opacity-30 grayscale" : "opacity-75 grayscale contrast-125"
                    }`}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent pointer-events-none" />

                <div className="relative z-10 flex justify-between items-center text-[9px] font-mono font-bold leading-none">
                  <span className="text-zinc-300 bg-black/70 px-1.5 py-0.5 rounded border border-white/10">
                    #{char.id.replace("c", "").padStart(2, "0")}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider ${badgeBg}`}>
                    {badgeLabel}
                  </span>
                </div>

                <div className="relative z-10 mt-auto leading-tight">
                  <span className="text-[10px] font-black uppercase text-zinc-100 tracking-wider block break-words">
                    {char.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
