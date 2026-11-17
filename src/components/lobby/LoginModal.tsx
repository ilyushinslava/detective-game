import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuthSafe, validateLogin, validatePassword } from "../../contexts/AuthContext";
import { useTranslation } from "../../i18n/context";
import { soundManager } from "../../utils/audio";
import { triggerHaptic } from "../../utils/haptics";

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { signIn } = useAuthSafe();
  const { t } = useTranslation();
  const a = t?.auth || {
    signInTitle: "ВХОД В АККАУНТ",
    signInDesc: "Введите логин и пароль для загрузки сохраненного профиля и рейтинга.",
    login: "Логин",
    password: "Пароль",
    signInBtn: "Войти",
    checking: "Проверка...",
    cancel: "Отмена",
    account: "Аккаунт",
    anonymousProfile: "Анонимный профиль",
    accountProtected: "Аккаунт защищен",
    signOut: "Выйти",
    loginHeaderBtn: "Войти",
    errors: {
      enterLogin: "Введите логин",
      cyrillic: "Логин не должен содержать кириллицу (только латиница и цифры)",
      spaces: "Логин не должен содержать пробелы",
      invalidChars: "Логин может содержать только латинские буквы, цифры и знак подчеркивания (от 3 до 20 символов)",
      enterPassword: "Введите пароль",
      passwordLength: "Пароль должен содержать не менее 6 символов",
      invalidCredentials: "Неверный логин или пароль",
      networkError: "Ошибка подключения",
    },
  };

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const loginErr = validateLogin(login);
    if (loginErr) {
      const msg = !login.trim()
        ? a.errors.enterLogin
        : /[а-яА-ЯёЁ]/.test(login)
        ? a.errors.cyrillic
        : /\s/.test(login)
        ? a.errors.spaces
        : a.errors.invalidChars;
      setError(msg);
      soundManager.play("error");
      triggerHaptic("warning");
      return;
    }

    const passErr = validatePassword(password);
    if (passErr) {
      const msg = !password ? a.errors.enterPassword : a.errors.passwordLength;
      setError(msg);
      soundManager.play("error");
      triggerHaptic("warning");
      return;
    }

    setIsLoading(true);
    try {
      const res = await signIn(login, password);
      if (res.success) {
        soundManager.play("confirm");
        triggerHaptic("success");
        onSuccess?.();
        onClose();
      } else {
        setError(res.error || a.errors.invalidCredentials);
        soundManager.play("error");
        triggerHaptic("warning");
      }
    } catch (err: any) {
      setError(err?.message || a.errors.networkError);
      soundManager.play("error");
      triggerHaptic("warning");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={a.signInTitle}
      maxWidth="max-w-sm"
      showCloseButton={true}
      zIndexClass="z-[90]"
      className="p-6 text-left"
    >
      <form onSubmit={handleSignIn} className="flex flex-col gap-3.5 mb-2 mt-1">
        <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
          {a.signInDesc}
        </p>

        <div>
          <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
            {a.login}
          </label>
          <input
            type="text"
            value={login}
            onChange={(e) => {
              setLogin(e.target.value);
              setError(null);
            }}
            placeholder="agent_77"
            autoCapitalize="none"
            autoCorrect="off"
            maxLength={20}
            className="w-full bg-zinc-900 border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-colors"
            autoFocus
          />
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
            {a.password}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="••••••••"
            maxLength={32}
            className="w-full bg-zinc-900 border border-white/10 focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-colors"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[10px] font-mono">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-2">
          <Button
            variant="primary"
            fullWidth
            type="submit"
            disabled={isLoading}
            className="h-10 text-xs font-bold uppercase tracking-wider active:scale-95 cursor-pointer"
          >
            {isLoading ? a.checking : a.signInBtn}
          </Button>

          <Button
            variant="secondary"
            fullWidth
            type="button"
            onClick={onClose}
            className="h-9 text-[10px] font-black uppercase tracking-widest cursor-pointer"
          >
            {a.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
