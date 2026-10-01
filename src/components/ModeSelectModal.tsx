import { useState } from 'react';
import type { GameModeType, OpponentType, Role } from '../types/game';

export interface GameModeInfo {
  id: GameModeType;
  title: string;
  players: string;
  time: string;
  difficulty: 'Легкая' | 'Средняя' | 'Высокая';
  description: string;
  isAvailable: boolean;
  killerRoleName: string;
  detectiveRoleName: string;
}

export const GAME_MODES: GameModeInfo[] = [
  {
    id: 'SKHVATKA',
    title: 'Схватка',
    players: '2 игрока / Соло',
    time: '15 минут',
    difficulty: 'Легкая',
    description: 'Охотник против добычи. Бандит пытается устранить 14 целей или инспектора, а инспектор собирает алиби и берет след.',
    isAvailable: true,
    killerRoleName: 'Бандит',
    detectiveRoleName: 'Инспектор',
  },
  {
    id: 'MANIAC_VS_OPERATIVE',
    title: 'Маньяк против Оперативника',
    players: '2 игрока / Соло',
    time: '20 минут',
    difficulty: 'Средняя',
    description: 'Маньяк ведет кровавую серию строго по списку 4 открытых жертв. Оперативник вычисляет убийцу до завершения серии из 4 смертей.',
    isAvailable: true,
    killerRoleName: 'Маньяк',
    detectiveRoleName: 'Оперативник',
  },
  {
    id: 'SECRET_SERVICE',
    title: 'Секретная служба',
    players: '2 игрока / Соло',
    time: '25 минут',
    difficulty: 'Легкая',
    description: 'Шпионская дуэль равных агентов. Допрашивайте свидетелей, разоблачайте вражеского шпиона и захватите 2 трофейных досье.',
    isAvailable: true,
    killerRoleName: 'Агент «Восток»',
    detectiveRoleName: 'Агент «Запад»',
  },
  {
    id: 'THIEF_HUNT',
    title: 'Охота на грабителя',
    players: '2 игрока / Соло',
    time: '25 минут',
    difficulty: 'Высокая',
    description: 'Виртуозный взломщик пытается похитить 5 сокровищ, меняя личности, пока полиция перекрывает кварталы патрулями.',
    isAvailable: true,
    killerRoleName: 'Вор',
    detectiveRoleName: 'Шериф',
  },
  {
    id: 'EUROPOL_VS_OPG',
    title: 'Европол против ОПГ',
    players: '2 игрока / Соло',
    time: '35 минут',
    difficulty: 'Высокая',
    description: 'Война спецподразделений против синдиката: снайперы, минеры, защитные бронежилеты и штурмовые протоколы.',
    isAvailable: true,
    killerRoleName: 'Синдикат (ОПГ)',
    detectiveRoleName: 'Спецназ Европола',
  },
  {
    id: 'SPANISH_HEIST',
    title: 'Ограбление по-испански',
    players: '2 игрока / Соло',
    time: '30 минут',
    difficulty: 'Высокая',
    description: 'Дерзкое ограбление казино: банда должна взломать 3 угловых хранилища, пока охрана не заблокировала периметр.',
    isAvailable: true,
    killerRoleName: 'Грабители',
    detectiveRoleName: 'Охрана казино',
  },
];

interface ModeSelectModalProps {
  currentModeId: string;
  hasActiveGame: boolean;
  onSelectMode: (modeId: GameModeType) => void;
  onResumeGame: () => void;
  onStartNewGame: (modeId: GameModeType, opponent: OpponentType, playerRole: Role) => void;
}

export const ModeSelectModal = ({
  currentModeId,
  hasActiveGame,
  onSelectMode,
  onResumeGame,
  onStartNewGame,
}: ModeSelectModalProps) => {
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentType>('AI');
  const [selectedPlayerRole, setSelectedPlayerRole] = useState<Role>('DETECTIVE');

  const selectedMode = GAME_MODES.find((m) => m.id === currentModeId) ?? GAME_MODES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4">
      <div className="w-full max-w-4xl max-h-[92vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur z-10 shrink-0">
          <div>
            <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-zinc-100">
              Выбор операции
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              Единый город грехов, 50 досье горожан и 6 криминальных сценариев
            </p>
          </div>
          {hasActiveGame && (
            <button
              onClick={onResumeGame}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3.5 py-2 rounded-lg border border-zinc-700 transition cursor-pointer font-bold shrink-0 ml-2"
            >
              ✕ Закрыть
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-zinc-200 block">
                Формат матча:
              </span>
              <span className="text-[10px] text-zinc-400">
                Сражайтесь против умного компьютерного бота или вдвоем на одном экране
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setSelectedOpponent('AI')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  selectedOpponent === 'AI'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                🤖 Против бота
              </button>

              <button
                onClick={() => setSelectedOpponent('PVP')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  selectedOpponent === 'PVP'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                👥 Вдвоем на одном экране
              </button>
            </div>
          </div>

          {/* Строго динамические стороны под выбранный сценарий */}
          {selectedOpponent === 'AI' && (
            <div className="mb-5 p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
              <div>
                <span className="text-zinc-300 font-bold block">Ваша сторона в операции:</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Сценарий: {selectedMode.title}
                </span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedPlayerRole('DETECTIVE')}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg border font-bold text-xs cursor-pointer transition flex items-center justify-center gap-1.5 ${
                    selectedPlayerRole === 'DETECTIVE'
                      ? 'bg-blue-950 border-blue-500 text-blue-200 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>{selectedMode.detectiveRoleName}</span>
                </button>

                <button
                  onClick={() => setSelectedPlayerRole('KILLER')}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg border font-bold text-xs cursor-pointer transition flex items-center justify-center gap-1.5 ${
                    selectedPlayerRole === 'KILLER'
                      ? 'bg-red-950 border-red-500 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span>{selectedMode.killerRoleName}</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {GAME_MODES.map((mode) => {
              const isSelected = mode.id === currentModeId;
              return (
                <div
                  key={mode.id}
                  className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all bg-zinc-950 border-zinc-800 hover:border-zinc-600 active:scale-[0.99] cursor-pointer shadow-md ${
                    isSelected ? 'ring-2 ring-amber-500 border-amber-500 bg-zinc-950' : ''
                  }`}
                  onClick={() => onSelectMode(mode.id)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-emerald-950/90 text-emerald-300 border-emerald-700">
                        Доступно
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono font-bold">
                        {mode.difficulty}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-zinc-100 leading-tight mb-2">
                      {mode.title}
                    </h3>

                    <p className="text-[11px] leading-relaxed mb-4 text-zinc-300">
                      {mode.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span>👥 {mode.players}</span>
                    <span>⏳ {mode.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3 sm:p-5 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur z-10 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          {hasActiveGame ? (
            <>
              <button
                onClick={onResumeGame}
                className="w-full sm:w-auto px-4 py-3 bg-zinc-800 active:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-700 transition cursor-pointer text-center"
              >
                ← Вернуться к текущей партии
              </button>

              <button
                onClick={() => onStartNewGame(currentModeId as GameModeType, selectedOpponent, selectedPlayerRole)}
                className="w-full sm:w-auto px-6 py-3.5 bg-amber-600 active:bg-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg text-center"
              >
                Начать новую партию →
              </button>
            </>
          ) : (
            <button
              onClick={() => onStartNewGame(currentModeId as GameModeType, selectedOpponent, selectedPlayerRole)}
              className="w-full sm:w-auto px-8 py-3.5 bg-amber-600 active:bg-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg text-center"
            >
              Начать выбранную операцию →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
