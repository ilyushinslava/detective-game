import { useState } from 'react';
import type { GameModeType, OpponentType, Role } from '../types/game';
import { GAME_MODES } from './ModeSelectModal';

interface MainMenuProps {
  onStartGame: (modeId: GameModeType, opponent: OpponentType, playerRole: Role) => void;
  hasActiveGame: boolean;
  onResumeGame: () => void;
}

export const MainMenu = ({ onStartGame, hasActiveGame, onResumeGame }: MainMenuProps) => {
  const [activeTab, setActiveTab] = useState<'MODES' | 'RULES' | 'SETTINGS'>('MODES');
  const [selectedMode, setSelectedMode] = useState<GameModeType>('SKHVATKA');
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentType>('AI');
  const [selectedRole, setSelectedRole] = useState<Role>('DETECTIVE');

  const currentModeInfo = GAME_MODES.find((m) => m.id === selectedMode) ?? GAME_MODES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Шапка в стиле Монополиста */}
        <div className="pt-6 pb-4 px-6 text-center bg-gradient-to-b from-zinc-800/80 to-zinc-900 border-b border-zinc-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-black uppercase tracking-widest mb-2">
            ★ Детективная стратегия
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-zinc-100">
            Город Грехов
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Настольная дедуктивная игра «Нуар»
          </p>

          {/* Вкладки: Режимы, Правила, Настройки */}
          <div className="grid grid-cols-3 gap-1.5 mt-5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('MODES')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'MODES'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Операции
            </button>
            <button
              onClick={() => setActiveTab('RULES')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'RULES'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Справочник
            </button>
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'SETTINGS'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Настройки
            </button>
          </div>
        </div>

        {/* Тело экрана */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'MODES' && (
            <>
              {hasActiveGame && (
                <button
                  onClick={onResumeGame}
                  className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-amber-400 font-black text-xs uppercase tracking-wider rounded-2xl border border-amber-500/40 shadow-lg cursor-pointer transition flex items-center justify-center gap-2 mb-2"
                >
                  <span>▶ Вернуться к текущей партии</span>
                </button>
              )}

              {/* Формат матча */}
              <div className="p-3.5 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Формат дуэли:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedOpponent('AI')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      selectedOpponent === 'AI'
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    🤖 Против бота
                  </button>
                  <button
                    onClick={() => setSelectedOpponent('PVP')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      selectedOpponent === 'PVP'
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    👥 Вдвоем на экране
                  </button>
                </div>
              </div>

              {/* Выбор роли при игре с ботом */}
              {selectedOpponent === 'AI' && (
                <div className="p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-bold">Ваша сторона:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedRole('DETECTIVE')}
                      className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition ${
                        selectedRole === 'DETECTIVE'
                          ? 'bg-blue-950 border-blue-500 text-blue-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {currentModeInfo.detectiveRoleName}
                    </button>
                    <button
                      onClick={() => setSelectedRole('KILLER')}
                      className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition ${
                        selectedRole === 'KILLER'
                          ? 'bg-red-950 border-red-500 text-red-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {currentModeInfo.killerRoleName}
                    </button>
                  </div>
                </div>
              )}

              {/* Список сценариев */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Выберите сценарий операции:
                </span>
                {GAME_MODES.slice(0, 3).map((mode) => {
                  const isSelected = mode.id === selectedMode;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-950 border-amber-500 shadow-lg ring-1 ring-amber-500/50'
                          : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-black text-zinc-100">{mode.title}</span>
                        <span className="text-[10px] text-amber-400 font-mono font-bold">{mode.time}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">{mode.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Кнопка старта */}
              <button
                onClick={() => onStartGame(selectedMode, selectedOpponent, selectedRole)}
                className="w-full py-4 bg-red-800 hover:bg-red-700 active:bg-red-900 text-zinc-100 font-black text-xs uppercase tracking-widest rounded-2xl border border-red-600 shadow-xl cursor-pointer transition mt-2"
              >
                Начать операцию →
              </button>
            </>
          )}

          {activeTab === 'RULES' && (
            <div className="space-y-4 text-left text-xs text-zinc-300">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-amber-400 block mb-1">Общее правило перемещения:</span>
                Каждый ход можно либо сдвинуть ряд/колонку на 1 клетку, либо совершить действие роли. Запрещено отменять последний сдвиг соперника.
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-red-400 block mb-1">1. Схватка:</span>
                Бандит убивает соседей (цель: 14 жертв или Инспектор). Инспектор использует досье алиби и обвиняет соседа.
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-red-400 block mb-1">2. Маньяк против Оперативника:</span>
                Маньяк устраняет 4 открытые цели из списка смертников. Оперативник ищет убийцу до конца серии.
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-red-400 block mb-1">3. Охота на грабителя:</span>
                Грабитель ворует сокровища у соседей (цель: 5 краж) и меняет маски. Полиция блокирует улицы патрулями 🚔 и производит арест.
              </div>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="space-y-3 text-xs text-zinc-300">
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold block text-zinc-100">Звуковые эффекты Web Audio</span>
                  <span className="text-[10px] text-zinc-500">Щелчки сдвига, выстрелы и аресты</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold">ВКЛ</span>
              </div>
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold block text-zinc-100">Тактильная отдача (Haptics)</span>
                  <span className="text-[10px] text-zinc-500">Вибрация Android / iOS Taptic</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold">ВКЛ</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
