import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/ui/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-ctl)] font-semibold ' +
    'whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-accent-press',
        ghost: 'border border-line bg-surface text-ink hover:bg-bg',
        subtle: 'bg-accent-wash text-accent hover:brightness-95',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(button({ variant, size }), className)} {...props} />
  );
});
