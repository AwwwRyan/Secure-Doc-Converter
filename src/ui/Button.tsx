import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { buttonVariants, type ButtonVariantProps } from '@/ui/button-variants';
import { cn } from '@/ui/cn';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariantProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});
