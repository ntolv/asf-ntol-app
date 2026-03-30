"use client";

interface TopbarProps {
  onMenuClick?: () => void;
  userName?: string;
}

export default function Topbar({ onMenuClick, userName }: TopbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-green-200 bg-gradient-to-r from-white to-green-50/50 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <p className="text-sm font-semibold text-green-800">Association Famille NTOL</p>
          <p className="text-xs text-green-600">Tableau de bord</p>
        </div>
      </div>
      {userName && (
        <div className="hidden md:block">
          <p className="text-sm font-medium text-slate-700">{userName}</p>
        </div>
      )}
    </div>
  );
}
