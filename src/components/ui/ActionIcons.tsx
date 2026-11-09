import React from 'react';

export const ActionIcons = {
  // 1. Маневр поля — встречные параллельные стрелки маневра линий
  Shift: ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 8h16M4 8l4-4M4 8l4 4" />
      <path d="M20 16H4m16 0l-4-4m4 4l-4 4" />
    </svg>
  ),

  // 2. Ликвидация — строгий оптический прицел ликвидатора с перекрестием
  Kill: ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),

  // 3. Зачистка — метла/щётка заметания следов и улик преступления
  Cleanup: ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 4l1 1-9 9-2-2 9-9a1.4 1.4 0 0 1 1 1z" />
      <path d="M9 13l-4 4v3h3l4-4" />
      <line x1="4" y1="20" x2="8" y2="20" />
      <line x1="2" y1="17" x2="4" y2="15" />
    </svg>
  ),

  // 4. Проверка алиби — протокол досье с галочкой подтверждённого алиби
  Exonerate: ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15l2 2 4-4" strokeWidth="2.5" />
    </svg>
  ),

  // 5. Задержание — наручники ареста (два кольца с замком и соединительной цепью)
  Arrest: ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="7" cy="14" r="4.5" />
      <circle cx="17" cy="14" r="4.5" />
      <path d="M7 9.5V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2.5" />
      <line x1="12" y1="5" x2="12" y2="8" />
    </svg>
  ),

  // 6. Опрос свидетелей / Вопрос — диалоговые облака допроса свидетеля
  Interrogate: ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="14" x2="13" y2="14" />
    </svg>
  ),

  // 7. Конспирация / Побег — скрытная маска смены личности
  Disguise: ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12c1.5-3 5-5 10-5s8.5 2 10 5c-1 3-3 6-6 6-2 0-3-1-4-2-1 1-2 2-4 2-3 0-5-3-6-6z" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),

  // 8. Кража — монета с тактической меткой изъятия
  Rob: ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10" />
      <path d="M15 9.5a2.5 2.5 0 0 0-5 0c0 3 5 2 5 5a2.5 2.5 0 0 1-5 0" />
    </svg>
  ),

  // 9. Вызов патруля — полицейский жетон со звездой
  Patrol: ({ className = 'w-4 h-4 shrink-0' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l7 4v6c0 5.25-3 9.74-7 11-4-1.26-7-5.75-7-11V6l7-4z" />
      <polygon points="12 7 13.5 10.5 17 11 14.5 13.5 15.2 17 12 15.2 8.8 17 9.5 13.5 7 11 10.5 10.5" fill="currentColor" opacity="0.3" />
    </svg>
  ),
};

