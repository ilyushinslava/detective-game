import React from "react";

export const DeviceOrientationOverlay: React.FC = () => {
  return (
    <div className="mobile-landscape-overlay fixed inset-0 z-[200] bg-zinc-950 flex-col items-center justify-center text-center px-6 select-none">
      <div className="w-20 h-20 mb-6 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)] animate-pulse">
        <span className="text-4xl transform -rotate-90">📱</span>
      </div>
      <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100 mb-3">
        Поверните устройство
      </h2>
      <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
        Пожалуйста, верните устройство в вертикальное положение для продолжения операции.
      </p>
    </div>
  );
};
