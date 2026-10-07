import { useState, useEffect } from "react";
import { mpService } from "../utils/multiplayerPeer";

interface MultiplayerLobbyModalProps {
  onClose: () => void;
  onGameStartReady: (roomCode: string, isHost: boolean) => void;
}

export const MultiplayerLobbyModal = ({
  onClose,
  onGameStartReady,
}: MultiplayerLobbyModalProps) => {
  const [tab, setTab] = useState<"CREATE" | "JOIN">("CREATE");
  const [roomCode, setRoomCode] = useState(mpService.roomCode || "");
  const [inputCode, setInputCode] = useState("");
  const [status, setStatus] = useState<
    "IDLE" | "CONNECTING" | "WAITING" | "CONNECTED" | "ERROR"
  >(mpService.roomCode ? "WAITING" : "IDLE");
  const [isCopied, setIsCopied] = useState(false);

  const startCreatingRoom = () => {
    setStatus("CONNECTING");
    mpService.createRoom(
      (code) => {
        setRoomCode(code);
        setStatus("WAITING");
      },
      () => {
        setStatus("CONNECTED");
        onGameStartReady(mpService.roomCode || "ONLINE", true);
      },
      (err) => {
        console.error("Room creation failed:", err);
        setStatus("ERROR");
      },
    );
  };

  useEffect(() => {
    if (tab === "CREATE" && !mpService.roomCode) {
      startCreatingRoom();
    }
  }, [tab]);

  const handleManualClose = () => {
    if (status !== "CONNECTED") {
      mpService.disconnect();
    }
    onClose();
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleJoin = () => {
    if (inputCode.length !== 4) return;
    setStatus("CONNECTING");
    mpService.joinRoom(
      inputCode,
      () => {
        setStatus("CONNECTED");
        onGameStartReady(inputCode, false);
      },
      () => setStatus("ERROR"),
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
            <span>🌐</span>
            <span>Сетевая игра</span>
          </h2>
          <button
            onClick={handleManualClose}
            className="text-zinc-500 hover:text-zinc-300 font-bold cursor-pointer text-lg"
          >
            ✕
          </button>
        </div>

        {status === "CONNECTED" ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🟢</div>
            <h3 className="text-xl font-black text-emerald-400 mb-2">
              Соединение установлено!
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {mpService.isHost
                ? "Игрок подключился. Выберите режим в меню и нажмите «Начать операцию»."
                : "Ожидайте запуска партии хостом..."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => {
                  setTab("CREATE");
                  if (!mpService.roomCode) startCreatingRoom();
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  tab === "CREATE"
                    ? "bg-amber-500 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Создать комнату
              </button>
              <button
                onClick={() => setTab("JOIN")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  tab === "JOIN"
                    ? "bg-amber-500 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Войти по коду
              </button>
            </div>

            {tab === "CREATE" && (
              <div className="flex flex-col items-center text-center space-y-4">
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
                  Код вашей комнаты:
                </span>

                <div
                  onClick={handleCopyCode}
                  className="cursor-pointer group flex flex-col items-center"
                >
                  <div className="text-4xl font-black tracking-widest text-amber-400 bg-zinc-950 px-8 py-3.5 rounded-2xl border border-amber-900/50 group-hover:border-amber-500 transition shadow-inner">
                    {roomCode || "..."}
                  </div>
                  <span className="text-[10px] text-zinc-500 group-hover:text-amber-400 mt-1.5 font-mono">
                    {isCopied
                      ? "✓ Скопировано в буфер"
                      : "Нажмите, чтобы скопировать"}
                  </span>
                </div>

                {status === "ERROR" ? (
                  <div className="text-xs text-red-400 space-y-2">
                    <span>Сбой сетевого сервера. Попробуйте еще раз.</span>
                    <button
                      onClick={startCreatingRoom}
                      className="block mx-auto text-amber-400 underline cursor-pointer"
                    >
                      Повторить попытку
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 animate-pulse font-medium">
                    Ожидание второго игрока...
                  </span>
                )}
              </div>
            )}

            {tab === "JOIN" && (
              <div className="flex flex-col space-y-4">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="0000"
                  value={inputCode}
                  onChange={(e) =>
                    setInputCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-center text-3xl font-black tracking-widest text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
                {status === "ERROR" && (
                  <span className="text-xs text-red-400 text-center">
                    Комната не найдена. Проверьте 4-значный код.
                  </span>
                )}
                <button
                  onClick={handleJoin}
                  disabled={inputCode.length !== 4 || status === "CONNECTING"}
                  className="w-full py-3.5 bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
                >
                  {status === "CONNECTING" ? "Подключение..." : "Подключиться"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
