import React from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: 'gradient-primary text-on-primary shadow-sm shadow-primary/10 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]',
    secondary: 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:bg-surface-container-low active:scale-[0.99]',
    tertiary: 'bg-transparent text-primary hover:text-primary-strong active:scale-[0.99]',
    ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
    outline: 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:bg-surface-container-low active:scale-[0.99]',
  };

  const sizes = {
    sm: 'px-4 py-2.5 text-sm rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-lg font-bold',
    lg: 'px-7 py-3.5 text-base rounded-xl font-bold',
    xl: 'px-9 py-4 text-lg rounded-xl font-black',
  };

  return (
    <button 
      className={cn(
        'transition-all duration-200 flex items-center justify-center gap-2 font-headline',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
