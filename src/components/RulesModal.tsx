import { useState, useRef } from "react";
import { triggerHaptic } from "../utils/haptics";

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModeTab = "BASE" | "SKHVATKA" | "MANIAC" | "THIEF" | "SECRET_SERVICE" | "LINE_UP";

interface ModeInfo {
  id: ModeTab;
  title: string;
  badge: string;
  format: string;
  desc: string;
  bannerGradient: string;
  borderColor: string;
  badgeColor: string;
  bannerImage?: string;
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
  BASE: {
    id: "BASE",
    title: "Базовые правила",
    badge: "Ядро механик",
    format: "Сетка 5×5 • Все режимы",
    desc: "Универсальные принципы The Wicked City: модульная сетка 5×5 из 25 персонажей, геометрия окружения 3×3, тактические сдвиги и расследования по колоде улик.",
    bannerGradient: "from-blue-950 via-zinc-950/70 to-transparent",
    borderColor: "border-blue-500/40",
    badgeColor: "text-blue-400",
    bannerImage: "/banners/mode-base.webp",
    role1: {
      name: "Криминал",
      badgeColor: "bg-red-950/80 text-red-400 border border-red-700/60",
      goal: "Скрывать тайную личность среди жителей, маневрировать по сетке и устранять цели или накапливать добычу.",
    },
    role2: {
      name: "Закон",
      badgeColor: "bg-blue-950/80 text-blue-300 border border-blue-700/60",
      goal: "Сужать круг подозреваемых через радар 3×3, отсекать невиновных картами алиби и проводить точечные аресты.",
    },
    mechanics: [
      {
        name: "Сетка 5×5 и Зона 3×3",
        desc: "Поле состоит из 25 уникальных персонажей. Соседством считаются до 8 клеток вокруг фигуры (ортогонально и по диагонали). Через край поля соседство не замыкается.",
        tag: "Геометрия",
      },
      {
        name: "Тактический сдвиг",
        desc: "1 раз за ход игрок может сдвинуть любой крайний ряд или колонку на 1 клетку. Вышедшая за край карта циклически возвращается с противоположной стороны.",
        tag: "Маневр",
      },
      {
        name: "Правило Anti-Undo",
        desc: "Строгий инвариант: запрещено делать сдвиг, который в точности возвращает линию в состояние предыдущего хода соперника. Заблокированные направления неактивны.",
        tag: "Инвариант",
      },
      {
        name: "Колода улик и Алиби",
        desc: "В колоде 25 карт, дублирующих жителей на поле. Взятие карты подтверждает алиби персонажа — он гарантированно не является преступником.",
        tag: "Дедукция",
      },
      {
        name: "Зачистка поля",
        desc: "При скоплении устраненных персонажей игрок может сместить погибших к внешнему периметру сетки, освобождая оперативный простор в центре.",
        tag: "Зачистка",
      },
    ],
  },
  SKHVATKA: {
    id: "SKHVATKA",
    title: "Схватка",
    badge: "Городская дуэль",
    format: "5×5 • 2 игрока",
    desc: "Смертельное противостояние в темных кварталах: вычислите скрывающегося бандита до того, как инспектор окажется в его прицеле.",
    bannerGradient: "from-red-950 via-zinc-950/70 to-transparent",
    borderColor: "border-red-500/40",
    badgeColor: "text-red-400",
    bannerImage: "/banners/mode-skhvatka.webp",
    role1: {
      name: "Бандит",
      badgeColor: "bg-red-950/80 text-red-400 border border-red-700/60",
      goal: "Ликвидировать Инспектора прямым выстрелом или устранить 14 жителей города.",
    },
    role2: {
      name: "Инспектор",
      badgeColor: "bg-blue-950/80 text-blue-300 border border-blue-700/60",
      goal: "Вычислить Бандита через опрос свидетелей радаром 3×3 и провести арест.",
    },
    mechanics: [
      {
        name: "Ликвидация (Бандит)",
        desc: "Выстрел по соседней клетке (из 8 соседних). Первый выстрел выполняется вслепую; каждый последующий дает Инспектору радарный отклик свидетелей.",
        tag: "Атака",
      },
      {
        name: "Опрос свидетелей (Инспектор)",
        desc: "Выкладывание карты алиби активирует радар 3×3 вокруг свидетеля: система сообщает, находится ли Бандит в радиусе поражения.",
        tag: "Радар",
      },
      {
        name: "Конспирация",
        desc: "Бандит может сбросить подозрения, взяв новую карту из колоды улик, и сменить тайную личность на любого свободного персонажа без алиби.",
        tag: "Маскировка",
      },
      {
        name: "Арест с поличным",
        desc: "Инспектор объявляет обвинение соседней карте. При успехе партия выиграна; ошибка раскрывает позицию Инспектора (статус «Алиби» не выдается).",
        tag: "Арест",
      },
    ],
  },
  MANIAC: {
    id: "MANIAC",
    title: "Маньяк против Оперативника",
    badge: "Спецоперация",
    format: "5×5 • 2 игрока",
    desc: "Серийный убийца действует по скрытому заказу из 4 жертв. Оперативник идет по горячим следам, чтобы остановить кровавую цепочку.",
    bannerGradient: "from-red-950 via-zinc-950/70 to-transparent",
    borderColor: "border-red-500/40",
    badgeColor: "text-red-400",
    bannerImage: "/banners/mode-maniac.webp",
    role1: {
      name: "Маньяк",
      badgeColor: "bg-red-950/80 text-red-400 border border-red-700/60",
      goal: "Устранить 4 цели из фиксированного списка жертв или ликвидировать Оперативника.",
    },
    role2: {
      name: "Оперативник",
      badgeColor: "bg-blue-950/80 text-blue-300 border border-blue-700/60",
      goal: "Задержать Маньяка до того, как он завершит серию из 4 заказных убийств.",
    },
    mechanics: [
      {
        name: "Фиксированный список жертв",
        desc: "Список состоит ровно из 4 жертв без автопополнения из колоды. Маньяк может атаковать любого соседа для отвода глаз, но прогресс засчитывается только за цель из списка.",
        tag: "Охота",
      },
      {
        name: "Сближение сдвигом",
        desc: "Маньяк и Оперативник двигают линии сетки, чтобы подвести приоритетную цель в радиус удара 3×3.",
        tag: "Маневр",
      },
      {
        name: "Побег маньяка",
        desc: "Маньяк сбрасывает раскрытый след, берет новую тайную личность из колоды улик, но получает штраф: +1 цель в список смертников.",
        tag: "Маскировка",
      },
      {
        name: "Оперативный перехват",
        desc: "Оперативник производит задержание в зоне 3×3 вокруг себя. Ошибка ведет к потере темпа и продвижению списка жертв.",
        tag: "Арест",
      },
    ],
  },
  THIEF: {
    id: "THIEF",
    title: "Охота на грабителя",
    badge: "План-перехват",
    format: "5×5 • 2 игрока",
    desc: "Дерзкий вор-виртуоз похищает сокровища горожан без единого выстрела, а полиция стягивает оцепление и перекрывает улицы патрулями.",
    bannerGradient: "from-blue-950 via-zinc-950/70 to-transparent",
    borderColor: "border-blue-500/40",
    badgeColor: "text-blue-400",
    bannerImage: "/banners/mode-thief.webp",
    role1: {
      name: "Грабитель",
      badgeColor: "bg-red-950/80 text-red-400 border border-red-700/60",
      goal: "Похитить 10 жетонов ценностей у соседей по сетке и скрыться с награбленным.",
    },
    role2: {
      name: "Полиция",
      badgeColor: "bg-blue-950/80 text-blue-300 border border-blue-700/60",
      goal: "Расставить офицеров патруля, заблокировать пути отхода и поймать грабителя с поличным.",
    },
    mechanics: [
      {
        name: "Карманная кража",
        desc: "Вор крадет жетон ценностей у любой из 8 соседних карт без убийства. Цель — 10 сокровищ. Ограбленный житель помечается маркером.",
        tag: "Добыча",
      },
      {
        name: "Смена маски",
        desc: "Грабитель держит в руке пул запасных масок и может мгновенно сменить текущую внешность на карту из руки в любой подходящий момент.",
        tag: "Маскировка",
      },
      {
        name: "Патрули полиции",
        desc: "Полиция выставляет открытые жетоны офицеров на сетку. Зона задержания формируется вокруг любого дежурного патрульного.",
        tag: "Оцепление",
      },
      {
        name: "Блокировка улиц",
        desc: "Линия сетки, на которой дежурит офицер патруля, блокируется для сдвигов грабителя на следующий раунд.",
        tag: "Контроль",
      },
    ],
  },
  SECRET_SERVICE: {
    id: "SECRET_SERVICE",
    title: "Секретная служба",
    badge: "Контрразведка",
    format: "5×5 • 1-4 игрока",
    desc: "Закрытая операция разведок: опрашивайте связных в секторе 3×3, вычисляйте тайных резидентов конкурентов и собирайте трофеи компромата.",
    bannerGradient: "from-indigo-950 via-zinc-950/70 to-transparent",
    borderColor: "border-indigo-500/40",
    badgeColor: "text-indigo-400",
    bannerImage: "/banners/mode-secret.webp",
    role1: {
      name: "Агент Альфа",
      badgeColor: "bg-red-950/80 text-red-400 border border-red-700/60",
      goal: "Первым собрать целевое число трофеев (2 в дуэли, 4 при 3 игроках, 3 при 4 игроках).",
    },
    role2: {
      name: "Агент Омега",
      badgeColor: "bg-blue-950/80 text-blue-300 border border-blue-700/60",
      goal: "Первым собрать целевое число трофеев (2 в дуэли, 4 при 3 игроках, 3 при 4 игроках).",
    },
    mechanics: [
      {
        name: "Перекрестный опрос",
        desc: "Сканирование свидетеля радаром 3×3: связной передает шифровку о присутствии любого вражеского резидента в зоне охвата.",
        tag: "Радар",
      },
      {
        name: "Разоблачение резидента",
        desc: "Вскрытие подозреваемого рядом с собой. При успехе вражеский шпион раскрыт, вы берете трофей, а соперник — новую легенду. Цель: 2 трофея (2P), 4 (3P), 3 (4P).",
        tag: "Трофей",
      },
      {
        name: "Шпионская дуэль",
        desc: "Ход строго передается по кругу между активными разведчиками с сохранением тайны набранных улик и масок.",
        tag: "Регламент",
      },
      {
        name: "Зачистка резидентуры",
        desc: "Раскрытые резиденты смещаются на фланги поля для разблокировки ключевых коридоров маневрирования.",
        tag: "Маневр",
      },
    ],
  },
  LINE_UP: {
    id: "LINE_UP",
    title: "Очная ставка",
    badge: "Интеллектуальная дуэль",
    format: "5×5 • 2 игрока",
    desc: "Чистая детективная дуэль на дедукцию без маневров поля: 25 подозреваемых, банк вопросов, сопоставление улик и штрафы за ложные обвинения.",
    bannerGradient: "from-blue-950 via-zinc-950/70 to-transparent",
    borderColor: "border-blue-500/40",
    badgeColor: "text-blue-400",
    bannerImage: "/banners/mode-lineup.webp",
    role1: {
      name: "Подозреваемый",
      badgeColor: "bg-red-950/80 text-red-400 border border-red-700/60",
      goal: "Запутать следствие, вынудить следователя потратить все улики или сделать ложные обвинения.",
    },
    role2: {
      name: "Следователь",
      badgeColor: "bg-blue-950/80 text-blue-300 border border-blue-700/60",
      goal: "За минимальное число вопросов вычислить загаданного подозреваемого и предъявить обвинение.",
    },
    mechanics: [
      {
        name: "Каталог вопросов",
        desc: "Игрок задает вопросы по признакам персонажей (пол, головной убор, очки, оружие, локация). Ответ соперника строго бинарен: ДА или НЕТ.",
        tag: "Допрос",
      },
      {
        name: "Отсечение алиби",
        desc: "На основе полученных ответов неподходящие подозреваемые исключаются из активного досье, сужая круг поиска до единственной цели.",
        tag: "Дедукция",
      },
      {
        name: "Выдвижение обвинения",
        desc: "В любой момент следователь может назвать имя подозреваемого. Точное попадание — победа, ошибка — немедленное поражение или штраф.",
        tag: "Обвинение",
      },
      {
        name: "Статичное поле",
        desc: "В данном режиме тактические сдвиги линий и ликвидации отключены: побеждает исключительно логика и скорость дедукции.",
        tag: "Формат",
      },
    ],
  },
};

