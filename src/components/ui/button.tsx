/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Button Component
 * Reusable button component with multiple variants and sizes.
 */

import { ButtonHTMLAttributes, forwardRef } from 'react'

/** Button component props */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Button component with customizable variants and sizes.
 * Supports all native button attributes plus variant and size props.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

    const variants = {
      primary: 'bg-foreground text-background hover:bg-foreground/90',
      secondary: 'bg-muted text-foreground hover:bg-muted/80 border border-border',
      ghost: 'hover:bg-muted text-foreground',
      danger: 'bg-error text-white hover:bg-error/90',
    }

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
