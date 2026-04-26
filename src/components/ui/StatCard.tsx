import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "stable";
  icon?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "bordered" | "elevated";
  className?: string;
};

export default function StatCard({
  label,
  value,
  trend,
  icon,
  description,
  size = "md",
  variant = "default",
  className = "",
}: StatCardProps) {
  const sizeClasses = {
    sm: {
      container: "p-4",
      value: "text-2xl",
      label: "text-xs",
    },
    md: {
      container: "p-5",
      value: "text-3xl",
      label: "text-sm",
    },
    lg: {
      container: "p-6",
      value: "text-4xl",
      label: "text-base",
    },
  };

  const variantClasses = {
    default: "border border-slate-200 bg-white",
    bordered: "border-2 border-emerald-200 bg-white",
    elevated: "border border-slate-200 bg-white shadow-lg",
  };

  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    stable: "text-slate-600",
  };

  const trendIcons = {
    up: "↑",
    down: "↓",
    stable: "→",
  };

  const classes = sizeClasses[size];

  return (
    <div className={`rounded-[20px] ${variantClasses[variant]} ${classes.container} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className={`${classes.label} font-medium text-slate-600 uppercase tracking-[0.05em]`}>
            {label}
          </p>
          <p className={`${classes.value} font-bold text-slate-900 mt-1 leading-tight`}>
            {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
          </p>
          {description && (
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {icon && (
            <span className="text-2xl" role="img" aria-hidden="true">
              {icon}
            </span>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-medium ${trendColors[trend]}`}>
              <span>{trendIcons[trend]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
