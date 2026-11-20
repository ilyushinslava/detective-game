import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { soundManager } from "../../utils/audio";
import { triggerHaptic } from "../../utils/haptics";
import { Button } from "../ui/Button";

export function parseQrRoomCode(decodedText: string): string | null {
  if (!decodedText) return null;
  const trimmed = decodedText.trim();

  // 1. Прямой 5-значный цифровой код
  if (/^\d{5}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. URL с параметром room или targetRoom
  try {
    const url = new URL(trimmed);
    const room = url.searchParams.get("room") || url.searchParams.get("targetRoom");
    if (room && /^\d{5}$/.test(room)) {
      return room;
    }
  } catch {
    // В случае относительного URL или строки параметров вида "?room=12345"
    const match = trimmed.match(/[?&](?:room|targetRoom)=(\d{5})/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export interface QrCameraScannerProps {
  onScanSuccess: (roomCode: string) => void;
  onManualSwitch?: () => void;
  className?: string;
}

export const QrCameraScanner: React.FC<QrCameraScannerProps> = ({
  onScanSuccess,
  onManualSwitch,
  className = "",
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppedRef = useRef<boolean>(false);
  const containerId = useRef<string>(`qr-reader-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    isStoppedRef.current = false;
    let html5QrCode: Html5Qrcode | null = null;

    try {
      html5QrCode = new Html5Qrcode(containerId.current);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      html5QrCode
        .start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (isStoppedRef.current) return;
            const roomCode = parseQrRoomCode(decodedText);
            if (roomCode) {
              isStoppedRef.current = true;
              soundManager.play("impact");
              triggerHaptic("heavy");
              try {
                if (html5QrCode && html5QrCode.isScanning) {
                  html5QrCode.stop().catch(() => {});
                }
              } catch {}
              onScanSuccess(roomCode);
            }
          },
          () => {
            // Игнорируем промежуточные кадры без QR
          }
        )
        .then(() => {
          setIsInitializing(false);
        })
        .catch((err) => {
          console.warn("[QrCameraScanner] Camera start error:", err);
          setIsInitializing(false);
          const msg =
            typeof err === "string"
              ? err
              : err?.message || "Камера недоступна или нет разрешения";
          setCameraError(msg);
        });
    } catch (err: any) {
      console.warn("[QrCameraScanner] Initialization exception:", err);
      setIsInitializing(false);
      setCameraError(err?.message || "Ошибка инициализации камеры");
    }

    return () => {
      isStoppedRef.current = true;
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch(() => {});
          }
          html5QrCode.clear();
        } catch {}
      }
    };
  }, [onScanSuccess]);

  return (
    <div
      className={`relative w-full flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-black border border-white/10 select-none ${className}`}
    >
      {/* HTML5 QR Code Container (скрыт или затенен под ретикулой) */}
      <div id={containerId.current} className="w-full h-full min-h-[280px] object-cover" />

      {/* Оверлей ошибки камеры */}
      {cameraError ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/95 space-y-4">
          <div className="w-12 h-12 rounded-2xl border border-red-500/40 bg-red-950/50 flex items-center justify-center text-red-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-display font-bold uppercase tracking-wider text-red-400">
              НЕТ ДОСТУПА К КАМЕРЕ
            </div>
            <div className="text-xs font-sans text-zinc-300 max-w-xs leading-relaxed">
              Разрешите доступ к камере или используйте ввод кода Морзе
            </div>
          </div>
          {onManualSwitch && (
            <Button
              variant="secondary"
              type="button"
              onClick={onManualSwitch}
              className="text-xs font-sans font-bold uppercase tracking-widest"
            >
              Подключиться по Морзе
            </Button>
          )}
        </div>
      ) : (
        /* Нео-нуар прицельная рамка (Reticle) */
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10 p-4">
          {/* Полупрозрачное затенение краев */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

          {/* Прицельный квадрат 240x240 с угловыми скобками */}
          <div className="relative w-56 h-56 sm:w-60 sm:h-60 rounded-xl flex items-center justify-center overflow-hidden">
            {/* Лазерная полоса сканирования */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-scanLaser" />

            {/* Угловые скобки (Reticle Brackets) */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-blue-500 rounded-tl-lg shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-blue-500 rounded-tr-lg shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-blue-500 rounded-bl-lg shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-blue-500 rounded-br-lg shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          </div>

          {/* Статусная подсказка */}
          <div className="relative z-10 mt-4 px-4 py-1.5 rounded-full bg-zinc-950/80 border border-white/10 backdrop-blur-md">
            <span className="text-[10px] font-display tracking-widest uppercase text-zinc-300 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              {isInitializing ? "ПОДКЛЮЧЕНИЕ КАМЕРЫ..." : "НАВЕДИТЕ НА QR-КОД ТЕЛЕВИЗОРА"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
