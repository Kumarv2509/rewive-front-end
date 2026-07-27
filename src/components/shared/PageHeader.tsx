import type { ReactNode } from 'react';

// The standard screen header: title, one plain-language subtitle, actions on
// the right, tabs underneath — always in that order. Replaces the old
// h1.page + Intro pairing (screen doctrine now lives in the subtitle line
// and the Guide, not a modal).
export function PageHeader({
  title,
  subtitle,
  actions,
  tabs,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  tabs?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="ph-row">
        <div>
          <h1 className="page">{title}</h1>
          {subtitle && <div className="subtitle">{subtitle}</div>}
        </div>
        {actions && <div className="ph-actions">{actions}</div>}
      </div>
      {tabs}
    </header>
  );
}
