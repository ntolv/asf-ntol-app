import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
  className?: string;
};

export default function ActionButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ActionButtonProps) {
  const variantClasses = {
    primary: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border-green-600",
    secondary: "bg-white text-green-600 border-green-600 hover:bg-green-50 focus:ring-green-500",
    outline: "bg-transparent text-green-600 border-green-600 hover:bg-green-50 focus:ring-green-500",
    ghost: "bg-transparent text-slate-600 border-transparent hover:bg-slate-50 focus:ring-slate-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-red-600",
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-sm",
    lg: "px-6 py-4 text-base",
  };

  const iconSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-[12px] border font-medium
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          <span>Chargement...</span>
        </>
      ) : (
        <>
          {icon && (
            <span className={iconSizeClasses[size]} role="img" aria-hidden="true">
              {icon}
            </span>
          )}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
