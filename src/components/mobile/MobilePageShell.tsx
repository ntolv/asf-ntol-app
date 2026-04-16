import type { ReactNode } from "react";

type MobilePageShellProps = {
  children: ReactNode;
  topBar?: ReactNode;
  bottomNav?: ReactNode;
  className?: string;
  contentClassName?: string;
  pageTitle?: string;
};

export default function MobilePageShell({
  children,
  topBar,
  bottomNav,
  className = "",
  contentClassName = "",
  pageTitle,
}: MobilePageShellProps) {
  return (
    <div
      data-mobile-page-shell="true"
      className={[
        "min-h-dvh w-full bg-slate-50 text-slate-950",
        "xl:hidden",
        className,
      ].join(" ")}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col">
        {topBar ? (
          <div
            data-mobile-topbar-wrapper="true"
            className="px-4 pb-3 pt-3"
          >
            {topBar}
          </div>
        ) : null}

        <main
          data-page-shell="true"
          aria-label={pageTitle || "Contenu mobile"}
          className={[
            "flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-1",
            contentClassName,
          ].join(" ")}
        >
          <div className="flex flex-col gap-4">{children}</div>
        </main>

        {bottomNav ? (
          <div
            data-mobile-shell-bottom-nav="true"
            className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-3 pb-3"
          >
            <div className="w-full max-w-[640px]">
              {bottomNav}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
