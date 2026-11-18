import React, { useState } from 'react';
import { Button } from '../ui/Button';

export interface AccountSecurityCardProps {
  isAnonymous: boolean;
  isAccountProtectedSuccess: boolean;
  accountLogin?: string;
  setAccountLogin?: (val: string) => void;
  accountPassword?: string;
  setAccountPassword?: (val: string) => void;
  accountError?: string | null;
  setAccountError?: (err: string | null) => void;
  isAccountLinking?: boolean;
  onLinkAccount?: () => void;
  onOpenLoginModal: () => void;
  onOpenCreateProfile?: () => void;
  translations: {
    accountSecured: string;
    saveProgress: string;
    loginLink: string;
    saveWarning: string;
    uniqueLogin: string;
    password: string;
    protectAccount: string;
    saving: string;
  };
}

export const AccountSecurityCard: React.FC<AccountSecurityCardProps> = ({
  isAnonymous,
  isAccountProtectedSuccess,
  accountLogin = '',
  setAccountLogin,
  accountPassword = '',
  setAccountPassword,
  accountError,
  setAccountError,
  isAccountLinking = false,
  onLinkAccount,
  onOpenLoginModal,
  translations: p,
}) => {
  const [showPassword, setShowPassword] = useState(false);

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

  // Точечная классификация ошибок
  const isPasswordError = Boolean(accountError && /парол/i.test(accountError));

  const isLoginError = Boolean(
    accountError &&
      !isPasswordError &&
      (/логин/i.test(accountError) ||
        /кириллиц/i.test(accountError) ||
        /пробел/i.test(accountError) ||
        /символ/i.test(accountError) ||
        /занят/i.test(accountError) ||
        /already registered/i.test(accountError) ||
        /already exists/i.test(accountError) ||
        /уже существует/i.test(accountError) ||
        /user already/i.test(accountError))
  );
  const isGeneralError = Boolean(accountError && !isLoginError && !isPasswordError);

  const loginBorderClass = isLoginError
    ? "border-accent-danger focus:border-accent-danger focus:ring-1 focus:ring-accent-danger/40"
    : "border-white/10 focus:border-accent-neon focus:ring-1 focus:ring-accent-neon/40";

  const passwordBorderClass = isPasswordError
    ? "border-accent-danger focus:border-accent-danger focus:ring-1 focus:ring-accent-danger/40"
    : "border-white/10 focus:border-accent-neon focus:ring-1 focus:ring-accent-neon/40";

  return (
    <div className="rounded-2xl bg-background-surface/50 backdrop-blur-md border border-white/5 p-4 sm:p-5 flex flex-col gap-3.5">
      {/* Шапка: крупный заголовок слева, аккуратная ссылка справа */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <h3 className="text-sm sm:text-base font-black tracking-wider uppercase text-white">
          {p.saveProgress || "СОХРАНЕНИЕ ПРОГРЕССА"}
        </h3>
        <button
          type="button"
          onClick={onOpenLoginModal}
          className="text-xs font-mono text-zinc-400 hover:text-accent-primary transition-colors cursor-pointer"
        >
          Уже есть аккаунт? Войти
        </button>
      </div>

      {/* Единственная строгая фраза */}
      <p className="text-xs sm:text-sm font-sans text-zinc-400 leading-relaxed -mt-1 text-left">
        Создайте профиль, чтобы навсегда сохранить текущий рейтинг, статистику и монеты.
      </p>

      {/* Стеклянные поля ввода: Логин и Пароль с резервированием места под ошибки (Zero Layout Shift) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-1 text-left">
        {/* Поле логина */}
        <div className="relative pb-5">
          <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
            {p.uniqueLogin || "Уникальный Логин"}
          </label>
          <input
            type="text"
            value={accountLogin}
            onChange={(e) => {
              setAccountLogin?.(e.target.value);
              setAccountError?.(null);
            }}
            placeholder="agent_77"
            autoCapitalize="none"
            autoCorrect="off"
            maxLength={20}
            className={`w-full bg-black/20 backdrop-blur-sm border ${loginBorderClass} rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-all duration-200`}
          />
          {isLoginError && (
            <p className="absolute left-0 bottom-0 text-accent-danger text-xs font-mono truncate max-w-full">
              {accountError}
            </p>
          )}
        </div>

        {/* Поле пароля */}
        <div className="relative pb-5">
          <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
            {p.password || "Пароль"}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={accountPassword}
              onChange={(e) => {
                setAccountPassword?.(e.target.value);
                setAccountError?.(null);
              }}
              placeholder="••••••••"
              maxLength={32}
              className={`w-full bg-black/20 backdrop-blur-sm border ${passwordBorderClass} rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-all duration-200`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
              title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {isPasswordError && (
            <p className="absolute left-0 bottom-0 text-accent-danger text-xs font-mono truncate max-w-full">
              {accountError}
            </p>
          )}
        </div>
      </div>

      {isGeneralError && (
        <p className="text-accent-danger text-xs font-mono text-center -mt-1">
          {accountError}
        </p>
      )}

      {/* Кнопка отправки формы: строго w-full */}
      <div className="w-full mt-0.5">
        <Button
          variant="primary"
          fullWidth
          onClick={onLinkAccount}
          disabled={isAccountLinking}
          className="w-full h-10 text-xs font-bold uppercase tracking-wider active:scale-95 cursor-pointer bg-accent-primary hover:bg-blue-600 text-white rounded-xl shadow-none"
        >
          {isAccountLinking ? (p.saving || "Сохранение...") : "СОЗДАТЬ ПРОФИЛЬ"}
        </Button>
      </div>
    </div>
  );
};
