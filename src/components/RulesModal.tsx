import { useState, useRef } from "react";
import { triggerHaptic } from "../utils/haptics";

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModeTab = "SKHVATKA" | "MANIAC" | "THIEF" | "SECRET_SERVICE";

interface ModeInfo {
  id: ModeTab;
  title: string;
  badge: string;
  subtitle: string;
  desc: string;
  bannerGradient: string;
  borderColor: string;
  role1: {
    name: string;
    badgeColor: string;
    goal: string;
  };
  role2: {
    name: string;
    badgeColor: string;
    goal: string;
  };
  mechanics: Array<{
    name: string;
    desc: string;
    tag?: string;
  }>;
}

const MODES_DATA: Record<ModeTab, ModeInfo> = {
  SKHVATKA: {
    id: "SKHVATKA",
    title: "Схватка",
    badge: "Городская дуэль",
    subtitle: "Дуэль 1 на 1",
    desc: "Смертельное противостояние в темных кварталах города: вычислите скрывающегося бандита до того, как инспектор окажется в его прицеле.",
    bannerGradient: "from-cyan-950 via-zinc-950/60 to-transparent",
    borderColor: "border-cyan-500/40",
    role1: {
      name: "Бандит",
      badgeColor: "bg-red-950 text-red-400 border-red-700/60",
      goal: "Ликвидировать Инспектора или устранить 14 жителей города.",
    },
    role2: {
      name: "Инспектор",
      badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-700/60",
      goal: "Вычислить Бандита через опрос свидетелей радаром и провести задержание.",
    },
    mechanics: [
      {
        name: "Тактический сдвиг",
        desc: "1 раз за ход игрок может циклически сместить свободный ряд или колонку на 1 клетку. Запрещено отменять последний ход соперника.",
        tag: "Маневр",
      },
      {
        name: "Ликвидация (Бандит)",
        desc: "Выстрел по соседней клетке (из 8 соседних). Первый выстрел выполняется вслепую, последующие дают опрос свидетелей.",
        tag: "Атака",
      },
      {
        name: "Допрос алиби (Инспектор)",
        desc: "Выкладывание карты из досье алиби сканирует сектор 3х3 вокруг свидетеля: фиксируется, находится ли Бандит рядом.",
        tag: "Радар",
      },
      {
        name: "Конспирация",
        desc: "Бандит может взять карту из колоды улик и сменить тайную личность на свободного персонажа без алиби.",
        tag: "Защита",
      },
      {
        name: "Зачистка",
        desc: "При скоплении мертвых тел игрок может сместить всех выбывших персонажей в конец сетки, освобождая поле.",
        tag: "Поле",
      },
    ],
  },
  MANIAC: {
    id: "MANIAC",
    title: "Маньяк против Оперативника",
    badge: "Спецоперация",
    subtitle: "Серийный контракт",
    desc: "Серийный убийца действует по скрытому заказу из 4 жертв. Оперативник идет по горячим следам, чтобы остановить кровавую серию.",
    bannerGradient: "from-red-950 via-zinc-950/60 to-transparent",
    borderColor: "border-red-500/40",
    role1: {
      name: "Маньяк",
      badgeColor: "bg-red-950 text-red-400 border-red-700/60",
      goal: "Устранить 4 цели строго по открытой очереди списка жертв или убить Оперативника.",
    },
    role2: {
      name: "Оперативник",
      badgeColor: "bg-amber-950 text-amber-300 border-amber-700/60",
      goal: "Задержать Маньяка до того, как он совершит 4 заказных убийства.",
    },
    mechanics: [
      {
        name: "Очередь целей",
        desc: "Маньяк обязан устранять жертв строго по открытому списку. Ликвидировать можно только текущую первую цель или Оперативника.",
        tag: "Правило",
      },
      {
        name: "Сближение сдвигом",
        desc: "Используйте сдвиги линий сетки, чтобы подвести заказную цель в зону удара (8 соседних клеток).",
        tag: "Маневр",
      },
      {
        name: "Побег Маньяка",
        desc: "Маньяк сбрасывает раскрытый след, берет новую тайную личность из колоды улик и добавляет +1 цель в список смертников.",
        tag: "Конспирация",
      },
      {
        name: "Задержание с риском",
        desc: "Оперативник арестовывает цель рядом с собой. При ошибке одна из целей маньяка скрывается в колоде.",
        tag: "Арест",
      },
    ],
  },
  THIEF: {
    id: "THIEF",
    title: "Охота на грабителя",
    badge: "План-перехват",
    subtitle: "Ограбление века",
    desc: "Дерзкий вор-виртуоз похищает сокровища горожан без единого выстрела, а полиция стягивает оцепление и перекрывает улицы патрулями.",
    bannerGradient: "from-amber-950 via-zinc-950/60 to-transparent",
    borderColor: "border-amber-500/40",
    role1: {
      name: "Грабитель",
      badgeColor: "bg-amber-950 text-amber-300 border-amber-700/60",
      goal: "Похитить 5 жетонов сокровищ у соседних жителей и вовремя менять маски.",
    },
    role2: {
      name: "Полиция",
      badgeColor: "bg-blue-950 text-blue-300 border-blue-700/60",
      goal: "Выставить патрули на перекрестках кварталов и поймать грабителя с поличным.",
    },
    mechanics: [
      {
        name: "Карманная кража",
        desc: "Кража сокровища у любого из 8 соседей (или в своем сейфе) без убийства. Похищенная карта помечается жетоном Синдиката.",
        tag: "Добыча",
      },
      {
        name: "Быстрая маскировка",
        desc: "Грабитель держит в руке 3 карты масок и может моментально сменить лицо на карту из руки в любой удобный момент.",
        tag: "Маска",
      },
      {
        name: "Патрули полиции",
        desc: "Полиция контролирует сектор через форму открытых офицеров: задержание возможно рядом с шерифом или любым патрульным.",
        tag: "Оцепление",
      },
      {
        name: "Блокировка улиц",
        desc: "Выставленный патруль блокирует сдвиг своей линии для грабителя на следующий раунд.",
        tag: "Контроль",
      },
    ],
  },
  SECRET_SERVICE: {
    id: "SECRET_SERVICE",
    title: "Секретная служба",
    badge: "Контрразведка",
    subtitle: "Шпионские игры",
    desc: "Закрытая операция разведок: опрашивайте связных в секторе 3х3, вычисляйте тайных резидентов конкурентов и собирайте трофеи компромата.",
    bannerGradient: "from-purple-950 via-zinc-950/60 to-transparent",
    borderColor: "border-purple-500/40",
    role1: {
      name: "Агент Фантом",
      badgeColor: "bg-purple-950 text-purple-300 border-purple-700/60",
      goal: "Собрать 4 трофея за разоблачение агентов соперника.",
    },
    role2: {
      name: "Агент Призрак",
      badgeColor: "bg-indigo-950 text-indigo-300 border-indigo-700/60",
      goal: "Собрать 4 трофея за разоблачение агентов соперника.",
    },
    mechanics: [
      {
        name: "Перекрестный опрос",
        desc: "Сканирование свидетеля радаром 3х3: связной сообщает, находится ли резидент противника в зоне охвата.",
        tag: "Радар",
      },
      {
        name: "Разоблачение",
        desc: "Вскрытие подозреваемого рядом с собой. При успехе враг раскрыт, вы получаете трофей, а соперник принимает новую личность.",
        tag: "Трофей",
      },
      {
        name: "Правило дуэли",
        desc: "Очередь ходов передается строго между двумя агентами (индексы 0 и 1) с фиксацией набранных улик.",
        tag: "2 Игрока",
      },
      {
        name: "Зачистка улик",
        desc: "Устранение скоплений раскрытых резидентов в крайние линии сетки для открытия новых путей сдвига.",
        tag: "Маневр",
      },
    ],
  },
};

