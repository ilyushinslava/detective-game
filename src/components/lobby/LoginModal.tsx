import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuthSafe, validateLogin, validatePassword } from "../../contexts/AuthContext";
import { soundManager } from "../../utils/audio";
import { triggerHaptic } from "../../utils/haptics";

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { signIn } = useAuthSafe();
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
      setError(loginErr);
      soundManager.play("error");
      triggerHaptic("warning");
      return;
    }

    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
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
        setError(res.error || "Неверный логин или пароль");
        soundManager.play("error");
        triggerHaptic("warning");
      }
    } catch (err: any) {
      setError(err?.message || "Ошибка подключения");
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
      title="ВХОД В АККАУНТ"
      maxWidth="max-w-sm"
      showCloseButton={true}
      zIndexClass="z-[90]"
      className="p-6 text-left"
    >
      <form onSubmit={handleSignIn} className="flex flex-col gap-3.5 mb-2 mt-1">
        <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
          Введите логин и пароль для загрузки сохраненного профиля и рейтинга.
        </p>

        <div>
          <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
            Логин
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
            Пароль
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
            {isLoading ? "Проверка..." : "Войти"}
          </Button>

          <Button
            variant="secondary"
            fullWidth
            type="button"
            onClick={onClose}
            className="h-9 text-[10px] font-black uppercase tracking-widest cursor-pointer"
          >
            Отмена
          </Button>
        </div>
      </form>
    </Modal>
  );
};
