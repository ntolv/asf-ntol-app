import type { ReactNode } from "react";

type LoadingStateProps = {
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "overlay" | "inline";
  className?: string;
};

export default function LoadingState({
  message = "Chargement...",
  size = "md",
  variant = "default",
  className = "",
}: LoadingStateProps) {
  const sizeClasses = {
    sm: {
      container: "py-4 px-4",
      spinner: "h-4 w-4",
      text: "text-sm",
    },
    md: {
      container: "py-8 px-6",
      spinner: "h-6 w-6",
      text: "text-base",
    },
    lg: {
      container: "py-12 px-8",
      spinner: "h-8 w-8",
      text: "text-lg",
    },
  };

  const variantClasses = {
    default: "flex flex-col items-center justify-center",
    overlay: "fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50",
    inline: "flex items-center gap-3",
  };

  const classes = sizeClasses[size];

  return (
    <div className={`${variantClasses[variant]} ${classes.container} ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-slate-200 border-t-green-600 ${classes.spinner}`} />
      {message && (
        <p className={`${classes.text} text-slate-600 mt-3 leading-relaxed ${variant === "inline" ? "mt-0" : ""}`}>
          {message}
        </p>
      )}
    </div>
  );
}
