import React from 'react';
import { Button } from '../ui/Button';
import { ProfileIcons } from './ProfileIcons';

export interface AccountSecurityCardProps {
  isAnonymous: boolean;
  isAccountProtectedSuccess: boolean;
  accountLogin: string;
  setAccountLogin: (val: string) => void;
  accountPassword: string;
  setAccountPassword: (val: string) => void;
  accountError: string | null;
  setAccountError: (err: string | null) => void;
  isAccountLinking: boolean;
  onLinkAccount: () => void;
  onOpenLoginModal: () => void;
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
  accountLogin,
  setAccountLogin,
  accountPassword,
  setAccountPassword,
  accountError,
  setAccountError,
  isAccountLinking,
  onLinkAccount,
  onOpenLoginModal,
  translations: p,
}) => {
  if (!isAnonymous || isAccountProtectedSuccess) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold shadow-sm">
        <ProfileIcons.Shield className="w-4 h-4 text-emerald-400" />
        <span>{p.accountSecured}</span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2">
          <ProfileIcons.Shield className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
            {p.saveProgress}
          </h3>
        </div>
        <button
          type="button"
          onClick={onOpenLoginModal}
          className="text-[10px] font-mono text-blue-400 hover:text-blue-300 uppercase cursor-pointer transition-colors"
        >
          {p.loginLink}
        </button>
      </div>

      <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex gap-2.5 items-start text-left">
        <span className="text-amber-400 text-sm mt-0.5">⚠</span>
        <p className="text-[11px] font-mono text-zinc-300 leading-relaxed">
          {p.saveWarning}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
        <div>
          <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
            {p.uniqueLogin}
          </label>
          <input
            type="text"
            value={accountLogin}
            onChange={(e) => {
              setAccountLogin(e.target.value);
              setAccountError(null);
            }}
            placeholder="agent_77"
            autoCapitalize="none"
            autoCorrect="off"
            maxLength={20}
            className="w-full bg-zinc-900 border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
            {p.password}
          </label>
          <input
            type="password"
            value={accountPassword}
            onChange={(e) => {
              setAccountPassword(e.target.value);
              setAccountError(null);
            }}
            placeholder="••••••••"
            maxLength={32}
            className="w-full bg-zinc-900 border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-colors"
          />
        </div>
      </div>

      {accountError && (
        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[10px] font-mono">
          {accountError}
        </div>
      )}

      <div className="flex justify-end mt-1">
        <Button
          variant="primary"
          onClick={onLinkAccount}
          disabled={isAccountLinking}
          className="h-9 px-4 text-xs font-bold uppercase tracking-wider active:scale-95 cursor-pointer"
        >
          {isAccountLinking ? p.saving : p.protectAccount}
        </Button>
      </div>
    </div>
  );
};
