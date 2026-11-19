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
    <div className="neo-card border-t-white/20 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2.5 text-left shrink-0">
      {/* Заголовок карточки */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h3 className="text-xs sm:text-sm font-black tracking-wider uppercase text-white">
          {p.saveProgress || "СОХРАНЕНИЕ ПРОГРЕССА"}
        </h3>
      </div>

      {/* Лаконичный текст призыва */}
      <p className="text-xs font-sans text-zinc-400 leading-relaxed">
        Создайте профиль, чтобы навсегда сохранить текущий рейтинг, статистику и монеты.
      </p>

      {/* Полноразмерная кнопка вызова модального окна авторизации */}
      <div className="w-full mt-0.5">
        <Button
          variant="primary"
          fullWidth
          onClick={handleOpenModal}
          className="w-full h-9 sm:h-10 text-xs font-bold uppercase tracking-wider"
        >
          СОЗДАТЬ ПРОФИЛЬ / ВОЙТИ
        </Button>
      </div>
    </div>
  );
};
