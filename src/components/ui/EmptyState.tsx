import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "centered" | "minimal";
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  variant = "default",
  className = "",
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: "py-8 px-4",
      icon: "text-3xl",
      title: "text-lg",
      description: "text-sm",
    },
    md: {
      container: "py-12 px-6",
      icon: "text-4xl",
      title: "text-xl",
      description: "text-base",
    },
    lg: {
      container: "py-16 px-8",
      icon: "text-5xl",
      title: "text-2xl",
      description: "text-lg",
    },
  };

  const variantClasses = {
    default: "text-center",
    centered: "text-center max-w-md mx-auto",
    minimal: "text-left",
  };

  const classes = sizeClasses[size];

  return (
    <div className={`${variantClasses[variant]} ${classes.container} ${className}`}>
      {icon && (
        <div className="flex justify-center mb-4">
          <span className={`${classes.icon} text-slate-400`} role="img" aria-hidden="true">
            {icon}
          </span>
        </div>
      )}
      <h3 className={`${classes.title} font-semibold text-slate-900 mb-2 leading-tight`}>
        {title}
      </h3>
      {description && (
        <p className={`${classes.description} text-slate-600 mb-6 leading-relaxed`}>
          {description}
        </p>
      )}
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
