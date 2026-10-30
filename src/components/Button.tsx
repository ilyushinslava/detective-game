import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseClasses = "flex items-center justify-center font-bold uppercase tracking-wider transition-transform active:scale-95 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";
  const variantClasses = variant === 'primary'
    ? "bg-red-700 hover:bg-red-600 text-white shadow-[0_4px_15px_rgba(185,28,28,0.4)]"
    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700";
  const sizeClasses = size === 'lg' ? "h-14 px-6 text-sm" : "h-12 px-4 text-xs";
  const widthClasses = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${widthClasses} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};
