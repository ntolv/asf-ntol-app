import type { ReactNode } from "react";

type SectionCardProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  variant?: "default" | "gradient" | "bordered" | "elevated";
  padding?: "sm" | "md" | "lg";
  className?: string;
};

export default function SectionCard({
  children,
  title,
  subtitle,
  actions,
  variant = "default",
  padding = "md",
  className = "",
}: SectionCardProps) {
  const variantClasses = {
    default: "border border-slate-200 bg-white",
    gradient: "border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white",
    bordered: "border-2 border-emerald-200 bg-white",
    elevated: "border border-slate-200 bg-white shadow-lg",
  };

  const paddingClasses = {
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <section className={`rounded-[24px] ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-slate-100 last:border-0 last:pb-0 last:mb-0 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            {title && (
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex-shrink-0 mt-2 md:mt-0">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}
