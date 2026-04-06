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
        "min-h-dvh w-full bg-[linear-gradient(180deg,#f8fdf9_0%,#f3f7f5_100%)] text-slate-950",
        "xl:hidden",
        className,
      ].join(" ")}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col">
        {topBar ? (
          <div
            data-mobile-topbar-wrapper="true"
            className="sticky top-0 z-30 px-4 pb-3 pt-3 backdrop-blur-xl"
          >
            {topBar}
          </div>
        ) : null}

        <main
          data-page-shell="true"
          aria-label={pageTitle || "Contenu mobile"}
          className={[
            "flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+120px)] pt-2",
            contentClassName,
          ].join(" ")}
        >
          <div className="flex flex-col gap-4">{children}</div>
        </main>

        {bottomNav ? (
          <div
            data-mobile-shell-bottom-nav="true"
            className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4"
          >
            <div className="pointer-events-auto w-full max-w-[640px]">
              {bottomNav}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}