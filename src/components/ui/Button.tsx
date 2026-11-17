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
    'primary-danger': 'bg-accent-danger hover:bg-rose-600 text-white shadow-neon-rose',
    'primary-info': 'bg-accent-primary hover:bg-blue-600 text-white shadow-neon-blue',
    'secondary': 'bg-background-surface/80 border border-border-subtle text-zinc-200 hover:bg-background-panel',
    'ghost': 'bg-transparent text-zinc-400 hover:text-zinc-200',
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

