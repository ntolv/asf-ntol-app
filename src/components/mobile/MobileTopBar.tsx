"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

type MobileTopBarProps = {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
};

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function MobileTopBar({
  title,
  subtitle,
  rightAction,
  showBackButton = false,
  onBack,
  className = "",
}: MobileTopBarProps) {
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }

    router.back();
  }

  return (
    <header
      data-mobile-topbar="true"
      className={[
        "rounded-[28px] border border-white/70 bg-white/88 px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.08)]",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-[48px] items-center justify-start">
          {showBackButton ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Retour"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
            >
              <BackIcon />
            </button>
          ) : (
            <div className="h-12 w-12" />
          )}
        </div>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[17px] font-extrabold tracking-[-0.02em] text-slate-950">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 truncate text-[12px] font-medium text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-[48px] items-center justify-end">
          {rightAction ? rightAction : <div className="h-12 w-12" />}
        </div>
      </div>
    </header>
  );
}