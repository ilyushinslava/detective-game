import React from 'react';

export type ButtonVariant = 'primary-danger' | 'primary-info' | 'secondary' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'secondary',
  fullWidth = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}, ref) => {
  const baseClasses =
    'h-12 rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center px-4 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100';

  const variantClasses: Record<ButtonVariant, string> = {
    'primary-danger': 'bg-red-700 text-zinc-50 hover:bg-red-600',
    'primary-info': 'bg-cyan-800 text-zinc-50 hover:bg-cyan-700',
    'secondary': 'bg-zinc-800/50 border border-zinc-700 text-zinc-200 hover:bg-zinc-700',
    'ghost': 'bg-transparent text-zinc-500 hover:text-zinc-300',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon && <span className="mr-2 shrink-0 flex items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

