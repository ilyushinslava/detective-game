import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useAuthSafe, validateLogin, validatePassword } from "../../contexts/AuthContext";
import { useTranslation } from "../../i18n/context";
import { soundManager } from "../../utils/audio";
import { triggerHaptic } from "../../utils/haptics";
import { storage } from "../../utils/storage";
import { RecoveryKeyView, generateRecoveryKey } from "./RecoveryKeyView";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: "CREATE_PROFILE" | "SIGN_IN";
  currentCallsign?: string;
}

const Icons = {
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = "SIGN_IN",
  currentCallsign,
}) => {
  const { user, isAnonymous, signIn, linkAccount } = useAuthSafe();
  const { t } = useTranslation();

  const a = t?.auth || {
    signInTitle: "ВХОД В АККАУНТ",
    signInDesc: "Введите логин и пароль для загрузки сохраненного профиля и рейтинга.",
    login: "Логин",
    password: "Пароль",
    signInBtn: "Войти",
    checking: "Проверка...",
    cancel: "Отмена",
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

  const [tab, setTab] = useState<"CREATE_PROFILE" | "SIGN_IN">(initialTab);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Шаг модального окна: AUTH (форма) или RECOVERY_KEY (финальный ключ)
  const [step, setStep] = useState<"AUTH" | "RECOVERY_KEY">("AUTH");
  const [generatedKey, setGeneratedKey] = useState<string>("");

  // Вычисление текущего позывного игрока для отображения в форме
  const callsign = useMemo(() => {
    if (currentCallsign) return currentCallsign;
    try {
      const savedProfile = storage.getSyncItem<any>("crime_city_profile", null);
      if (savedProfile?.agentName || savedProfile?.nickname) {
        return savedProfile.agentName || savedProfile.nickname;
      }
      const saved = localStorage.getItem("crime_city_callsign");
      if (saved) return saved;
      if (user?.user_metadata?.agent_name || user?.user_metadata?.login) {
        return user.user_metadata.agent_name || user.user_metadata.login;
      }
    } catch {}
    return "Агент";
  }, [currentCallsign, user]);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setError(null);
      setStep("AUTH");
      setShowPassword(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
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
      if (tab === "CREATE_PROFILE") {
        // Ленивая регистрация: привязка текущего гостя к логину и паролю
        const res = await linkAccount(login, password);
        if (res.success) {
          const key = generateRecoveryKey();
          setGeneratedKey(key);
          try {
            localStorage.setItem("noir_recovery_key", key);
            localStorage.setItem(`noir_recovery_key_${login.trim().toLowerCase()}`, key);
          } catch {}
          soundManager.play("confirm");
          triggerHaptic("success");
          setStep("RECOVERY_KEY");
        } else {
          setError(res.error || "Ошибка привязки аккаунта");
          soundManager.play("error");
          triggerHaptic("warning");
        }
      } else {
        // Вход в существующий аккаунт
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
      }
    } catch (err: any) {
      setError(err?.message || a.errors.networkError);
      soundManager.play("error");
      triggerHaptic("warning");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryKeyComplete = () => {
    onSuccess?.();
    onClose();
  };

  // Точечная классификация ошибок для Zero Layout Shift
  const isPasswordError = Boolean(error && /парол/i.test(error));
  const isLoginError = Boolean(
    error &&
      !isPasswordError &&
      (/логин/i.test(error) ||
        /кириллиц/i.test(error) ||
        /пробел/i.test(error) ||
        /символ/i.test(error) ||
        /занят/i.test(error) ||
        /already registered/i.test(error) ||
        /already exists/i.test(error) ||
        /уже существует/i.test(error) ||
        /user already/i.test(error))
  );
  const isGeneralError = Boolean(error && !isLoginError && !isPasswordError);

  const loginBorderClass = isLoginError
    ? "border-accent-danger focus:border-accent-danger focus:ring-1 focus:ring-accent-danger/40"
    : "border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40";

  const passwordBorderClass = isPasswordError
    ? "border-accent-danger focus:border-accent-danger focus:ring-1 focus:ring-accent-danger/40"
    : "border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === "RECOVERY_KEY"
          ? "СЕКРЕТНЫЙ ФОРМУЛЯР"
          : tab === "CREATE_PROFILE"
          ? "СОЗДАНИЕ ПРОФИЛЯ"
          : a.signInTitle
      }
      maxWidth="max-w-md"
      showCloseButton={true}
      zIndexClass="z-[90]"
      className="p-5 sm:p-6 text-left"
    >
      {step === "RECOVERY_KEY" ? (
        <RecoveryKeyView
          recoveryKey={generatedKey}
          login={login}
          onComplete={handleRecoveryKeyComplete}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 mb-1 mt-1">
          {/* Статичный и элегантный переключатель режима (без мерцаний и пульсаций) */}
          <div className="flex p-1 rounded-xl bg-background-surface/50 border border-white/5 backdrop-blur-md gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTab("CREATE_PROFILE");
                setError(null);
                soundManager.play("click");
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer select-none flex items-center justify-center gap-1.5 ${
                tab === "CREATE_PROFILE"
                  ? "bg-background-panel text-white border border-white/10 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 bg-transparent border border-transparent"
              }`}
            >
              <Icons.Shield />
              <span>Создать профиль</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("SIGN_IN");
                setError(null);
                soundManager.play("click");
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer select-none flex items-center justify-center gap-1.5 ${
                tab === "SIGN_IN"
                  ? "bg-background-panel text-white border border-white/10 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 bg-transparent border border-transparent"
              }`}
            >
              <span>Вход</span>
            </button>
          </div>

          {/* Контейнер с фиксированной минимальной высотой для предотвращения скачков интерфейса (Layout Shift) */}
          <div className="min-h-[350px] sm:min-h-[360px] flex flex-col justify-between">
            <div className="flex flex-col gap-2.5">
              {/* Информационный текст */}
              <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                {tab === "CREATE_PROFILE"
                  ? isAnonymous
                    ? "Привяжите логин и пароль к текущему досье: весь рейтинг, монеты и аватар перенесутся без потерь."
                    : "Задайте логин и пароль для доступа к профилю на любых устройствах."
                  : a.signInDesc}
              </p>

              {/* На вкладке «Создать профиль»: предзаполненное поле текущей личности игрока */}
              {tab === "CREATE_PROFILE" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-callsign" className="text-[10px] font-mono uppercase text-zinc-400">
                      ПОЗЫВНОЙ / ИМЯ
                    </label>
                    <span className="text-[9px] font-mono text-blue-400 uppercase tracking-wider">
                      Текущая личность
                    </span>
                  </div>
                  <input
                    id="auth-callsign"
                    type="text"
                    value={callsign}
                    readOnly
                    disabled
                    aria-label="ПОЗЫВНОЙ / ИМЯ"
                    className="w-full bg-black/40 backdrop-blur-sm border border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-300 opacity-70 cursor-not-allowed outline-none select-none"
                  />
                </div>
              )}

              {/* Стеклянное поле ввода Логина с резервированием места под ошибку */}
              <div className="relative pb-9">
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
                  className={`w-full bg-black/20 backdrop-blur-sm border ${loginBorderClass} rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-all duration-200`}
                  autoFocus
                />
                {isLoginError && (
                  <p className="absolute left-0 bottom-0 text-accent-danger text-xs font-mono whitespace-normal break-words leading-tight w-full">
                    {error}
                  </p>
                )}
              </div>

              {/* Стеклянное поле ввода Пароля с кнопкой-глазом и резервированием места под ошибку */}
              <div className="relative pb-9">
                <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">
                  {a.password}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    maxLength={32}
                    className={`w-full bg-black/20 backdrop-blur-sm border ${passwordBorderClass} rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-white placeholder:text-zinc-600 outline-none transition-all duration-200`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer p-1"
                    title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                  </button>
                </div>
                {isPasswordError && (
                  <p className="absolute left-0 bottom-0 text-accent-danger text-xs font-mono whitespace-normal break-words leading-tight w-full">
                    {error}
                  </p>
                )}
              </div>

              {/* Общая ошибка, если она не относится к конкретному полю */}
              {isGeneralError && (
                <p className="text-accent-danger text-xs font-mono whitespace-normal break-words leading-tight text-center -mt-1">
                  {error}
                </p>
              )}
            </div>

            {/* Кнопки формы: строго w-full */}
            <div className="flex flex-col gap-2 mt-auto pt-3">
              <Button
                variant="primary"
                fullWidth
                type="submit"
                disabled={isLoading}
                className="w-full h-10 text-xs font-bold uppercase tracking-wider active:scale-95 cursor-pointer bg-accent-primary hover:bg-blue-600 text-white rounded-xl shadow-none"
              >
                {isLoading
                  ? a.checking
                  : tab === "CREATE_PROFILE"
                  ? "СОХРАНИТЬ И АКТИВИРОВАТЬ"
                  : a.signInBtn}
              </Button>

              <Button
                variant="secondary"
                fullWidth
                type="button"
                onClick={onClose}
                className="w-full h-9 text-[10px] font-black uppercase tracking-widest cursor-pointer bg-background-surface/40 hover:bg-background-surface/70 border border-white/5 text-zinc-400 hover:text-white rounded-xl"
              >
                {a.cancel}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
