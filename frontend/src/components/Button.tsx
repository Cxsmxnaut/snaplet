import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { snapletDurations, snapletEase } from '../lib/motion';

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
  disabled,
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: 'gradient-primary text-on-primary shadow-sm shadow-primary/10 hover:shadow-[0_14px_30px_rgba(99,173,158,0.24)]',
    secondary: 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:bg-surface-container-low hover:shadow-[0_12px_24px_rgba(40,46,62,0.08)]',
    tertiary: 'bg-transparent text-primary hover:text-primary-strong',
    ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
    outline: 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface hover:bg-surface-container-low hover:shadow-[0_12px_24px_rgba(40,46,62,0.08)]',
  };

  const sizes = {
    sm: 'px-4 py-2.5 text-sm rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-lg font-bold',
    lg: 'px-7 py-3.5 text-base rounded-xl font-bold',
    xl: 'px-9 py-4 text-lg rounded-xl font-black',
  };

  return (
    <motion.button 
      whileHover={disabled ? undefined : { scale: 1.01, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.985, y: 0 }}
      transition={{ duration: snapletDurations.fast, ease: snapletEase }}
      className={cn(
        'interactive-control flex items-center justify-center gap-2 font-headline',
        disabled && 'cursor-not-allowed opacity-60 shadow-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
};
