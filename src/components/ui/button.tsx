import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-900/10 focus-visible:outline-primary-600",
  secondary:
    "bg-primary-50 text-primary-700 hover:bg-primary-100 focus-visible:outline-primary-600",
  outline:
    "border border-[var(--color-border)] bg-white text-ink-700 hover:bg-ink-50 focus-visible:outline-primary-600",
  ghost: "text-ink-700 hover:bg-ink-100 focus-visible:outline-primary-600",
  danger: "bg-danger-600 text-white hover:bg-danger-700 focus-visible:outline-danger-600",
  success: "bg-success-600 text-white hover:bg-success-700 focus-visible:outline-success-600",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-11 px-5 text-base gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-lg justify-center",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 outline-none whitespace-nowrap",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
