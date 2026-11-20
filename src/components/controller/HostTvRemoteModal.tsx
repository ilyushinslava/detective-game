import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Icons } from '../ui/Icons';
import { triggerHaptic } from '../../utils/haptics';

export interface HostTvRemoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDispatchAction: (action: any) => void;
  isTvPaused?: boolean;
  isTvMuted?: boolean;
}

export const HostTvRemoteModal: React.FC<HostTvRemoteModalProps> = ({
  isOpen,
  onClose,
  onDispatchAction,
  isTvPaused = false,
  isTvMuted = false,
}) => {
  const [confirmState, setConfirmState] = useState<'NONE' | 'RESTART' | 'LOBBY'>('NONE');

  if (!isOpen) return null;

  const handleTogglePause = () => {
    triggerHaptic('medium');
    onDispatchAction({ type: 'TV_TOGGLE_PAUSE' });
  };

  const handleToggleMute = () => {
    triggerHaptic('medium');
    onDispatchAction({ type: 'TV_TOGGLE_MUTE' });
  };

  const handleConfirmRestart = () => {
    triggerHaptic('heavy');
    onDispatchAction({ type: 'TV_CONFIRM_RESTART' });
    setConfirmState('NONE');
    onClose();
  };

  const handleConfirmLobby = () => {
    triggerHaptic('heavy');
    onDispatchAction({ type: 'TV_EXIT_TO_LOBBY' });
    setConfirmState('NONE');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-sans">
      <div className="neo-card w-full max-w-sm border-t-2 border-t-blue-500/60 bg-zinc-950/95 p-6 shadow-2xl relative overflow-hidden transition-all duration-200 rounded-3xl">
        {/* Заголовок пульта */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.3)]">
              <Icons.Tv className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider text-zinc-100 font-display">
                ТВ Пульт Хоста
              </h3>
              <p className="text-[11px] font-sans text-zinc-400 uppercase tracking-widest font-semibold">
                Дистанционное управление
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setConfirmState('NONE');
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <Icons.Close className="w-4 h-4" />
          </button>
        </div>

        {/* Тело управления */}
        <div className="py-4 space-y-3">
          {confirmState === 'RESTART' ? (
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/40 text-center">
              <p className="text-xs text-zinc-200 font-sans font-medium">
                Перезапустить матч на телевизоре для всех участников?
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmState('NONE')}
                  className="text-xs font-sans font-bold uppercase tracking-wider"
                >
                  ОТМЕНА
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmRestart}
                  className="text-xs font-sans font-bold uppercase tracking-wider"
                >
                  ДА, СБРОС
                </Button>
              </div>
            </div>
          ) : confirmState === 'LOBBY' ? (
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/90 border border-rose-500/40 text-center">
              <p className="text-xs text-zinc-200 font-sans font-medium">
                Прервать текущий матч и вернуть телевизор в комнату ожидания?
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmState('NONE')}
                  className="text-xs font-sans font-bold uppercase tracking-wider"
                >
                  ОТМЕНА
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmLobby}
                  className="text-xs font-sans font-bold uppercase tracking-wider"
                >
                  В ЛОББИ
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Кнопка Пауза / Продолжить */}
              <Button
                data-testid="remote-pause-btn"
                variant={isTvPaused ? "primary" : "secondary"}
                fullWidth
                onClick={handleTogglePause}
                className="font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>{isTvPaused ? 'ПРОДОЛЖИТЬ МАТЧ НА ТВ' : 'ПАУЗА НА ТВ'}</span>
              </Button>

              {/* Кнопка Mute / Unmute */}
              <Button
                variant="secondary"
                fullWidth
                onClick={handleToggleMute}
                className="font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isTvMuted ? (
                  <>
                    <Icons.VolumeOff className="w-4 h-4 text-rose-400" />
                    <span>ВКЛЮЧИТЬ ЗВУК ТВ</span>
                  </>
                ) : (
                  <>
                    <Icons.VolumeOn className="w-4 h-4 text-blue-400" />
                    <span>ВЫКЛЮЧИТЬ ЗВУК ТВ (MUTE)</span>
                  </>
                )}
              </Button>

              {/* Кнопки Перезапуск / Выход в лобби */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="secondary"
                  onClick={() => {
                    triggerHaptic('light');
                    setConfirmState('RESTART');
                  }}
                  className="font-sans font-bold text-xs uppercase tracking-wider min-h-[44px]"
                >
                  ПЕРЕЗАПУСК
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    triggerHaptic('light');
                    setConfirmState('LOBBY');
                  }}
                  className="font-sans font-bold text-xs uppercase tracking-wider min-h-[44px]"
                >
                  В ЛОББИ
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
