import { useState } from 'react';
import type { GameModeType, OpponentType, Role } from '../types/game';
import { GAME_MODES } from './ModeSelectModal';
import { sounds } from '../utils/audio';
import { triggerHaptic, getHapticsEnabled, setHapticsEnabled } from '../utils/haptics';

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

  // Интерактивные настройки
  const [soundActive, setSoundActive] = useState<boolean>(() => sounds.getEnabled());
  const [hapticActive, setHapticActive] = useState<boolean>(() => getHapticsEnabled());

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    sounds.setEnabled(next);
    if (next) sounds.playShift();
  };

  const toggleHapticSetting = () => {
    const next = !hapticActive;
    setHapticActive(next);
    setHapticsEnabled(next);
    if (next) triggerHaptic('medium');
  };

  const currentModeInfo = GAME_MODES.find((m) => m.id === selectedMode) ?? GAME_MODES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-2 sm:p-4 overflow-y-auto select-none font-sans">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto max-h-[92vh]">
        {/* Шапка в стиле Монополиста */}
        <div className="pt-5 pb-3 px-5 text-center bg-gradient-to-b from-zinc-800/80 to-zinc-900 border-b border-zinc-800 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1.5">
            ★ Детективная стратегия
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-zinc-100">
            Город Грехов
          </h1>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Настольная дедуктивная игра «Нуар»
          </p>

          {/* Вкладки: Операции, Справочник, Настройки */}
          <div className="grid grid-cols-3 gap-1.5 mt-3.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
            <button
              onClick={() => { triggerHaptic('light'); setActiveTab('MODES'); }}
              className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'MODES'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Операции
            </button>
            <button
              onClick={() => { triggerHaptic('light'); setActiveTab('RULES'); }}
              className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'RULES'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Справочник
            </button>
            <button
              onClick={() => { triggerHaptic('light'); setActiveTab('SETTINGS'); }}
              className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
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
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {activeTab === 'MODES' && (
            <>
              {hasActiveGame && (
                <button
                  onClick={onResumeGame}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-amber-400 font-black text-xs uppercase tracking-wider rounded-xl border border-amber-500/40 shadow-lg cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <span>▶ Вернуться к текущей партии</span>
                </button>
              )}

              {/* Формат матча */}
              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Формат дуэли:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { triggerHaptic('light'); setSelectedOpponent('AI'); }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      selectedOpponent === 'AI'
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-black'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    🤖 Против бота
                  </button>
                  <button
                    onClick={() => { triggerHaptic('light'); setSelectedOpponent('PVP'); }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                      selectedOpponent === 'PVP'
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-black'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    👥 Вдвоем (1 на 1)
                  </button>
                </div>
              </div>

              {/* Выбор роли при игре с ботом */}
              {selectedOpponent === 'AI' && (
                <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-bold text-[11px]">Ваша сторона:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { triggerHaptic('light'); setSelectedRole('DETECTIVE'); }}
                      className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition ${
                        selectedRole === 'DETECTIVE'
                          ? 'bg-blue-950 border-blue-500 text-blue-200 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {currentModeInfo.detectiveRoleName}
                    </button>
                    <button
                      onClick={() => { triggerHaptic('light'); setSelectedRole('KILLER'); }}
                      className={`px-3 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition ${
                        selectedRole === 'KILLER'
                          ? 'bg-red-950 border-red-500 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {currentModeInfo.killerRoleName}
                    </button>
                  </div>
                </div>
              )}

              {/* Полный список всех 6 сценариев */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Сценарии игры:
                </span>
                {GAME_MODES.map((mode) => {
                  const isSelected = mode.id === selectedMode;
                  const isAvailable = mode.isAvailable;

                  return (
                    <div
                      key={mode.id}
                      onClick={() => {
                        if (isAvailable) {
                          triggerHaptic('light');
                          setSelectedMode(mode.id);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all ${
                        !isAvailable
                          ? 'bg-zinc-950/40 border-zinc-800/40 opacity-55 cursor-not-allowed'
                          : isSelected
                          ? 'bg-zinc-950 border-amber-500 shadow-md ring-1 ring-amber-500/50 cursor-pointer'
                          : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-black text-zinc-100">{mode.title}</span>
                          <span className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold ${
                            isAvailable
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {isAvailable ? 'Дуэль 1х1' : '🔒 Скоро (3+ игр.)'}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-400 font-mono font-bold shrink-0">{mode.time}</span>
                      </div>
                      <p className="text-[10.5px] text-zinc-400 leading-snug">{mode.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Кнопка запуска */}
              <button
                onClick={() => {
                  triggerHaptic('heavy');
                  onStartGame(selectedMode, selectedOpponent, selectedRole);
                }}
                className="w-full py-3.5 bg-red-900 hover:bg-red-800 active:bg-red-950 text-red-100 font-black text-xs uppercase tracking-widest rounded-xl border border-red-700 shadow-xl cursor-pointer transition mt-2"
              >
                Начать операцию →
              </button>
            </>
          )}

          {activeTab === 'RULES' && (
            <div className="space-y-3 text-left text-xs text-zinc-300">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-amber-400 block mb-1">Общее правило перемещения:</span>
                Каждый ход игрок обязан либо сдвинуть один ряд/колонку на 1 клетку со смещением, либо выполнить специальное действие роли. Запрещено отменять последний ход соперника!
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-red-400 block mb-1">1. Схватка (Бандит против инспектора):</span>
                Бандит устраняет смежные цели (цель: 14 жертв или ликвидация Инспектора). Инспектор оправдывает подозрения из досье алиби и обвиняет соседа.
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-red-400 block mb-1">2. Маньяк против Оперативника:</span>
                Маньяк устраняет 4 открытые цели строго из списка смертников. Оперативник ищет убийцу до завершения кровавой серии.
              </div>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-red-400 block mb-1">3. Охота на грабителя:</span>
                Грабитель ворует сокровища у соседей (цель: 5 краж) и меняет маски. Полиция перекрывает улицы патрулями 🚔 и проводит задержание.
              </div>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="space-y-3 text-xs text-zinc-300">
              {/* Кликабельный переключатель звука */}
              <div
                onClick={toggleSound}
                className="p-3.5 bg-zinc-950 hover:bg-zinc-900 active:scale-[0.99] rounded-xl border border-zinc-800 flex items-center justify-between cursor-pointer transition select-none"
              >
                <div>
                  <span className="font-bold block text-zinc-100">Звуковые эффекты (Web Audio)</span>
                  <span className="text-[10px] text-zinc-500">Щелчки сдвига, выстрелы и аресты</span>
                </div>
                <button
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                    soundActive
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                >
                  {soundActive ? 'ВКЛ' : 'ВЫКЛ'}
                </button>
              </div>

              {/* Кликабельный переключатель вибрации */}
              <div
                onClick={toggleHapticSetting}
                className="p-3.5 bg-zinc-950 hover:bg-zinc-900 active:scale-[0.99] rounded-xl border border-zinc-800 flex items-center justify-between cursor-pointer transition select-none"
              >
                <div>
                  <span className="font-bold block text-zinc-100">Тактильная отдача (Вибрация)</span>
                  <span className="text-[10px] text-zinc-500">Вибро Android, Telegram и iOS Taptic</span>
                </div>
                <button
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                    hapticActive
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                >
                  {hapticActive ? 'ВКЛ' : 'ВЫКЛ'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
