import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  overlayClassName?: string;
  showCloseButton?: boolean;
  zIndexClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  className = '',
  overlayClassName = '',
  showCloseButton = false,
  zIndexClass = 'z-50',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none modal-backdrop touch-none ${overlayClassName}`}
          onClick={onClose}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`w-full ${maxWidth} neo-card rounded-2xl p-6 shadow-2xl flex flex-col text-center relative touch-pan-y overscroll-contain ${className}`}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                aria-label="Закрыть"
              >
                ✕
              </button>
            )}
            {title && (
              <div className="text-xl font-black uppercase tracking-wider text-zinc-100 mb-4">
                {title}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

