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
        {/* Реалистичный векторный отпечаток пальца (svgsilh 2750393) */}
        <svg viewBox="0 0 512 512" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
          <path d="M245.9 8.2C151.7 15.6 77 91.5 70.8 185.8c-2.3 35.4 3.7 68.6 17.5 98.9 4 8.7 14.5 12.6 23.2 8.6 8.7-4 12.6-14.5 8.6-23.2-11.8-25.9-17-54.2-15-84.5 5.3-80.4 69-145 149.3-151.3 89.2-7 165.6 61.3 169.5 150.3 1.9 42.4-12.2 83.1-39.7 114.7-6.2 7.2-5.4 18.1 1.8 24.3 7.2 6.2 18.1 5.4 24.3-1.8 33.7-38.6 51-88.5 48.7-140.4C454.2 82.2 355.6.8 245.9 8.2zm21.4 65.5c-66.2 3.9-120.4 57.1-125.8 123.2-3.1 38.3 8.3 74.8 31.3 103.1 5.9 7.3 16.7 8.3 23.9 2.5 7.3-5.9 8.3-16.7 2.5-23.9-18.4-22.7-27.5-51.8-25-82.5 4.3-52.9 47.7-95.4 100.7-98.5 60.1-3.6 111.4 43.1 113.1 103.3.9 31.3-9.9 61.5-30.5 85-6.1 6.9-5.4 17.5 1.5 23.6 6.9 6.1 17.5 5.4 23.6-1.5 26.6-30.4 40.5-69.4 39.4-109.8-2.2-75.1-66.3-133.4-141.7-129.5zm-14.4 72.8c-32.9 3.5-59.5 30-62.8 62.9-2.3 23.2 5.1 45.4 19.8 62.4 6.2 7.2 17 7.9 24.1 1.7 7.2-6.2 7.9-17 1.7-24.1-9.9-11.5-14.9-26.4-13.3-42 2.2-22.1 20-39.9 42.1-42.2 27.6-2.9 51.5 17.4 53.6 44.8 1.4 18.9-6.3 36.8-20.7 49.3-7 6.1-7.8 16.8-1.7 23.8 6.1 7 16.8 7.8 23.8 1.7 21.6-18.8 33.2-45.7 31-74.1-3.3-41-39.4-71.4-80.9-67.4zm-4.7 71.4c-6.2.7-11.1 5.7-11.7 11.9-.8 8.7 2.3 17 8.4 23.1 6.6 6.6 17.4 6.6 24 0 6.6-6.6 6.6-17.4 0-24-1.9-1.9-2.8-4.4-2.5-7.1.6-6.4-4.8-12.2-11.2-12.2-.7 0-1.4.1-2 .3zM157 325.2c-5.4 7.8-3.5 18.5 4.3 23.9 44.6 30.8 71.9 81.3 71.9 135.2 0 9.4 7.6 17 17 17s17-7.6 17-17c0-65.7-33.3-127.3-87.7-164.8-7.8-5.4-18.5-3.5-23.9 4.3zm198.8 1.5c-8.6 3.8-12.5 13.9-8.7 22.5 21.1 47.9 18.7 103.1-6.6 148.9-4.7 8.5-1.7 19.2 6.8 23.9 8.5 4.7 19.2 1.7 23.9-6.8 31.4-56.9 34.4-125.6 8.2-185.1-3.8-8.6-13.9-12.5-22.5-8.7zm-95.2 64.9c-8.7 3.5-13 13.3-9.5 22 17.5 43.6 6.5 93.6-26.6 126.7-6.6 6.6-6.6 17.4 0 24 6.6 6.6 17.4 6.6 24 0 43.4-43.4 57.7-108.9 34.8-166-3.5-8.7-13.3-13-22-9.5z" />
        </svg>
      </motion.div>
    </div>
  );
};
