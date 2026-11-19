import React from 'react';

export type ButtonVariant = 'primary' | 'primary-info' | 'primary-danger' | 'danger' | 'secondary' | 'ghost';

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
    'primary': 'neo-button-primary',
    'primary-info': 'neo-button-primary',
    'primary-danger': 'neo-button-danger',
    'danger': 'neo-button-danger',
    'secondary': 'bg-zinc-900/80 hover:bg-zinc-800/90 border border-white/10 hover:border-white/20 text-zinc-200 hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-md',
    'ghost': 'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]',
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

export default Button;

