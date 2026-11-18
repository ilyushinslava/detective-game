import React from 'react';
import { Button } from '../ui/Button';

export interface AccountSecurityCardProps {
  isAnonymous: boolean;
  isAccountProtectedSuccess: boolean;
  onOpenAuthModal?: () => void;
  onOpenLoginModal?: () => void;
  onOpenCreateProfile?: () => void;
  translations?: {
    accountSecured?: string;
    saveProgress?: string;
    loginLink?: string;
    saveWarning?: string;
    uniqueLogin?: string;
    password?: string;
    protectAccount?: string;
    saving?: string;
  };
  // Для обратной совместимости (устаревшие пропсы, игнорируются)
  accountLogin?: string;
  setAccountLogin?: (val: string) => void;
  accountPassword?: string;
  setAccountPassword?: (val: string) => void;
  accountError?: string | null;
  setAccountError?: (err: string | null) => void;
  isAccountLinking?: boolean;
  onLinkAccount?: () => void;
}

export const AccountSecurityCard: React.FC<AccountSecurityCardProps> = ({
  isAnonymous,
  isAccountProtectedSuccess,
  onOpenAuthModal,
  onOpenLoginModal,
  onOpenCreateProfile,
  translations: p = {},
}) => {
  const handleOpenModal = () => {
    if (onOpenAuthModal) {
      onOpenAuthModal();
    } else if (onOpenCreateProfile) {
      onOpenCreateProfile();
    } else if (onOpenLoginModal) {
      onOpenLoginModal();
    }
  };

  // Если аккаунт уже защищен или привязка прошла успешно
  if (!isAnonymous || isAccountProtectedSuccess) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 rounded-2xl bg-background-surface/50 backdrop-blur-md border border-white/5 text-emerald-400 text-xs font-mono font-bold">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="tracking-wide uppercase font-black text-white">
            {p.accountSecured || "АККАУНТ ЗАЩИЩЕН"}
          </span>
          <span className="text-zinc-500 font-normal hidden sm:inline">•</span>
          <span className="text-zinc-400 font-normal text-[11px] truncate hidden sm:inline">
            Профиль синхронизирован
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-background-surface/50 backdrop-blur-md border border-white/5 p-4 sm:p-5 flex flex-col gap-3.5 text-left">
      {/* Заголовок карточки */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <h3 className="text-sm sm:text-base font-black tracking-wider uppercase text-white">
          {p.saveProgress || "СОХРАНЕНИЕ ПРОГРЕССА"}
        </h3>
      </div>

      {/* Лаконичный текст призыва */}
      <p className="text-xs sm:text-sm font-sans text-zinc-400 leading-relaxed -mt-1">
        Создайте профиль, чтобы навсегда сохранить текущий рейтинг, статистику и монеты.
      </p>

      {/* Полноразмерная кнопка вызова модального окна авторизации */}
      <div className="w-full mt-1">
        <Button
          variant="primary"
          fullWidth
          onClick={handleOpenModal}
          className="w-full h-10 text-xs font-bold uppercase tracking-wider active:scale-95 cursor-pointer bg-accent-primary hover:bg-blue-600 text-white rounded-xl shadow-none"
        >
          СОЗДАТЬ ПРОФИЛЬ / ВОЙТИ
        </Button>
      </div>
    </div>
  );
};
