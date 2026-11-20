import React, { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "../utils/haptics";
import { Icons } from "../components/ui/Icons";

export interface BannerRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface BannerViewerState {
  isOpen: boolean;
  url: string;
  title: string;
  rect: BannerRect | null;
}

export interface BannerViewerContextType {
  openBanner: (e: React.MouseEvent<HTMLElement>, url: string, title: string) => void;
  closeBanner: () => void;
  state: BannerViewerState;
}

const BannerViewerContext = createContext<BannerViewerContextType | null>(null);

const getTargetRect = () => {
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;
  const targetW = Math.min(672, Math.max(280, vw - 32));
  const isWide = vw >= 640;
  const targetH = isWide ? targetW / 2 : (targetW * 9) / 16;
  const targetL = Math.max(16, (vw - targetW) / 2);
  const targetT = Math.max(16, (vh - targetH) / 2);
  return { targetT, targetL, targetW, targetH };
};

const cardVariants = {
  closed: (rect: BannerRect | null) => {
    const { targetT, targetL, targetW, targetH } = getTargetRect();
    return {
      top: rect ? rect.top : targetT,
      left: rect ? rect.left : targetL,
      width: rect ? rect.width : targetW,
      height: rect ? rect.height : targetH,
      borderRadius: 16,
      opacity: 0,
      scale: rect ? 0.98 : 0.9,
    };
  },
  open: () => {
    const { targetT, targetL, targetW, targetH } = getTargetRect();
    return {
      top: targetT,
      left: targetL,
      width: targetW,
      height: targetH,
      borderRadius: 24,
      opacity: 1,
      scale: 1,
    };
  },
};

export const BannerViewerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bannerViewer, setBannerViewer] = useState<BannerViewerState>({
    isOpen: false,
    url: "",
    title: "",
    rect: null,
  });

  const openBanner = (e: React.MouseEvent<HTMLElement>, url: string, title: string) => {
    triggerHaptic("light");
    const rect = e.currentTarget.getBoundingClientRect();
    setBannerViewer({
      isOpen: true,
      url,
      title,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  const closeBanner = () => {
    triggerHaptic("light");
    setBannerViewer((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <BannerViewerContext.Provider value={{ openBanner, closeBanner, state: bannerViewer }}>
      {children}

      <AnimatePresence>
        {bannerViewer.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
            className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md cursor-pointer"
            onClick={closeBanner}
          />
        )}
      </AnimatePresence>

      <div
        className="fixed inset-0 z-[120] select-none pointer-events-none"
        aria-hidden={!bannerViewer.isOpen}
      >
        <button
          type="button"
          onClick={closeBanner}
          className={`absolute top-6 right-6 w-10 h-10 bg-zinc-900/80 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer z-20 ${
            bannerViewer.isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          title="Закрыть"
        >
          <Icons.Close className="w-5 h-5 text-zinc-400 group-hover:text-white" />
        </button>
        <motion.div
          custom={bannerViewer.rect}
          variants={cardVariants}
          initial="closed"
          animate={bannerViewer.isOpen ? "open" : "closed"}
          transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
          onClick={closeBanner}
          className={`fixed overflow-hidden border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-zinc-950 ${
            bannerViewer.isOpen ? "pointer-events-auto cursor-pointer" : "pointer-events-none"
          }`}
        >
          {bannerViewer.url && (
            <img
              src={bannerViewer.url}
              alt={bannerViewer.title}
              className="w-full h-full object-cover contrast-110 pointer-events-none"
            />
          )}
          <div
            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-6 pt-16 flex flex-col items-center text-center pointer-events-none transition-opacity duration-200 ${
              bannerViewer.isOpen ? "opacity-100 delay-100" : "opacity-0"
            }`}
          >
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-100 uppercase tracking-wider leading-tight">
              {bannerViewer.title}
            </h2>
          </div>
        </motion.div>
      </div>
    </BannerViewerContext.Provider>
  );
};

const defaultBannerViewerContext: BannerViewerContextType = {
  openBanner: () => {},
  closeBanner: () => {},
  state: {
    isOpen: false,
    url: "",
    title: "",
    rect: null,
  },
};

export const useBannerViewer = (): BannerViewerContextType => {
  const context = useContext(BannerViewerContext);
  return context || defaultBannerViewerContext;
};
