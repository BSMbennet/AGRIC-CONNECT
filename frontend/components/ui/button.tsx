import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-forest text-white hover:bg-leaf",
        variant === "outline" && "border border-emerald-900/20 bg-white text-forest hover:bg-cream",
        variant === "ghost" && "text-forest hover:bg-cream",
        size === "default" && "h-11 px-5 text-sm",
        size === "sm" && "h-9 px-3 text-xs",
        size === "lg" && "h-12 px-6 text-base",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
