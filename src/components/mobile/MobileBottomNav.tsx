"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MobileBottomNavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  exact?: boolean;
};

type MobileBottomNavProps = {
  items: MobileBottomNavItem[];
  className?: string;
};

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(href + "/");
}

function DefaultDot() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-2.5 w-2.5 rounded-full bg-current"
    />
  );
}

export default function MobileBottomNav({
  items,
  className = "",
}: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      data-mobile-bottom-nav="true"
      aria-label="Navigation principale mobile"
      className={[
        "rounded-[30px] border border-emerald-100/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-xl",
        "px-2 py-2",
        className,
      ].join(" ")}
    >
      <ul className="grid grid-cols-5 gap-2">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href, item.exact);

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "group flex min-h-[70px] w-full flex-col items-center justify-center gap-2 rounded-[24px] px-2 py-3 text-center transition-all duration-200",
                  active
                    ? "bg-emerald-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.28)]"
                    : "bg-transparent text-slate-500 hover:bg-emerald-50 hover:text-emerald-700",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "flex h-6 w-6 items-center justify-center text-[18px] leading-none",
                    active ? "text-white" : "text-current",
                  ].join(" ")}
                >
                  {item.icon ?? <DefaultDot />}
                </span>

                <span className="block max-w-full truncate text-[11px] font-bold leading-tight">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}