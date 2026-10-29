import type { AuthUser } from "../features/services/auth.service";
import { adminAuthorized, buyerAuthorized, plannerAuthorized, supplierPermissions } from "../features/services/apiAuth.service";

import type { Permission } from "../features/auth/mocks/users.mock";

/**
 * ROT-015-FE
 *
 * Configuração provisória de navegação e permissões.
 * As capacidades definitivas serão integradas à API.
 */

export type AppRoute = {
    path: string;
    label: string;
    permission: Permission;
};

export const appRoutes: AppRoute[] = [
    {
        path: "/fornecedor",
        label: "Dashboard",
        permission: "dashboard:view",
    },
    {
        path: "/fornecedor/pedidos",
        label: "Pedidos",
        permission: "orders:view",
    },
    {
        path: "/fornecedor/produtos",
        label: "Produtos",
        permission: "products:view",
    },
    {
        path: "/fornecedor/estoque",
        label: "Estoque",
        permission: "inventory:view",
    },
    {
        path: "/fornecedor/rotas",
        label: "Rotas",
        permission: "routes:view",
    },
];

export function getRoutePermission(
    pathname: string
): Permission | undefined {
    return appRoutes.find(
        (route) => route.path === pathname
    )?.permission;
}

export function getFirstAllowedRoute(
    permissions: Permission[]
): string | null {
    return (
        appRoutes.find((route) =>
            permissions.includes(route.permission)
        )?.path ?? null
    );
}

export function canAccessRoute(
    pathname: string,
    permissions: Permission[]
): boolean {
    const requiredPermission = getRoutePermission(pathname);

    return (
        requiredPermission !== undefined &&
        permissions.includes(requiredPermission)
    );
}

// API policy is separate from the legacy mock navigation above.
export type OperationalRoute = { path: string; label: string };
const planningPath = "/fornecedor/planejamento";

export type AdminRoute = OperationalRoute & { capability: "catalog:read" | "product:write" };
const administrativeRoutes: AdminRoute[] = [
    { path: "/admin", label: "Visão geral", capability: "catalog:read" },
    { path: "/admin/products", label: "Produtos publicados", capability: "catalog:read" },
    { path: "/admin/products/new", label: "Cadastrar produto", capability: "product:write" },
];

export function getAdminRouteCapability(pathname: string): AdminRoute["capability"] | undefined {
    if (pathname === "/admin/account") return "catalog:read";
    return administrativeRoutes.find(route => route.path === pathname)?.capability;
}

export function adminRoutes(user: AuthUser): OperationalRoute[] {
    if (!adminAuthorized(user, "catalog:read")) return [];
    return administrativeRoutes
        .filter(route => route.capability === "catalog:read" || adminAuthorized(user, route.capability))
        .map(({ path, label }) => ({ path, label }));
}

export function canAccessAdminRoute(user: AuthUser, pathname: string): boolean {
    const capability = getAdminRouteCapability(pathname);
    return capability !== undefined && adminAuthorized(user, "catalog:read") &&
        (capability === "catalog:read" || adminAuthorized(user, capability));
}

export function operationalRoutes(user: AuthUser): OperationalRoute[] {
    if (plannerAuthorized(user)) return [{ path: planningPath, label: "Planejamento" }];
    const permissions = supplierPermissions(user);
    return appRoutes.filter(route => permissions.includes(route.permission));
}
export function canAccessOperationalRoute(user: AuthUser, pathname: string): boolean {
    if (pathname === "/fornecedor/conta") return supplierPermissions(user).length > 0;
    return operationalRoutes(user).some(route => route.path === pathname);
}
export function defaultUserPath(user: AuthUser, apiMode = true): string {
    if (user.role === "ROTALOG_ADMIN") return "/admin";
    if (user.role === "BUYER_ADMIN") return apiMode && buyerAuthorized(user, "catalog:read") ? "/" : "/comprador/compras";
    if (!apiMode && user.role === "SUPPLIER_OPERATOR") return "/fornecedor";
    return operationalRoutes(user)[0]?.path ?? "/login";
}
export function loginDestination(user: AuthUser, requested: unknown, apiMode: boolean): string {
    const fallback = defaultUserPath(user, apiMode);
    if (typeof requested !== "string" || !requested.startsWith("/") || /[\\?#%]/.test(requested) || requested.startsWith("//") || requested.includes("://")) return fallback;
    if (user.role === "SUPPLIER_OPERATOR" || user.role === "ROUTE_PLANNER") {
        return (apiMode ? canAccessOperationalRoute(user, requested) : appRoutes.some(route => route.path === requested) || requested === "/fornecedor/conta") ? requested : fallback;
    }
    if (user.role === "ROTALOG_ADMIN") {
        return canAccessAdminRoute(user, requested) ? requested : fallback;
    }
    if (user.role === "BUYER_ADMIN") {
        const capability = requested === "/comprador/carrinho" ? "checkout:create" : /^\/comprador\/compras(?:\/[^/]+)?$/.test(requested) ? "purchase:read" : "catalog:read";
        const known = ["/", "/comprador/conta", "/comprador/carrinho"].includes(requested) || /^\/comprador\/compras(?:\/[^/]+)?$/.test(requested) || /^\/produto\/[^/]+$/.test(requested);
        return known && (!apiMode || buyerAuthorized(user, capability) || (requested === "/comprador/conta" && buyerAuthorized(user, "purchase:read"))) ? requested : fallback;
    }
    return fallback;
}
