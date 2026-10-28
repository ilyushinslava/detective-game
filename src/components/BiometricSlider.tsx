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
      className={`relative w-full h-11 sm:h-12 md:h-16 rounded-full border transition-all duration-500 backdrop-blur-md flex items-center p-1 select-none overflow-hidden ${
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
        className={`w-9 h-9 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-full border-2 border-red-500 bg-zinc-950 flex items-center justify-center text-red-500 z-10 shrink-0 transition-shadow duration-300 ${
          isTriggered
            ? "shadow-[0_0_20px_rgba(255,255,255,0.9)] text-white border-white cursor-default"
            : "shadow-[0_0_15px_rgba(239,68,68,0.8)] cursor-grab active:cursor-grabbing"
        }`}
      >
        {/* Точный геометрический отпечаток пальца */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]"
        >
          <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
          <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
          <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
          <path d="M2 12a10 10 0 0 1 18-6" />
          <path d="M2 16h.01" />
          <path d="M21.8 16c.2-2 .131-5.354 0-6" />
          <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
          <path d="M8.65 22c.21-.66.45-1.32.57-2" />
          <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
        </svg>
      </motion.div>
    </div>
  );
};
