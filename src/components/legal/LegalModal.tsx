import React from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Icons } from "../ui/Icons";
import { soundManager } from "../../utils/audio";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose }) => {
  const handleClose = () => {
    soundManager.play("tapMenu");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      showCloseButton={true}
      maxWidth="max-w-lg"
      className="text-left max-h-[85vh] flex flex-col"
    >
      <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
          <Icons.Scale className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            Правовая информация
          </h2>
          <p className="text-[10px] font-mono text-zinc-400">
            Дисклеймер, статус валюты и лицензии
          </p>
        </div>
      </div>

      <div className="overflow-y-auto custom-scrollbar pr-1 my-3 space-y-4 text-xs font-mono text-zinc-300 leading-relaxed">
        {/* 1. Вымышленность */}
        <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            1. Вымышленность событий и персонажей
          </h3>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Игра «Под подозрением» (Prime Suspect) является художественным интерактивным произведением в жанре детективной стратегии в стиле Neo-Noir. Все имена персонажей, позывные, портреты, диалоги, биографии и события являются полностью вымышленными.
          </p>
          <p className="text-zinc-500 text-[11px] leading-relaxed">
            Любые совпадения с реальными людьми (живущими или умершими), сотрудниками правоохранительных органов, организациями или реальными инцидентами носят случайный характер.
          </p>
        </div>

        {/* 2. Статус игровой валюты */}
        <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            2. Внутриигровая валюта и статус проекта
          </h3>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Виртуальные ресурсы игры (монеты и рейтинг) представляют собой исключительно внутриигровые очки прогресса.
          </p>
          <p className="text-zinc-500 text-[11px] leading-relaxed">
            Внутриигровая валюта не имеет реальной финансовой стоимости, не подлежит обмену на фиатные средства, криптовалюту или материальные ценности. Игра не является азартной игрой, не содержит механик тотализатора, ставок или игры на реальные деньги.
          </p>
        </div>

        {/* 3. Авторские права и используемые материалы */}
        <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            3. Авторские права и материалы
          </h3>
          <ul className="space-y-1.5 text-[11px] text-zinc-400">
            <li className="flex items-start gap-1.5">
              <span className="text-blue-400 font-bold">•</span>
              <span>
                <strong className="text-zinc-200">Аудиоматериалы:</strong> Звуковые эффекты и фоновый амбиент получены по лицензии Pixabay Content License (свободное коммерческое и некоммерческое использование).
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-blue-400 font-bold">•</span>
              <span>
                <strong className="text-zinc-200">Портреты персонажей:</strong> Графические изображения подозреваемых и агентов созданы с использованием технологий генеративных нейросетей (AI-генерация) и адаптированы под стилистику Neo-Noir.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-blue-400 font-bold">•</span>
              <span>
                <strong className="text-zinc-200">Шрифты:</strong> В проекте используются шрифты Inter, Oswald, Rajdhani и JetBrains Mono, распространяемые по открытой лицензии SIL Open Font License, Version 1.1.
              </span>
            </li>
          </ul>
        </div>

        {/* 4. Ограничение ответственности */}
        <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            4. Ограничение ответственности
          </h3>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Программное обеспечение предоставляется по принципу «как есть» (AS IS). Разработчики не несут ответственности за перебои в работе сторонних каналов связи, облачных сервисов или задержки синхронизации при игре в мультиплеере.
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-white/10 shrink-0">
        <Button
          variant="primary"
          onClick={handleClose}
          className="w-full"
        >
          Понятно
        </Button>
      </div>
    </Modal>
  );
};
