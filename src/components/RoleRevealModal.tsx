import { useState } from 'react';
import type { Character } from '../types/game';

interface RoleRevealModalProps {
  killer: Character | undefined;
  inspectorChoices: Character[];
  onSelectDetectiveRole: (id: string) => void;
  onComplete: () => void;
}

type Phase = 'KILLER_PROMPT' | 'KILLER_REVEAL' | 'DETECTIVE_PROMPT' | 'DETECTIVE_CHOOSE';

export const RoleRevealModal = ({
  killer,
  inspectorChoices,
  onSelectDetectiveRole,
  onComplete,
}: RoleRevealModalProps) => {
  const [phase, setPhase] = useState<Phase>('KILLER_PROMPT');
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);

  const handleConfirmInspectorRole = () => {
    if (!selectedInspectorId) return;
    onSelectDetectiveRole(selectedInspectorId);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-xl min-h-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between text-center">
        {phase === 'KILLER_PROMPT' && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-14 h-14 rounded-full bg-red-950/70 border border-red-700 flex items-center justify-center text-red-400 font-black text-lg mb-4 shadow-lg shadow-red-950/50">
                1
              </div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-100 mb-2">
                Ознакомление: Бандит
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                Убедитесь, что второй игрок не смотрит на экран перед раскрытием тайной личности.
              </p>
            </div>
            <button
              onClick={() => setPhase('KILLER_REVEAL')}
              className="w-full py-4 bg-red-900/90 hover:bg-red-800 text-red-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-red-700 transition cursor-pointer shadow-lg"
            >
              Посмотреть тайную роль
            </button>
          </>
        )}

        {phase === 'KILLER_REVEAL' && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto w-full">
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-2">
                Твоя секретная личность
              </span>
              <div className="w-full max-w-sm p-5 rounded-2xl bg-zinc-950 border border-red-900/60 shadow-xl mb-4">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
                  Досье подозреваемого
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-100">
                  {killer?.name}
                </h2>
              </div>
              <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-400 space-y-1.5 text-left w-full font-mono max-w-sm">
                <div>• Роль: Бандит</div>
                <div>• Первый ход: обязан убить соседнюю цель</div>
                <div>• Победа: ликвидация Инспектора или 14 жертв</div>
              </div>
            </div>
            <button
              onClick={() => setPhase('DETECTIVE_PROMPT')}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-xl border border-zinc-700 transition cursor-pointer shadow-lg"
            >
              Скрыть роль и передать Инспектору
            </button>
          </>
        )}

        {phase === 'DETECTIVE_PROMPT' && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-14 h-14 rounded-full bg-blue-950/70 border border-blue-700 flex items-center justify-center text-blue-400 font-black text-lg mb-4 shadow-lg shadow-blue-950/50">
                2
              </div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-100 mb-2">
                Ознакомление: Инспектор
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                Бандит передал устройство. Выберите одну тайную личность из 4 полученных карт доказательств.
              </p>
            </div>
            <button
              onClick={() => setPhase('DETECTIVE_CHOOSE')}
              className="w-full py-4 bg-blue-900/90 hover:bg-blue-800 text-blue-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-blue-700 transition cursor-pointer shadow-lg"
            >
              Выбрать тайную личность
            </button>
          </>
        )}

        {phase === 'DETECTIVE_CHOOSE' && (
          <>
            <div className="flex flex-col items-center flex-1 justify-center w-full my-auto">
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1">
                Выбор роли (1 из 4 карт)
              </span>
              <p className="text-xs text-zinc-400 mb-5">
                Остальные 3 карты составят твою начальную руку доказательств (алиби).
              </p>

              <div className="grid grid-cols-2 gap-3.5 w-full">
                {inspectorChoices.map((char) => {
                  const isSelected = selectedInspectorId === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedInspectorId(char.id)}
                      className={`relative flex flex-col justify-between p-4 rounded-xl border text-left cursor-pointer transition-all select-none min-h-[90px] ${
                        isSelected
                          ? 'bg-blue-950/80 border-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.4)] scale-[1.02]'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                          Дело #{char.id}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        )}
                      </div>
                      <div className="text-sm sm:text-base font-black text-zinc-100 mt-2">
                        {char.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={handleConfirmInspectorRole}
              disabled={!selectedInspectorId}
              className="w-full py-4 bg-emerald-900/90 hover:bg-emerald-800 disabled:opacity-40 text-emerald-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-emerald-700 transition cursor-pointer disabled:cursor-not-allowed shadow-lg mt-4"
            >
              Подтвердить выбор и начать партию
            </button>
          </>
        )}
      </div>
    </div>
  );
};
