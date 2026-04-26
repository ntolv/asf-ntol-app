import type { ReactNode } from "react";

type ColumnDef<T> = {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  mobilePriority?: 'essential' | 'secondary' | 'hidden';
};

type RowAction<T> = {
  label: string;
  icon?: string;
  onClick: (row: T) => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: (row: T) => boolean;
};

type ResponsiveTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  actions?: RowAction<T>[];
  emptyState?: {
    icon?: string;
    title: string;
    description?: string;
  };
  loading?: boolean;
  loadingMessage?: string;
  className?: string;
  mobileView?: 'cards' | 'list' | 'accordion';
  enableHorizontalScroll?: boolean;
  keyField?: keyof T;
};

function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  actions = [],
  emptyState,
  loading = false,
  loadingMessage = "Chargement...",
  className = "",
  mobileView = 'cards',
  enableHorizontalScroll = true,
  keyField = 'id',
}: ResponsiveTableProps<T>) {
  // Filtrer les colonnes pour mobile
  const mobileColumns = columns.filter(col => 
    col.mobilePriority !== 'hidden' && 
    (col.mobilePriority !== 'secondary' || mobileView === 'cards')
  );

  // Composant pour les actions de ligne
  const RowActions = ({ row }: { row: T }) => {
    if (actions.length === 0) return null;

    return (
      <div className="flex gap-2">
        {actions.map((action, index) => {
          const isDisabled = action.disabled?.(row);
          return (
            <button
              key={index}
              onClick={() => !isDisabled && action.onClick(row)}
              disabled={isDisabled}
              className={`
                inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-xs font-medium transition-colors
                ${action.variant === 'primary' ? 'bg-green-600 text-white hover:bg-green-700' : ''}
                ${action.variant === 'secondary' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : ''}
                ${action.variant === 'danger' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
                ${!action.variant ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={action.label}
            >
              {action.icon && <span>{action.icon}</span>}
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // Vue mobile cartes
  const MobileCardsView = () => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8">
          {emptyState ? (
            <div className="space-y-4">
              {emptyState.icon && <div className="text-4xl">{emptyState.icon}</div>}
              <div>
                <p className="font-semibold text-slate-900">{emptyState.title}</p>
                {emptyState.description && (
                  <p className="text-sm text-slate-500 mt-1">{emptyState.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-slate-500">Aucune donnée disponible</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.map((row, index) => (
          <div
            key={String(row[keyField] || index)}
            className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="space-y-3">
              {/* Colonnes principales */}
              {mobileColumns.map((column) => (
                <div key={String(column.key)} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.05em]">
                      {column.label}
                    </p>
                    <p className={`mt-1 text-sm ${column.className || 'text-slate-900'}`}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Actions */}
              {actions.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <RowActions row={row} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Vue desktop tableau
  const DesktopTableView = () => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8">
          {emptyState ? (
            <div className="space-y-4">
              {emptyState.icon && <div className="text-4xl">{emptyState.icon}</div>}
              <div>
                <p className="font-semibold text-slate-900">{emptyState.title}</p>
                {emptyState.description && (
                  <p className="text-sm text-slate-500 mt-1">{emptyState.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-slate-500">Aucune donnée disponible</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={enableHorizontalScroll ? "overflow-x-auto" : ""}>
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-slate-500 ${
                    column.headerClassName || ''
                  }`}
                >
                  {column.label}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={String(row[keyField] || index)} className="bg-white">
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-4 py-3 text-sm border-b border-slate-100 ${
                      column.className || 'text-slate-900'
                    }`}
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-4 py-3 text-sm border-b border-slate-100">
                    <RowActions row={row} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // État de chargement
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-green-600"></div>
          <p className="text-sm text-slate-600">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mobile: Cards view */}
      <div className="xl:hidden">
        <MobileCardsView />
      </div>
      
      {/* Desktop: Table view */}
      <div className="hidden xl:block">
        <DesktopTableView />
      </div>
    </div>
  );
}

export default ResponsiveTable;