export const RulesModal = ({ isOpen, onClose }: RulesModalProps) => {
  const [activeTab, setActiveTab] = useState<ModeTab>("SKHVATKA");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  if (!isOpen) return null;

  const currentMode = MODES_DATA[activeTab];

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX <= 32) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    } else {
      touchStartRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    if (deltaX > 60 && Math.abs(deltaY) < 40) {
      triggerHaptic("light");
      onClose();
    }
    touchStartRef.current = null;
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-4 select-none"
    >
      <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-3 shrink-0 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-100">
              Справочник правил
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 font-bold text-lg cursor-pointer p-1"
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1 bg-zinc-900/80 p-1 rounded-xl border border-white/10 mb-3 shrink-0">
          {(JSON.parse('["SKHVATKA", "MANIAC", "THIEF", "SECRET_SERVICE"]') as ModeTab[]).map((tab) => {
            const isActive = activeTab === tab;
            const label =
              tab === "SKHVATKA"
                ? "Схватка"
                : tab === "MANIAC"
                  ? "Маньяк"
                  : tab === "THIEF"
                    ? "Вор"
                    : "Служба";
            return (
              <button
                key={tab}
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab(tab);
                }}
                className={`py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition cursor-pointer truncate ${
                  isActive
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className={`relative w-full h-24 sm:h-28 rounded-2xl overflow-hidden mb-3.5 shrink-0 border ${currentMode.borderColor} shadow-lg bg-zinc-900`}>
          <img
            src="./bg-main.png"
            alt={currentMode.title}
            className="w-full h-full object-cover object-[center_35%] opacity-60"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith("/bg-main.png")) target.src = "/bg-main.png";
            }}
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${currentMode.bannerGradient}`} />
          <div className="absolute bottom-2.5 left-3.5 right-3.5 flex justify-between items-end">
            <div>
              <span className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-widest block">
                {currentMode.badge}
              </span>
              <span className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                {currentMode.title}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-300 bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
              5×5 • 2 игрока
            </span>
          </div>
        </div>

        <div className="overflow-y-auto space-y-3 text-left text-xs text-zinc-300 pr-1 pb-2 custom-scrollbar flex-1 min-h-0">
          <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
            {currentMode.desc}
          </p>

          <div className="space-y-1.5">
            <span className="font-black text-zinc-400 block text-[9px] uppercase tracking-widest">
              ЦЕЛИ И ЗАДАЧИ СТОРОН
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border inline-block ${currentMode.role1.badgeColor}`}>
                  {currentMode.role1.name}
                </span>
                <p className="text-[11px] text-zinc-300 leading-snug">
                  {currentMode.role1.goal}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border inline-block ${currentMode.role2.badgeColor}`}>
                  {currentMode.role2.name}
                </span>
                <p className="text-[11px] text-zinc-300 leading-snug">
                  {currentMode.role2.goal}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="font-black text-zinc-400 block text-[9px] uppercase tracking-widest">
              РЕГЛАМЕНТ И МЕХАНИКИ ХОДА
            </span>
            <div className="space-y-2">
              {currentMode.mechanics.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-zinc-100 tracking-wider">
                      {m.name}
                    </span>
                    {m.tag && (
                      <span className="text-[8px] font-mono text-zinc-400 uppercase bg-zinc-950 px-1.5 py-0.5 rounded border border-white/5">
                        {m.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                    {m.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition border border-white/5 cursor-pointer"
          >
            Закрыть справочник
          </button>
        </div>
      </div>
    </div>
  );
};
