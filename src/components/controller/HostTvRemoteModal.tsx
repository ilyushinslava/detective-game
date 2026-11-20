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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="neo-card w-full max-w-sm border-zinc-700/80 bg-zinc-950/95 p-6 shadow-2xl relative overflow-hidden transition-all duration-200">
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />

        {/* Заголовок пульта */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-600/40 flex items-center justify-center text-blue-400">
              <Icons.Tv className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider text-zinc-100 font-mono">
                ТВ Пульт Хоста
              </h3>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
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
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <Icons.Close className="w-4 h-4" />
          </button>
        </div>

        {/* Тело управления */}
        <div className="py-4 space-y-3">
          {confirmState === 'RESTART' ? (
            <div className="space-y-3 p-4 rounded-xl bg-zinc-900/90 border border-amber-500/40 text-center">
              <p className="text-xs text-zinc-200 font-medium">
                Перезапустить матч на телевизоре для всех участников?
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmState('NONE')}
                  className="text-xs font-mono"
                >
                  ОТМЕНА
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmRestart}
                  className="text-xs font-mono"
                >
                  ДА, СБРОС
                </Button>
              </div>
            </div>
          ) : confirmState === 'LOBBY' ? (
            <div className="space-y-3 p-4 rounded-xl bg-zinc-900/90 border border-rose-500/40 text-center">
              <p className="text-xs text-zinc-200 font-medium">
                Прервать текущий матч и вернуть телевизор в комнату ожидания?
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmState('NONE')}
                  className="text-xs font-mono"
                >
                  ОТМЕНА
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmLobby}
                  className="text-xs font-mono"
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
                className="font-mono text-xs tracking-wider flex items-center justify-center gap-2"
              >
                <span>{isTvPaused ? 'ПРОДОЛЖИТЬ МАТЧ НА ТВ' : 'ПАУЗА НА ТВ'}</span>
              </Button>

              {/* Кнопка Mute / Unmute */}
              <Button
                variant="secondary"
                fullWidth
                onClick={handleToggleMute}
                className="font-mono text-xs tracking-wider flex items-center justify-center gap-2"
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
                  className="font-mono text-xs tracking-wider"
                >
                  ПЕРЕЗАПУСК
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    triggerHaptic('light');
                    setConfirmState('LOBBY');
                  }}
                  className="font-mono text-xs tracking-wider"
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
