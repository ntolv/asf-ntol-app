"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type DomainQuickNavItem = {
  href: string;
  label: string;
};

type DomainQuickNavProps = {
  title: string;
  items: DomainQuickNavItem[];
  columns?: 2 | 3;
};

function isItemActive(
  pathname: string,
  href: string
) {
  if (pathname === href) {
    return true;
  }

  if (
    href === "/prets" &&
    pathname.startsWith("/prets/")
  ) {
    return true;
  }

  return false;
}

export default function DomainQuickNav({
  title,
  items,
  columns = 2,
}: DomainQuickNavProps) {
  const pathname = usePathname();

  return (
    <section
      aria-label={`Navigation ${title}`}
      className="mb-5 rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-sm xl:hidden"
    >
      <div className="mb-3 flex items-center justify-center">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800">
          {title}
        </p>
      </div>

      <nav
        className={[
          "grid gap-2",
          columns === 3
            ? "grid-cols-3"
            : "grid-cols-2",
        ].join(" ")}
      >
        {items.map((item) => {
          const active = isItemActive(
            pathname,
            item.href
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                active ? "page" : undefined
              }
              className={[
                "flex min-h-[48px] items-center justify-center rounded-xl border px-2 py-2.5 text-center text-[12px] font-bold leading-tight transition",
                active
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                  : "border-emerald-100 bg-emerald-50/60 text-emerald-950 active:bg-emerald-100",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}