export const RulesModal = ({ isOpen, onClose }: RulesModalProps) => {
  const [activeTab, setActiveTab] = useState<ModeTab>("BASE");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  if (!isOpen) return null;

  const currentMode = MODES_DATA[activeTab];
  const isCrimeOriented = activeTab === "SKHVATKA" || activeTab === "MANIAC";

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

  const tabs: Array<{ id: ModeTab; label: string }> = [
    { id: "BASE", label: "База" },
    { id: "SKHVATKA", label: "Схватка" },
    { id: "MANIAC", label: "Маньяк" },
    { id: "THIEF", label: "Вор" },
    { id: "SECRET_SERVICE", label: "Служба" },
    { id: "LINE_UP", label: "Ставка" },
  ];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-4 select-none"
    >
      <div className="w-full max-w-lg bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-3 shrink-0 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isCrimeOriented ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"} animate-pulse`} />
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-100">
              Справочник правил
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 font-bold text-lg cursor-pointer p-1 transition"
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 shrink-0 custom-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const tabIsCrime = tab.id === "SKHVATKA" || tab.id === "MANIAC";
            const activeClasses = tab.id === "BASE"
              ? "bg-zinc-800 text-zinc-100 border-zinc-500 shadow-[0_0_12px_rgba(255,255,255,0.15)]"
              : tabIsCrime
                ? "bg-red-950/80 text-red-300 border-red-600 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                : "bg-blue-950/80 text-blue-200 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]";

            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab(tab.id);
                }}
                className={`px-3 py-1.5 rounded-xl border text-[10px] sm:text-xs font-black uppercase tracking-wider transition cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? activeClasses
                    : "bg-zinc-900/80 text-zinc-400 border-white/10 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className={`relative w-full h-24 sm:h-28 rounded-2xl overflow-hidden mb-3.5 shrink-0 border ${currentMode.borderColor} shadow-lg bg-zinc-900`}>
          <img
            src={currentMode.bannerImage || "/bg-main.png"}
            alt={currentMode.title}
            className="w-full h-full object-cover object-[center_35%] opacity-50"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith("/bg-main.png")) {
                target.src = "/bg-main.png";
              } else {
                target.style.display = "none";
              }
            }}
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${currentMode.bannerGradient}`} />
          <div className="absolute bottom-2.5 left-3.5 right-3.5 flex justify-between items-end">
            <div>
              <span className={`text-[9px] font-mono font-bold ${currentMode.badgeColor} uppercase tracking-widest block mb-0.5`}>
                {currentMode.badge}
              </span>
              <span className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                {currentMode.title}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-300 bg-black/70 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-sm">
              {currentMode.format}
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
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block ${currentMode.role1.badgeColor}`}>
                  {currentMode.role1.name}
                </span>
                <p className="text-[11px] text-zinc-300 leading-snug">
                  {currentMode.role1.goal}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5 space-y-1">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block ${currentMode.role2.badgeColor}`}>
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
