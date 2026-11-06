import { useId } from "react";
import type { MockUser } from "../../features/auth/mocks/users.mock";
import type { Organization } from "../../features/organizations/mocks/organizations.mock";

type Props = {
    organizations: Organization[];
    users: MockUser[];
    organizationId: string;
    userId: string;
    onOrganizationChange: (id: string) => void;
    onUserChange: (id: string) => void;
};

export function SupplierDevControls({ organizations, users, organizationId, userId, onOrganizationChange, onUserChange }: Props) {
    const id = useId();
    if (!import.meta.env.DEV) return null;
    return <details className="mb-4 rounded-lg border border-slate-700 p-2 text-xs text-slate-300">
        <summary className="cursor-pointer rounded px-1 py-1 focus-visible:outline-2 focus-visible:outline-blue-400">Controles de desenvolvimento</summary>
        <div className="mt-3 space-y-3">
            <div>
                <label htmlFor={`${id}-organization`} className="block">Organização ativa</label>
                <select id={`${id}-organization`} value={organizationId} onChange={(event) => onOrganizationChange(event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-2 text-white focus-visible:outline-2 focus-visible:outline-blue-400">
                    {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor={`${id}-user`} className="block">Usuário de teste</label>
                <select id={`${id}-user`} value={userId} onChange={(event) => onUserChange(event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-2 text-white focus-visible:outline-2 focus-visible:outline-blue-400">
                    {users.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
                </select>
            </div>
        </div>
    </details>;
}
