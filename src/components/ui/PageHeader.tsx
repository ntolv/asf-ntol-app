import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export default function PageHeader({
  title,
  subtitle,
  actions,
  size = "md",
  className = "",
}: PageHeaderProps) {
  const sizeClasses = {
    sm: {
      title: "text-xl md:text-2xl",
      subtitle: "text-sm",
      container: "p-4 md:p-5",
    },
    md: {
      title: "text-2xl md:text-3xl",
      subtitle: "text-sm md:text-base",
      container: "p-4 md:p-6",
    },
    lg: {
      title: "text-3xl md:text-4xl",
      subtitle: "text-base md:text-lg",
      container: "p-5 md:p-8",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`space-y-4 ${classes.container} ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <h1 className={`${classes.title} font-bold text-slate-900 leading-tight`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`mt-2 ${classes.subtitle} text-slate-600 leading-relaxed`}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0 mt-3 md:mt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
