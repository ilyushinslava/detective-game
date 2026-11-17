import React from "react";

interface BoardCellOverlayProps {
  isRadarTarget: boolean;
  isRedRadar: boolean;
}

export const BoardCellOverlay: React.FC<BoardCellOverlayProps> = ({
  isRadarTarget,
  isRedRadar,
}) => {
  return (
    <div className="absolute inset-0 rounded-md sm:rounded-xl pointer-events-none z-30 overflow-hidden">
      <div
        className={`absolute inset-0 rounded-md sm:rounded-xl mix-blend-screen transition-opacity duration-300 ${
          isRadarTarget
            ? isRedRadar
              ? "bg-red-500/15 shadow-[inset_0_0_15px_rgba(239,68,68,0.25)]"
              : "bg-blue-500/15 shadow-[inset_0_0_15px_rgba(59,130,246,0.25)]"
            : isRedRadar
              ? "bg-red-500/10"
              : "bg-blue-500/10"
        }`}
      />

      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <rect
          x="1.5"
          y="1.5"
          width="calc(100% - 3px)"
          height="calc(100% - 3px)"
          rx="9"
          fill="none"
          stroke={isRedRadar ? "#f87171" : "#3b82f6"}
          strokeWidth="2"
          strokeLinecap="round"
          className="radar-marching-stroke"
          style={{
            filter: `drop-shadow(0 0 4px ${isRedRadar ? "rgba(239,68,68,0.7)" : "rgba(59,130,246,0.7)"})`,
          }}
        />
      </svg>

      {isRadarTarget && (
        <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-zinc-950/90 border border-blue-400 flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.9)] z-30">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
        </div>
      )}
    </div>
  );
};
