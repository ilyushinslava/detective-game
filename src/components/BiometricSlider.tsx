import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { triggerHaptic } from "../utils/haptics";

export interface BiometricSliderProps {
  onTrigger: () => void;
  disabled?: boolean;
  text?: string;
  price?: number;
}

export const BiometricSlider = ({
  onTrigger,
  disabled = false,
  text = "Быстрая игра",
  price = 250,
}: BiometricSliderProps) => {
  const [isTriggered, setIsTriggered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, 160], [1, 0]);

  const handleDragEnd = () => {
    if (disabled || isTriggered) return;
    const trackWidth = trackRef.current?.offsetWidth || 0;
    const handleWidth = 48;
    const maxDrag = Math.max(1, trackWidth - handleWidth - 8);
    const currentX = x.get();

    if (currentX >= maxDrag * 0.85) {
      x.set(maxDrag);
      setIsTriggered(true);
      triggerHaptic("heavy");
      onTrigger();
    } else {
      x.set(0);
    }
  };

  return (
    <div
      ref={trackRef}
      className={`relative w-full h-12 sm:h-[52px] md:h-16 rounded-full border transition-all duration-500 backdrop-blur-md flex items-center p-1 select-none overflow-hidden ${
        isTriggered
          ? "bg-red-600 border-red-400/80 shadow-[0_0_25px_rgba(220,38,38,0.7)]"
          : "bg-gradient-to-r from-red-950/90 via-red-900/40 to-black/70 border-red-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      {!isTriggered ? (
        <motion.div
          style={{ opacity: textOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none font-black text-xs uppercase tracking-widest text-zinc-300 select-none gap-2 px-12"
        >
          <span>{text}</span>
          {price !== undefined && (
            <span className="text-[10px] md:text-xs font-mono text-red-300 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-red-500/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-amber-400 shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0" />
              </svg>
              {price}
            </span>
          )}
        </motion.div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-black text-xs uppercase tracking-widest text-white select-none gap-2 px-12 animate-pulse">
          <svg className="animate-spin h-3.5 w-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>ИНИЦИАЛИЗАЦИЯ...</span>
        </div>
      )}

      <motion.div
        drag={disabled || isTriggered ? false : "x"}
        dragConstraints={trackRef}
        dragElastic={0.05}
        dragSnapToOrigin={!isTriggered}
        style={{ x }}
        onDragEnd={handleDragEnd}
        whileTap={!isTriggered ? { scale: 0.96 } : undefined}
        className={`w-10 h-10 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full border-2 border-red-500 bg-zinc-950 flex items-center justify-center text-red-500 z-10 shrink-0 transition-shadow duration-300 ${
          isTriggered
            ? "shadow-[0_0_20px_rgba(255,255,255,0.9)] text-white border-white cursor-default"
            : "shadow-[0_0_15px_rgba(239,68,68,0.8)] cursor-grab active:cursor-grabbing"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]">
          <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 5.92 1.5.24.13.33.44.2.68-.08.18-.24.29-.32.29zm3.17 4.15c-.1 0-.19-.03-.28-.08-1.57-.91-3.71-1.41-6.19-1.41-2.82 0-5.37.64-7.4 1.83-.23.14-.54.06-.67-.17-.14-.23-.06-.54.17-.67 2.19-1.28 4.93-1.97 7.9-1.97 2.65 0 4.94.54 6.64 1.52.24.14.31.45.18.69-.09.18-.23.26-.35.26zm-2.07 10.31c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39.27 0 .5.22.5.5s-.22.5-.5.5c-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.1.1-.24.15-.37.15zm-7.17.65c-.18 0-.35-.1-.44-.26-.8-1.45-1.21-2.95-1.21-4.47 0-2.67 2.05-4.85 4.56-4.85 2.52 0 4.57 2.18 4.57 4.85 0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.12-1.6-3.85-3.57-3.85s-3.56 1.73-3.56 3.85c0 1.34.36 2.67 1.07 3.96.14.24.05.55-.19.68-.07.06-.15.09-.23.09zm2.46 3.42c-.2 0-.39-.12-.46-.32-.57-1.58-.86-3.17-.86-4.73 0-1.89.47-3.3 1.39-4.2.9-.88 2.18-1.33 3.8-1.33 1.61 0 2.89.45 3.8 1.33.93.9 1.39 2.31 1.39 4.2 0 1.13-.15 2.33-.45 3.56-.07.27-.34.43-.61.37-.27-.07-.43-.34-.37-.61.27-1.11.41-2.21.41-3.23 0-1.72-.39-2.93-1.12-3.64-.7-.68-1.7-1.03-2.97-1.03-1.28 0-2.28.34-2.98 1.03-.73.71-1.12 1.92-1.12 3.64 0 1.41.26 2.86.78 4.3.1.26-.04.55-.3.65-.05.02-.1.02-.15.02zm4.84.97c-.07 0-.15-.02-.22-.05-.88-.41-1.74-.63-2.65-.63-.9 0-1.78.21-2.7.64-.25.12-.55.01-.66-.24-.12-.25-.01-.55.24-.66 1.03-.49 2.05-.73 3.12-.73 1.05 0 2.05.24 3.09.72.25.12.36.41.24.66-.1.19-.28.29-.46.29z" />
        </svg>
      </motion.div>
    </div>
  );
};
