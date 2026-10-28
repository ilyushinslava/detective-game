export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalModal = ({ isOpen, onClose }: LegalModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-4 select-none">
      <div className="w-full max-w-lg bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 shrink-0 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-100">
              Правовая информация & Дисклеймер
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

        <div className="overflow-y-auto space-y-4 text-left text-xs text-zinc-300 pr-1 pb-2 custom-scrollbar flex-1 min-h-0">
          <section className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-black uppercase text-zinc-200 tracking-wider block">
              1. Художественный вымысел (Fiction Disclaimer)
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              «Реквием: Последний выстрел» (The Wicked City) является вымышленным художественным произведением. Все персонажи, имена, организации, события и локации являются плодом авторского воображения. Любые совпадения с реальными людьми, живущими или умершими, а также реальными событиями носят исключительно случайный характер.
            </p>
          </section>

          <section className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-black uppercase text-zinc-200 tracking-wider block">
              2. Интеллектуальная собственность (Intellectual Property)
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Все исключительные права на графические материалы, интерфейсы, звуковой дизайн, игровую механику, правила и исходный программный код защищены. Несанкционированное копирование, распространение или модификация материалов проекта без письменного согласия правообладателя запрещены.
            </p>
          </section>

          <section className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-black uppercase text-zinc-200 tracking-wider block">
              3. Отказ от претензий (AS IS Disclaimer)
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              Программное обеспечение предоставляется на условиях «КАК ЕСТЬ» (AS IS) исключительно в демонстрационных и некоммерческих развлекательных целях. Разработчик не несет ответственности за перебои в сетевом соединении, несовместимость с отдельными устройствами или потерю локального игрового прогресса.
            </p>
          </section>
        </div>

        <div className="pt-3 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition border border-white/5 cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
