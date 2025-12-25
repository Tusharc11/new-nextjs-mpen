// @/components/ui/button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string;
    variant?: 'default' | 'neutral' | 'primary' | 'secondary' | 'accent' | 'ghost' | 'link' | 'info' | 'success' | 'warning' | 'error';
    size?: 'lg' | 'md' | 'sm' | 'xs';
    outline?: boolean;

}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'default', size, outline, children, ...props }, ref) => {
        const getButtonClasses = () => {
            const classes = ['btn'];

            // Add variant
            if (variant !== 'default') {
                classes.push(`btn-${variant}`);
            }

            // Add size
            if (size) {
                classes.push(`btn-${size}`);
            }

            // Add outline
            if (outline) {
                classes.push('btn-outline');
            }

            // Add custom classes
            if (className) {
                classes.push(className);
            }

            return classes.join(' ');
        };

        return (
            <button
                ref={ref}
                className={getButtonClasses()}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };