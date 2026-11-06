import type { ReactNode } from "react";

type PageHeaderProps = {
    title: string;
    subtitle: string;
    actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </div>
            {actions && <div className="flex shrink-0 items-center justify-end gap-2">{actions}</div>}
        </header>
    );
}
