import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Icons } from "../ui/Icons";
import { triggerHaptic } from "../../utils/haptics";
import { soundManager } from "../../utils/audio";

export interface LobbyWaitingModalProps {
  isOpen: boolean;
  isPrivate: boolean;
  roomCode: string;
  morseCode?: string | null;
  isHost: boolean;
  onCancel: () => void;
}

export const LobbyWaitingModal: React.FC<LobbyWaitingModalProps> = ({
  isOpen,
  isPrivate,
  roomCode,
  morseCode,
  isHost,
  onCancel,
}) => {
  const [showShareToast, setShowShareToast] = useState(false);

  if (!isOpen) return null;

  const handleShare = async () => {
    triggerHaptic("light");
    soundManager.play("confirm");
    const code = roomCode || "";
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(code)}`;
    const shareData = {
      title: "Под подозрением (Prime Suspect)",
      text: `Подключайся к расследованию в комнате #${code}!`,
      url: shareUrl,
    };

    if (typeof navigator.share === "function" && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        triggerHaptic("medium");
        soundManager.play("confirm");
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.warn("Share API error:", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        triggerHaptic("medium");
        soundManager.play("confirm");
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2500);
      } catch (e) {
        console.warn("Clipboard copy failed:", e);
      }
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        maxWidth="max-w-sm"
        zIndexClass="z-[70]"
        className="items-center p-8 text-center"
      >
        <div className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-2">
          {isPrivate ? "ШИФРОВАННЫЙ КАНАЛ (МОРЗЕ)" : "ОПЕРАТИВНЫЙ СТОЛ"}
        </div>

        {isPrivate ? (
          morseCode ? (
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-zinc-950/90 border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                {morseCode.split("").map((sym: string, i: number) => (
                  <div key={i} className="flex items-center justify-center">
                    {sym === "." ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                    ) : (
                      <div className="w-8 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                    )}
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-mono text-zinc-400 tracking-wider">
                {morseCode
                  .split("")
                  .map((s: string) => (s === "." ? "•" : "—"))
                  .join(" ")}
              </span>
              <span className="text-[9px] font-mono text-zinc-400 uppercase">
                Продиктуйте этот 7-значный шифр напарнику
              </span>
            </div>
          ) : (
            <div className="text-sm font-mono text-cyan-400 animate-pulse mb-6 border border-white/10 rounded-2xl px-6 py-4 bg-zinc-950/70 shadow-inner">
              Генерация 7-значного шифра...
            </div>
          )
        ) : (
          <div className="text-base font-black text-emerald-400 tracking-widest font-mono mb-6 border border-emerald-500/20 rounded-2xl px-6 py-4 bg-zinc-950/70 shadow-inner">
            ОТКРЫТЫЙ СТОЛ (ВХОД БЕЗ ПАРОЛЯ)
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 border-2 border-zinc-800 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
        </div>

        <div className="text-[10px] text-zinc-300 font-black tracking-widest uppercase animate-pulse mb-6">
          {isHost ? "Ожидание подключения агента..." : "Синхронизация с хостом..."}
        </div>

        {isHost && (
          <Button
            variant="ghost"
            fullWidth
            onClick={handleShare}
            className="mb-3 text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-zinc-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icons.Share className="w-3.5 h-3.5" />
            Поделиться ссылкой
          </Button>
        )}

        <Button
          variant="secondary"
          fullWidth
          onClick={onCancel}
          className="text-[10px] font-black tracking-widest uppercase"
        >
          Прервать операцию
        </Button>
      </Modal>

      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm font-semibold text-zinc-100 shadow-[0_4px_24px_rgba(0,0,0,0.6)] pointer-events-none select-none whitespace-nowrap"
          >
            Код скопирован
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
