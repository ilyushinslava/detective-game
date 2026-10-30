import React from 'react';

export const DeviceOrientationOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] hidden [@media(hover:none)_and_(pointer:coarse)]:max-md:landscape:flex flex-col items-center justify-center bg-black/95 text-center p-6 select-none">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 mb-4 shadow-lg animate-pulse">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <path d="M12 18h.01" />
        </svg>
      </div>
      <h2 className="text-sm font-black uppercase tracking-widest text-zinc-100 mb-2">
        ТРЕБУЕТСЯ ВЕРТИКАЛЬНЫЙ РЕЖИМ
      </h2>
      <p className="text-xs font-mono text-zinc-400 max-w-xs leading-relaxed uppercase tracking-wider">
        Поверните устройство вертикально для продолжения расследования
      </p>
    </div>
  );
};
