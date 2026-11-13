import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface TvErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onReset?: () => void;
  autoReloadSeconds?: number;
  enableAutoReload?: boolean;
}

interface TvErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  countdown: number;
}

export class TvErrorBoundary extends Component<
  TvErrorBoundaryProps,
  TvErrorBoundaryState
> {
  private timerId: number | null = null;

  constructor(props: TvErrorBoundaryProps) {
    super(props);
    const initialSeconds = props.autoReloadSeconds ?? 5;
    this.state = {
      hasError: false,
      error: null,
      countdown: initialSeconds,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<TvErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[TvErrorBoundary] Uncaught application error:", error, errorInfo);
    this.startCountdown();
  }

  componentWillUnmount(): void {
    this.stopCountdown();
  }

  private startCountdown = (): void => {
    this.stopCountdown();
    const shouldReload = this.props.enableAutoReload !== false;

    if (!shouldReload) return;

    this.timerId = window.setInterval(() => {
      this.setState((prev) => {
        if (prev.countdown <= 1) {
          this.stopCountdown();
          this.handleReload();
          return { ...prev, countdown: 0 };
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  private stopCountdown = (): void => {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  };

  private handleReload = (): void => {
    try {
      this.props.onReset?.();
    } catch {}
    if (typeof window !== "undefined" && window.location) {
      window.location.reload();
    }
  };

  private handleManualReset = (): void => {
    this.stopCountdown();
    this.handleReload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback && this.state.error) {
      return this.props.fallback(this.state.error, this.handleManualReset);
    }

    const errorMessage = this.state.error?.message || "Неизвестный системный сбой";
    const totalSeconds = this.props.autoReloadSeconds ?? 5;
    const progressPercent = Math.max(0, Math.min(100, (this.state.countdown / totalSeconds) * 100));

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed inset-0 z-[99999] bg-black text-white flex flex-col items-center justify-center p-6 sm:p-10 select-none overflow-hidden"
      >
        {/* Фоновые стилизованные световые акценты */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950 via-black to-black" />
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

        {/* Главный блок аварийного протокола */}
        <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center space-y-6">
          {/* Пульсирующий бейдж предупреждения */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-red-500/50 bg-red-950/60 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase text-red-400">
              СИСТЕМНЫЙ СБОЙ • АВАРИЙНЫЙ РЕЖИМ
            </span>
          </div>

          {/* Пульсирующий красный акцидентный заголовок */}
          <h1 className="font-display font-black text-2xl sm:text-4xl 2xl:text-5xl text-red-500 tracking-wider uppercase animate-pulse drop-shadow-[0_0_35px_rgba(239,68,68,0.85)]">
            КРИТИЧЕСКАЯ ОШИБКА СИСТЕМЫ
          </h1>

          {/* Контейнер вывода текста ошибки приглушенным моноширинным шрифтом */}
          <div className="w-full bg-zinc-950/80 border border-red-900/40 rounded-xl p-4 sm:p-5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] backdrop-blur-md">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5 text-left flex items-center justify-between">
              <span>ПРОТОКОЛ ИСКЛЮЧЕНИЯ:</span>
              <span className="text-red-500/80 font-bold">FATAL_EXCEPTION</span>
            </div>
            <pre className="font-mono text-xs sm:text-sm text-zinc-400 text-left whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto">
              {errorMessage}
            </pre>
          </div>

          {/* Таймер автоматической перезагрузки */}
          <div className="flex flex-col items-center space-y-2 pt-2">
            <div className="font-mono text-xs sm:text-sm text-red-400/90 tracking-widest uppercase flex items-center gap-2">
              <span>АВТОМАТИЧЕСКАЯ ПЕРЕЗАГРУЗКА ЧЕРЕЗ</span>
              <span className="inline-block min-w-[1.5rem] font-black text-red-300 text-base">
                {this.state.countdown}
              </span>
              <span>СЕК...</span>
            </div>

            {/* Полоса прогресса отсчета */}
            <div className="w-64 sm:w-80 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Кнопка немедленной ручной перезагрузки */}
          <div className="pt-2">
            <button
              type="button"
              onClick={this.handleManualReset}
              className="px-6 py-2.5 rounded-lg border border-red-500/50 bg-red-950/50 hover:bg-red-900/60 active:scale-95 text-red-200 font-mono text-xs uppercase tracking-widest transition-all duration-200 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              ПЕРЕЗАГРУЗИТЬ СЕЙЧАС
            </button>
          </div>
        </div>
      </div>
    );
  }
}
