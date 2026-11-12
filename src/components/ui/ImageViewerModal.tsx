import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { triggerHaptic } from '../../utils/haptics';

export interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  title?: string;
  subtitle?: string;
  badge?: string;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  title,
  subtitle,
  badge,
}) => {
  if (!isOpen || !imageSrc) return null;

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-3xl"
      zIndexClass="z-[110]"
      className="p-3 sm:p-5 bg-zinc-950/95 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.95)] max-h-[95vh] flex flex-col items-center overflow-hidden"
    >
      {/* Header bar */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0 text-left">
          {badge && (
            <span className="text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-white/15 bg-white/5 text-zinc-300 shrink-0">
              {badge}
            </span>
          )}
          {title && (
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
              {title}
            </h3>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={handleClose}
          className="!h-7 !w-7 !p-0 text-zinc-400 hover:text-white rounded-lg shrink-0 ml-2"
          title="Закрыть (Esc)"
        >
          ✕
        </Button>
      </div>

      {/* Main Image Container */}
      <div
        className="relative w-full flex-1 min-h-0 flex items-center justify-center rounded-xl overflow-hidden bg-black/80 border border-white/10 select-none group"
        onClick={handleClose}
      >
        <img
          src={imageSrc}
          alt={title || 'Иллюстрация'}
          className="w-full h-auto max-h-[72vh] object-contain object-center rounded-lg shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Footer bar */}
      <div className="w-full pt-2 mt-1 flex items-center justify-between text-left shrink-0 select-none">
        {subtitle ? (
          <p className="text-[11px] sm:text-xs text-zinc-400 leading-snug truncate pr-2">
            {subtitle}
          </p>
        ) : (
          <span />
        )}
        <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-widest shrink-0">
          Нажмите в любом месте, чтобы закрыть
        </span>
      </div>
    </Modal>
  );
};
