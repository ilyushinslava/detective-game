import { useState } from 'react';
import type { Character, GameModeType, OpponentType, Role } from '../types/game';

interface RoleRevealModalProps {
  mode: GameModeType;
  opponent: OpponentType;
  playerRole: Role;
  killer: Character | undefined;
  detective: Character | undefined;
  inspectorChoices: Character[];
  onSelectDetectiveRole: (id: string) => void;
  onComplete: () => void;
}

export const RoleRevealModal = ({
  mode,
  opponent,
  playerRole,
  killer,
  detective,
  inspectorChoices,
  onSelectDetectiveRole,
  onComplete,
}: RoleRevealModalProps) => {
  // Названия ролей для модалки
  let role1Name = 'Бандит';
  let role2Name = 'Инспектор';
  let role1Goal = 'Ликвидация Инспектора или 14 жертв';
  let role2Goal = 'Вычислить Бандита через допросы алиби';

  if (mode === 'MANIAC_VS_OPERATIVE') {
    role1Name = 'Маньяк';
    role2Name = 'Оперативник';
    role1Goal = 'Устранить 4 цели строго по открытому списку жертв';
    role2Goal = 'Вычислить Маньяка до завершения серии из 4 смертей';
  } else if (mode === 'THIEF_HUNT') {
    role1Name = 'Грабитель';
    role2Name = 'Полиция';
    role1Goal = 'Похитить 5 сокровищ у соседей и менять маски';
    role2Goal = 'Выставлять патрули на улицы и арестовать Грабителя';
  }

  // Определение стартового экрана
  const isSoloVsBot = opponent === 'AI';
  
  // Фазы:
  // Для PVP: KILLER_PROMPT -> KILLER_REVEAL -> DETECTIVE_PROMPT -> (DETECTIVE_CHOOSE или DETECTIVE_REVEAL)
  // Для Solo: сразу показ роли игрока
  const [phase, setPhase] = useState<string>(() => {
    if (isSoloVsBot) {
      return playerRole === 'KILLER' ? 'SOLO_KILLER' : (mode === 'SKHVATKA' ? 'SOLO_DETECTIVE_CHOOSE' : 'SOLO_DETECTIVE_REVEAL');
    }
    return 'KILLER_PROMPT';
  });

  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);

  const handleConfirmChoices = () => {
    if (selectedInspectorId) {
      onSelectDetectiveRole(selectedInspectorId);
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-xl min-h-[460px] bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between text-center">
        
        {/* --- SOLO РЕЖИМ (ПРОТИВ БОТА) --- */}
        {phase === 'SOLO_KILLER' && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto w-full">
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-2">
                Ваша секретная личность в операции
              </span>
              <div className="w-full max-w-sm p-5 rounded-2xl bg-zinc-950 border border-red-900/60 shadow-xl mb-4">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
                  Личное дело
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-100">
                  {killer?.name ?? 'Неизвестно'}
                </h2>
              </div>
              <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-400 space-y-1.5 text-left w-full font-mono max-w-sm">
                <div>• Роль: <b className="text-red-400">{role1Name}</b></div>
                <div>• Задача: {role1Goal}</div>
                <div>• Соперник: Бот-компьютер ({role2Name})</div>
              </div>
            </div>
            <button
              onClick={onComplete}
              className="w-full py-4 bg-red-900 hover:bg-red-800 text-red-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-red-700 transition cursor-pointer shadow-lg"
            >
              Начать операцию →
            </button>
          </>
        )}

        {phase === 'SOLO_DETECTIVE_REVEAL' && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto w-full">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-2">
                Ваша секретная личность в операции
              </span>
              <div className="w-full max-w-sm p-5 rounded-2xl bg-zinc-950 border border-blue-900/60 shadow-xl mb-4">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
                  Личное дело
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-100">
                  {detective?.name ?? 'Неизвестно'}
                </h2>
              </div>
              <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-400 space-y-1.5 text-left w-full font-mono max-w-sm">
                <div>• Роль: <b className="text-blue-400">{role2Name}</b></div>
                <div>• Задача: {role2Goal}</div>
                <div>• Соперник: Бот-компьютер ({role1Name})</div>
              </div>
            </div>
            <button
              onClick={onComplete}
              className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-blue-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-blue-700 transition cursor-pointer shadow-lg"
            >
              Начать расследование →
            </button>
          </>
        )}

        {phase === 'SOLO_DETECTIVE_CHOOSE' && (
          <>
            <div className="flex flex-col items-center flex-1 justify-center w-full my-auto">
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1">
                Выбор прикрытия (1 из 4 карт)
              </span>
              <p className="text-xs text-zinc-400 mb-4">
                Остальные 3 карты составят ваше досье алиби для расследования.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full">
                {inspectorChoices.map((char) => {
                  const isSelected = selectedInspectorId === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedInspectorId(char.id)}
                      className={`relative flex flex-col justify-between p-3.5 rounded-xl border text-left cursor-pointer transition select-none min-h-[85px] ${
                        isSelected
                          ? 'bg-blue-950 border-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.35)] scale-[1.02]'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                        <span>#{char.id.replace('c', '').padStart(2, '0')}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
                      </div>
                      <div className="text-sm font-black text-zinc-100 mt-1">
                        {char.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={handleConfirmChoices}
              disabled={!selectedInspectorId}
              className="w-full py-4 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-emerald-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-emerald-700 transition cursor-pointer disabled:cursor-not-allowed shadow-lg mt-4"
            >
              Подтвердить прикрытие и начать игру
            </button>
          </>
        )}

        {/* --- PVP РЕЖИМ (ВДВОЕМ НА ОДНОМ ЭКРАНЕ) --- */}
        {phase === 'KILLER_PROMPT' && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-14 h-14 rounded-full bg-red-950/70 border border-red-700 flex items-center justify-center text-red-400 font-black text-lg mb-4 shadow-lg">
                1
              </div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-100 mb-2">
                Ознакомление: {role1Name}
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                Убедитесь, что второй игрок не смотрит на экран перед раскрытием тайной личности.
              </p>
            </div>
            <button
              onClick={() => setPhase('KILLER_REVEAL')}
              className="w-full py-4 bg-red-900 hover:bg-red-800 text-red-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-red-700 transition cursor-pointer shadow-lg"
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
                <div>• Роль: <b className="text-red-400">{role1Name}</b></div>
                <div>• Задача: {role1Goal}</div>
              </div>
            </div>
            <button
              onClick={() => setPhase('DETECTIVE_PROMPT')}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-xl border border-zinc-700 transition cursor-pointer shadow-lg"
            >
              Скрыть роль и передать сопернику
            </button>
          </>
        )}

        {phase === 'DETECTIVE_PROMPT' && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto">
              <div className="w-14 h-14 rounded-full bg-blue-950/70 border border-blue-700 flex items-center justify-center text-blue-400 font-black text-lg mb-4 shadow-lg">
                2
              </div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-100 mb-2">
                Ознакомление: {role2Name}
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                {role1Name} передал устройство. Ознакомьтесь со своей ролью.
              </p>
            </div>
            <button
              onClick={() => setPhase(mode === 'SKHVATKA' ? 'DETECTIVE_CHOOSE' : 'DETECTIVE_REVEAL')}
              className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-blue-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-blue-700 transition cursor-pointer shadow-lg"
            >
              Посмотреть роль
            </button>
          </>
        )}

        {phase === 'DETECTIVE_REVEAL' && (
          <>
            <div className="flex flex-col items-center justify-center flex-1 my-auto w-full">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-2">
                Твоя секретная личность
              </span>
              <div className="w-full max-w-sm p-5 rounded-2xl bg-zinc-950 border border-blue-900/60 shadow-xl mb-4">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">
                  Личное дело
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-100">
                  {detective?.name}
                </h2>
              </div>
              <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-400 space-y-1.5 text-left w-full font-mono max-w-sm">
                <div>• Роль: <b className="text-blue-400">{role2Name}</b></div>
                <div>• Задача: {role2Goal}</div>
              </div>
            </div>
            <button
              onClick={onComplete}
              className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-blue-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-blue-700 transition cursor-pointer shadow-lg"
            >
              Начать партию →
            </button>
          </>
        )}

        {phase === 'DETECTIVE_CHOOSE' && (
          <>
            <div className="flex flex-col items-center flex-1 justify-center w-full my-auto">
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1">
                Выбор роли (1 из 4 карт)
              </span>
              <p className="text-xs text-zinc-400 mb-4">
                Остальные 3 карты составят твою начальную руку доказательств (алиби).
              </p>

              <div className="grid grid-cols-2 gap-3 w-full">
                {inspectorChoices.map((char) => {
                  const isSelected = selectedInspectorId === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedInspectorId(char.id)}
                      className={`relative flex flex-col justify-between p-3.5 rounded-xl border text-left cursor-pointer transition select-none min-h-[85px] ${
                        isSelected
                          ? 'bg-blue-950 border-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.35)] scale-[1.02]'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                        <span>#{char.id.replace('c', '').padStart(2, '0')}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
                      </div>
                      <div className="text-sm font-black text-zinc-100 mt-1">
                        {char.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={handleConfirmChoices}
              disabled={!selectedInspectorId}
              className="w-full py-4 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-emerald-100 text-xs font-bold uppercase tracking-wider rounded-xl border border-emerald-700 transition cursor-pointer disabled:cursor-not-allowed shadow-lg mt-4"
            >
              Подтвердить выбор и начать партию
            </button>
          </>
        )}

      </div>
    </div>
  );
};
