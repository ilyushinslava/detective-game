import React from "react";
import type { TutorialModule } from "./tutorialBoardSetup";

export interface TutorialGuidePanelProps {
  currentModule: TutorialModule;
  step: number;
}

export const TutorialGuidePanel: React.FC<TutorialGuidePanelProps> = ({
  currentModule,
  step,
}) => {
  return (
    <div className="min-h-[70px] md:min-h-[60px] max-h-[110px] shrink-0 py-1.5 px-4 flex flex-col justify-center items-center text-center z-10 bg-zinc-900/30">
      <div>
        {/* 1. BASICS */}
        {currentModule === "BASICS" && step === 1 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Маневр поля</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Игровое поле состоит из 25 персонажей. Каждый ход вы можете сдвинуть любой ряд или колонку на 1 клетку. Поле замкнуто: персонаж, вышедший за край, возвращается с противоположной стороны.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите стрелку <b className="text-emerald-400">←</b> слева от 3-го ряда.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Ряд сдвинулся влево. Персонаж с левого края перешёл на правый фланг.</div>
            </div>
          </div>
        )}
        {currentModule === "BASICS" && step === 2 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Радиус действия 3×3</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Большинство действий в игре (атаки, кражи, проверки) работают только на 8 соседних клеток вокруг вашего персонажа.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите на любого соседа вокруг вашей карты.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Сосед выбран. До персонажей дальше одной клетки дотянуться нельзя.</div>
            </div>
          </div>
        )}
        {currentModule === "BASICS" && step === 3 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Правило Anti-Undo</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Соперник не может сразу же отменить ваш ход и вернуть ряд назад. Это правило исключает бесконечные повторы.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Обратный сдвиг заблокирован. Завершите первый урок.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Базовые правила движения поля усвоены.</div>
            </div>
          </div>
        )}

        {/* 2. MANIAC_KILLER */}
        {currentModule === "MANIAC_KILLER" && step === 1 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Подвод жертвы</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Ваша цель — Елена Соколова из закрытого списка жертв. Чтобы совершить нападение, подведите её к себе в радиус 3×3.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Сдвиньте 3-ю колонку вниз стрелкой <b className="text-emerald-400">↓</b>.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Елена Соколова оказалась рядом с вами.</div>
            </div>
          </div>
        )}
        {currentModule === "MANIAC_KILLER" && step === 2 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Выбор цели</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Жертва в зоне досягаемости. Выберите её карточку на поле.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите на карточку Елены Соколовой.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Цель выбрана. Оружие готово к выстрелу.</div>
            </div>
          </div>
        )}
        {currentModule === "MANIAC_KILLER" && step === 3 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Ликвидация жертвы</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> При нападении убийца раскрывает своё примерное местоположение: выстрел слышен на соседних клетках.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Ликвидировать цель».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Жертва устранена. Сыщик начинает поиски стрелка.</div>
            </div>
          </div>
        )}
        {currentModule === "MANIAC_KILLER" && step === 4 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Смена маски (Конспирация)</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> После выстрела оставаться в прежнем облике опасно. Смените тайную личность на случайного персонажа из колоды.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Сменить маску».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Вы получили новую тайную личность. Сыщик больше не знает, кем вы управляете.</div>
            </div>
          </div>
        )}
        {currentModule === "MANIAC_KILLER" && step === 5 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Маскировка успешна</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Теперь вы играете за нового жителя. Следы заметены.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Завершите урок за Убийцу.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Навыки маневра, атаки и конспирации освоены.</div>
            </div>
          </div>
        )}

        {/* 3. MANIAC_DETECTIVE */}
        {currentModule === "MANIAC_DETECTIVE" && step === 1 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Проверка алиби</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Убийца стрелял из клеток вокруг жертвы. Все невиновные свидетели подтвердили алиби (синий щит). Убийца — единственный сосед без алиби.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Найдите и выберите подозреваемого без щита алиби.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Подозреваемый вычислен. На нём нет алиби.</div>
            </div>
          </div>
        )}
        {currentModule === "MANIAC_DETECTIVE" && step === 2 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Задержание убийцы</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Когда вы уверены в личности убийцы, проведите задержание.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Задержать подозреваемого».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Убийца задержан. Вы спасли город от опасного преступника.</div>
            </div>
          </div>
        )}
        {currentModule === "MANIAC_DETECTIVE" && step === 3 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Зачистка поля</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Погибшие жители остаются на поле. Действие «Зачистка» сдвигает всех выбывших вниз сетки, а живых поднимает наверх.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Зачистка поля».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Поле уплотнено: живые персонажи сгруппированы сверху, выбывшие — внизу.</div>
            </div>
          </div>
        )}
        {currentModule === "MANIAC_DETECTIVE" && step === 4 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Дело раскрыто</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Вы умеете читать алиби свидетелей, задерживать убийцу и зачищать поле.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Завершите урок за Сыщика.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Основы работы детектива успешно пройдены.</div>
            </div>
          </div>
        )}

        {/* 4. THIEF_ROBBER */}
        {currentModule === "THIEF_ROBBER" && step === 1 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Выбор жертвы кражи</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Грабитель побеждает, если украдёт 8 сокровищ. Красть можно только у соседних жителей в радиусе 3×3.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Выберите любого соседа рядом с собой.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Сейф жителя взломан.</div>
            </div>
          </div>
        )}
        {currentModule === "THIEF_ROBBER" && step === 2 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Кража сокровища</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Совершите кражу, забрав трофей из взломанного сейфа.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Украсть сокровище».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Сокровище получено! Житель ограблен (помечен символом пустого сейфа).</div>
            </div>
          </div>
        )}
        {currentModule === "THIEF_ROBBER" && step === 3 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Смена маски грабителя</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Полиция стягивает патрули к месту кражи. Смените тайную личность, чтобы сбросить хвост.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Сменить маску».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Новая личность получена. Патрульные потеряли след.</div>
            </div>
          </div>
        )}
        {currentModule === "THIEF_ROBBER" && step === 4 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Искусство кражи</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Вы научились выбирать цели кражи, забирать сокровища и вовремя менять маску.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Завершите урок за Грабителя.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Навыки ночного вора усвоены на отлично.</div>
            </div>
          </div>
        )}

        {/* 5. THIEF_POLICE */}
        {currentModule === "THIEF_POLICE" && step === 1 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Патрулирование</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> В режиме «Оцепление» полиция выставляет патрульных с жетонами шерифа. Патрульные контролируют зоны 3×3 вокруг себя.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Выберите любого персонажа на поле для выставления патруля.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Позиция для патрульного поста намечена.</div>
            </div>
          </div>
        )}
        {currentModule === "THIEF_POLICE" && step === 2 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Выставление поста</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Подтвердите отправку патрульного на выбранную позицию.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Выставить патруль».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Патрульный выставлен! Грабитель обнаружен в его секторе.</div>
            </div>
          </div>
        )}
        {currentModule === "THIEF_POLICE" && step === 3 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Арест грабителя</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Грабитель заблокирован и находится в секторе патрульного. Произведите задержание.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Задержать вора».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Грабитель обезврежен! Награбленное возвращено городу.</div>
            </div>
          </div>
        )}

        {/* 6. SECRET_SERVICE */}
        {currentModule === "SECRET_SERVICE" && step === 1 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Выбор цели опроса</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> В «Директиве «Ноль»» оба соперника — тайные шпионы. Вы можете опросить любого жителя на поле, чтобы узнать, находится ли вражеский шпион рядом с ним.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Выберите любого персонажа на поле для проверки радаром.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Цель для сканирования выбрана.</div>
            </div>
          </div>
        )}
        {currentModule === "SECRET_SERVICE" && step === 2 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Опрос радаром</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Запустите сканирование сектора вокруг выбранной цели.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Опрос свидетелей».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Радар запищал: вражеский шпион действительно рядом с этой клеткой!</div>
            </div>
          </div>
        )}
        {currentModule === "SECRET_SERVICE" && step === 3 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Локализация шпиона</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Среди соседей только один агент вызывает подозрение — Марк Воронов (подсвечен красным маркером).</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите на карточку Марка Воронова.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Вражеский агент взят на прицел.</div>
            </div>
          </div>
        )}
        {currentModule === "SECRET_SERVICE" && step === 4 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Разоблачение шпиона</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Сорвите маску с вражеского агента и заберите компромат синдиката.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Разоблачение шпиона».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Вражеский шпион раскрыт! Компромат зачислен на ваш счёт.</div>
            </div>
          </div>
        )}

        {/* 7. LINE_UP */}
        {currentModule === "LINE_UP" && step === 1 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Вопрос по примете</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> В режиме «Очная ставка» соперники отгадывают тайного персонажа друг друга, задавая вопросы о внешности.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Спросить: есть ли головной убор?».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Свидетель отвечает: «Да, подозреваемый был в шляпе».</div>
            </div>
          </div>
        )}
        {currentModule === "LINE_UP" && step === 2 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Исключение неподходящих</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Раз у преступника есть шляпа, все персонажи с непокрытой головой невиновны. Их можно исключить из подозреваемых.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Исключить невиновных».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Все персонажи без шляп получили щит алиби и выбыли из числа подозреваемых.</div>
            </div>
          </div>
        )}
        {currentModule === "LINE_UP" && step === 3 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Единственный подозреваемый</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> После исключения остался единственный подходящий персонаж — Руслан Громов.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите на карточку Руслана Громова в центре поля.</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Руслан Громов выбран для предъявления обвинения.</div>
            </div>
          </div>
        )}
        {currentModule === "LINE_UP" && step === 4 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-400 uppercase tracking-wider mb-0.5">Финальное обвинение</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Все улики сходятся. Предъявите официальное обвинение.</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Предъявить обвинение».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Обвинение подтверждено! Вы выиграли дуэль дедукции.</div>
            </div>
          </div>
        )}
        {currentModule === "LINE_UP" && step === 5 && (
          <div>
            <h3 className="text-sm sm:text-base font-black text-emerald-400 uppercase tracking-wider mb-0.5">Академия пройдена</h3>
            <div className="text-xs text-zinc-300 font-sans leading-relaxed space-y-0.5">
              <div><b className="text-amber-500">КОНТЕКСТ:</b> Вы изучили все 4 режима и ключевые правила игры «Под подозрением (Prime Suspect)». Теперь вы готовы к реальным матчам против игроков и ИИ!</div>
              <div><b className="text-amber-500">ДЕЙСТВИЕ:</b> Нажмите «Завершить обучение».</div>
              <div><b className="text-emerald-400">РЕЗУЛЬТАТ:</b> Курс Академии успешно сдан! Награда начислена.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
