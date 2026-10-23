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
  const textOpacity = useTransform(x, [0, 160], [1, 0.2]);

  const handleDragEnd = () => {
    if (disabled || isTriggered) return;
    const trackWidth = trackRef.current?.offsetWidth || 0;
    const handleWidth = 48;
    const maxDrag = Math.max(1, trackWidth - handleWidth - 8);
    const currentX = x.get();

    if (currentX >= maxDrag * 0.85) {
      setIsTriggered(true);
      triggerHaptic("heavy");
      onTrigger();
      setTimeout(() => {
        setIsTriggered(false);
        x.set(0);
      }, 1200);
    } else {
      x.set(0);
    }
  };

  return (
    <div
      ref={trackRef}
      className={`relative w-full h-12 sm:h-[52px] md:h-16 rounded-full bg-gradient-to-r from-red-950/90 via-red-900/40 to-black/70 border border-red-500/30 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center p-1 select-none overflow-hidden ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
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

      <motion.div
        drag={disabled || isTriggered ? false : "x"}
        dragConstraints={trackRef}
        dragElastic={0.05}
        dragSnapToOrigin={!isTriggered}
        style={{ x }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.96 }}
        className="w-10 h-10 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] bg-zinc-950 flex items-center justify-center cursor-grab active:cursor-grabbing text-red-500 z-10 shrink-0"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]">
          <path d="M12 11c-1.66 0-3 1.34-3 3 0 2.22 1.78 4 4 4 1.1 0 2-.9 2-2 0-1.66-1.34-3-3-3" />
          <path d="M8.5 7.5A6.5 6.5 0 0 1 18.2 12c-.2 2.3-1.8 4.2-3.8 4.8" />
          <path d="M5.5 10A9.5 9.5 0 0 1 20 12c0 1.9-.6 3.6-1.6 5" />
          <path d="M2 12a12.5 12.5 0 0 1 21 0" />
          <path d="M12 2a14.5 14.5 0 0 0-9.8 4" />
          <path d="M12 17v5" />
        </svg>
      </motion.div>
    </div>
  );
};
