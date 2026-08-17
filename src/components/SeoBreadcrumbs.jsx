import { Link } from 'react-router-dom';

export default function SeoBreadcrumbs({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.to && !last ? (
                <Link to={item.to} className="font-semibold hover:text-primary dark:hover:text-blue-300">
                  {item.label}
                </Link>
              ) : (
                <span className="font-bold text-slate-800 dark:text-slate-100">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
