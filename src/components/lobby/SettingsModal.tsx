import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { soundManager } from "../../utils/audio";
import { triggerHaptic, setHapticsEnabled } from "../../utils/haptics";
import { useTranslation } from "../../i18n/context";
import { useAuthSafe } from "../../contexts/AuthContext";
import { LoginModal } from "./LoginModal";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, lang, setLang } = useTranslation();
  const { isAnonymous, signOut } = useAuthSafe();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSfxEnabled, setIsSfxEnabled] = useState(soundManager.getSfxEnabled());
  const [isAmbientEnabled, setIsAmbientEnabled] = useState(soundManager.getAmbientEnabled());
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(() => {
    return localStorage.getItem("crime_city_haptics") !== "false";
  });

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.settings.title}
      maxWidth="max-w-sm"
      showCloseButton={true}
      zIndexClass="z-[80]"
      className="p-6 text-left"
    >
      <div className="space-y-3 mb-6 mt-1">
        {/* SFX */}
        <div className="neo-card border-t-white/15 p-3 rounded-xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">{t.settings.sfx}</span>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{t.settings.sfxDesc}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isSfxEnabled}
            onClick={() => {
              const enabled = soundManager.toggleSfx();
              setIsSfxEnabled(enabled);
            }}
            className={`w-12 h-6 rounded-full px-1 flex items-center transition-all duration-200 cursor-pointer ${
              isSfxEnabled
                ? "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 border border-white/40 border-t-white/70 shadow-inner"
                : "bg-zinc-900 border border-white/10"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full shadow-md transition-transform duration-200 ${
                isSfxEnabled
                  ? "translate-x-6 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                  : "translate-x-0 bg-zinc-500"
              }`}
            />
          </button>
        </div>

        {/* Ambient */}
        <div className="neo-card border-t-white/15 p-3 rounded-xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">{t.settings.ambient}</span>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{t.settings.ambientDesc}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isAmbientEnabled}
            onClick={() => {
              const enabled = soundManager.toggleAmbient();
              setIsAmbientEnabled(enabled);
            }}
            className={`w-12 h-6 rounded-full px-1 flex items-center transition-all duration-200 cursor-pointer ${
              isAmbientEnabled
                ? "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 border border-white/40 border-t-white/70 shadow-inner"
                : "bg-zinc-900 border border-white/10"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full shadow-md transition-transform duration-200 ${
                isAmbientEnabled
                  ? "translate-x-6 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                  : "translate-x-0 bg-zinc-500"
              }`}
            />
          </button>
        </div>

        {/* Haptics */}
        <div className="neo-card border-t-white/15 p-3 rounded-xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">{t.settings.haptics}</span>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{t.settings.hapticsDesc}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isHapticsEnabled}
            onClick={() => {
              const newVal = !isHapticsEnabled;
              setIsHapticsEnabled(newVal);
              setHapticsEnabled(newVal);
              if (newVal) triggerHaptic("medium");
            }}
            className={`w-12 h-6 rounded-full px-1 flex items-center transition-all duration-200 cursor-pointer ${
              isHapticsEnabled
                ? "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 border border-white/40 border-t-white/70 shadow-inner"
                : "bg-zinc-900 border border-white/10"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full shadow-md transition-transform duration-200 ${
                isHapticsEnabled
                  ? "translate-x-6 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                  : "translate-x-0 bg-zinc-500"
              }`}
            />
          </button>
        </div>

        {/* Язык */}
        <div className="neo-card border-t-white/15 p-3 rounded-xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">{t.settings.language}</span>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5">Выберите язык / Select language</span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setLang("ru")}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider ${
                lang === "ru"
                  ? "neo-button-primary text-white border-white/30 border-t-white/60 shadow-md"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-white/10 hover:border-white/20"
              }`}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider ${
                lang === "en"
                  ? "neo-button-primary text-white border-white/30 border-t-white/60 shadow-md"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-white/10 hover:border-white/20"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Управление аккаунтом */}
        <div className="neo-card border-t-white/15 p-3 rounded-xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-200 uppercase tracking-widest">Аккаунт</span>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
              {isAnonymous ? "Анонимный профиль" : "Аккаунт защищен"}
            </span>
          </div>
          {isAnonymous ? (
            <Button
              variant="primary"
              onClick={() => setIsLoginModalOpen(true)}
              className="h-8 px-3 text-[10px] font-black uppercase tracking-wider cursor-pointer"
            >
              Войти
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => {
                soundManager.play("tapMenu");
                signOut();
              }}
              className="h-8 px-3 text-[10px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              Выйти
            </Button>
          )}
        </div>
      </div>

      <Button
        variant="secondary"
        fullWidth
        onClick={onClose}
        className="text-[10px] font-black tracking-widest uppercase cursor-pointer"
      >
        {t.settings.close}
      </Button>

      {/* Модальное окно входа */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          onClose();
        }}
      />
    </Modal>
  );
};
