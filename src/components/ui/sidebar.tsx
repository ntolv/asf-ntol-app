"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  TrendingUp,
  Gavel,
  Heart,
  HandCoins,
  FileText,
  X,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contributions", href: "/contributions", icon: CreditCard },
  { name: "Imputations", href: "/imputations", icon: FileText },
  { name: "Tontine", href: "/tontine", icon: TrendingUp },
  { name: "Enchères", href: "/encheres", icon: Gavel },
  { name: "Aides", href: "/aides", icon: Heart },
  { name: "Prêts", href: "/prets", icon: HandCoins },
  { name: "Membres", href: "/membres", icon: Users },
  { name: "Documents", href: "/documents", icon: FileText },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
              <span className="text-sm font-bold text-white">ASF</span>
            </div>
            <span className="text-xl font-bold text-gray-900">NTOL</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => onClose()}
                  className={`
                    group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? "border-l-4 border-green-600 bg-green-50 text-green-700"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? "text-green-600" : "text-gray-400 group-hover:text-gray-500"}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
