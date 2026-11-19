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

  // Если аккаунт уже защищен или привязка прошла успешно — ничего не отображаем (убираем лишний визуальный шум)
  if (!isAnonymous || isAccountProtectedSuccess) {
    return null;
  }

  return (
    <div className="neo-card border-t-amber-500/30 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 text-left shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        <div className="flex flex-col min-w-0">
          <h3 className="text-xs font-black tracking-wider uppercase text-amber-300 truncate">
            {p.saveProgress || "СОХРАНЕНИЕ ПРОГРЕССА"}
          </h3>
          <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[190px] xs:max-w-[240px] sm:max-w-md">
            Создайте профиль, чтобы навсегда сохранить текущий рейтинг, статистику и монеты.
          </p>
        </div>
      </div>

      <Button
        variant="primary"
        onClick={handleOpenModal}
        className="h-8 px-3 text-[11px] font-bold uppercase tracking-wider shrink-0 min-h-[32px] !rounded-lg"
      >
        ВОЙТИ
      </Button>
    </div>
  );
};
