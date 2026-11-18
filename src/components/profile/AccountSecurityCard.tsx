import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ProfileIcons } from './ProfileIcons';

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
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-emerald-900/30 to-background-surface border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(16,185,129,0.2)] relative overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shrink-0">
            <ProfileIcons.Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="tracking-wide uppercase drop-shadow-sm font-black text-white">
              {p.accountSecured}
            </span>
            <span className="text-[10px] text-emerald-400/80 font-normal mt-0.5 truncate">
              Досье синхронизировано и защищено шифрованием
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-indigo-950/70 via-indigo-900/40 to-background-surface/90 border border-accent-primary/40 p-4 sm:p-5 shadow-[0_0_30px_rgba(59,130,246,0.18)] flex flex-col gap-3.5 overflow-hidden backdrop-blur-xl">
      {/* Декоративное неоновое свечение в углу карточки */}
      <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-accent-primary/15 blur-2xl pointer-events-none" />

      {/* Верхний ряд: заголовок и ссылка на вход */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <ProfileIcons.Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              {p.saveProgress}
            </h3>
            <span className="text-[9px] font-mono uppercase tracking-widest text-accent-neon font-bold">
              [ ГОСТЕВОЙ РЕЖИМ • БЕЗ ПОТЕРИ СТАТИСТИКИ ]
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenLoginModal}
          className="text-[11px] font-mono text-accent-neon hover:text-cyan-200 uppercase cursor-pointer transition-colors font-bold underline underline-offset-4 decoration-accent-neon/40 hover:decoration-cyan-200"
        >
          {p.loginLink}
        </button>
      </div>

      {/* Предупреждение о сохранении пароля */}
      <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex gap-2.5 items-start text-left relative z-10">
        <span className="text-amber-400 text-sm mt-0.5">⚠</span>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-mono text-zinc-300 leading-relaxed">
            {p.saveWarning}
          </p>
          <p className="text-[10px] font-sans text-accent-neon/90 leading-relaxed">
            Текущие победы, рейтинг и заработанные монеты будут полностью перенесены в постоянный профиль.
          </p>
        </div>
      </div>

      {/* Стеклянные поля ввода: Логин и Пароль */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 relative z-10">
        <div>
          <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
            {p.uniqueLogin}
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
            className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-accent-neon focus:ring-1 focus:ring-accent-neon/40 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-all duration-200"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
            {p.password}
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
              className="w-full bg-black/20 backdrop-blur-sm border border-white/10 focus:border-accent-neon focus:ring-1 focus:ring-accent-neon/40 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-all duration-200"
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
        </div>
      </div>

      {accountError && (
        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[10px] font-mono relative z-10">
          {accountError}
        </div>
      )}

      {/* Кнопка отправки формы */}
      <div className="flex justify-end mt-1 relative z-10">
        <Button
          variant="primary"
          onClick={onLinkAccount}
          disabled={isAccountLinking}
          className="h-10 px-5 text-xs font-bold uppercase tracking-wider active:scale-95 cursor-pointer shadow-neon-blue flex items-center justify-center gap-2"
        >
          <ProfileIcons.Shield className="w-3.5 h-3.5" />
          <span>{isAccountLinking ? p.saving : p.protectAccount}</span>
        </Button>
      </div>
    </div>
  );
};
