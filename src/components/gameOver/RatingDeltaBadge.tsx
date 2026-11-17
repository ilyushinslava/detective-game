import React from 'react';

export interface RatingDeltaBadgeProps {
  label: string;
  rating?: number;
  ratingDelta?: number;
}

export const RatingDeltaBadge: React.FC<RatingDeltaBadgeProps> = ({
  label,
  rating,
  ratingDelta,
}) => {
  if (rating === undefined) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono mb-3 px-3 py-1 rounded-lg bg-zinc-900/90 border border-white/10 text-zinc-300">
      <span>{label}</span>
      <span className="font-bold text-white">{rating}</span>
      {ratingDelta !== undefined && (
        <span className={`font-bold ${ratingDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          ({ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta})
        </span>
      )}
    </div>
  );
};
