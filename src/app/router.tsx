import { createBrowserRouter, Outlet } from "react-router-dom";

import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { authMode } from "../shared/api/config";

import { NotFoundPage } from "../shared/pages/NotFoundPage";
import { RouteErrorPage } from "../shared/pages/RouteErrorPage";

import { AppLayout } from "../shared/components/AppLayout";
import { MarketplaceLayout } from "../shared/components/MarketplaceLayout";

import { ApiOrdersProvider } from "../features/orders/api/OrdersProvider";

import { AdminLayout } from "../features/admin/layout/AdminLayout";

import { lazyPage } from "./lazyPage";

const Login = lazyPage(() => import("./pages/AuthPages").then(module => ({ default: module.Login })));
const Register = lazyPage(() => import("./pages/AuthPages").then(module => ({ default: module.Register })));
const ApiBuyerHome = lazyPage(() => import("./pages/BuyerPortal").then(module => ({ default: module.ApiBuyerHome })));
const ApiBuyerProductDetails = lazyPage(() => import("./pages/BuyerPortal").then(module => ({ default: module.ApiBuyerProductDetails })));
const ApiBuyerCart = lazyPage(() => import("./pages/BuyerPortal").then(module => ({ default: module.ApiBuyerCart })));
const ApiBuyerPurchases = lazyPage(() => import("./pages/BuyerPortal").then(module => ({ default: module.ApiBuyerPurchases })));
const ApiBuyerPurchaseDetails = lazyPage(() => import("./pages/BuyerPortal").then(module => ({ default: module.ApiBuyerPurchaseDetails })));
const BuyerAccount = lazyPage(() => import("./pages/BuyerPortal").then(module => ({ default: module.BuyerAccount })));
const ApiSupplierProducts = lazyPage(() => import("./pages/SupplierPortal").then(module => ({ default: module.ApiSupplierProducts })));
const ApiSupplierInventory = lazyPage(() => import("./pages/SupplierPortal").then(module => ({ default: module.ApiSupplierInventory })));
const ApiSupplierOrders = lazyPage(() => import("./pages/SupplierPortal").then(module => ({ default: module.ApiSupplierOrders })));
const ApiSupplierDashboard = lazyPage(() => import("./pages/SupplierPortal").then(module => ({ default: module.ApiSupplierDashboard })));
const SupplierRoutes = lazyPage(() => import("./pages/SupplierPortal").then(module => ({ default: module.SupplierRoutes })));
const SupplierAccount = lazyPage(() => import("./pages/SupplierPortal").then(module => ({ default: module.SupplierAccount })));
const ProductCatalog = lazyPage(() => import("./pages/LegacyPages").then(module => ({ default: module.ProductCatalog })));
const ProductDetails = lazyPage(() => import("./pages/LegacyPages").then(module => ({ default: module.ProductDetails })));
const SupplierDashboard = lazyPage(() => import("./pages/LegacyPages").then(module => ({ default: module.SupplierDashboard })));
const SupplierOrders = lazyPage(() => import("./pages/LegacyPages").then(module => ({ default: module.SupplierOrders })));
const SupplierProducts = lazyPage(() => import("./pages/LegacyPages").then(module => ({ default: module.SupplierProducts })));
const SupplierInventory = lazyPage(() => import("./pages/LegacyPages").then(module => ({ default: module.SupplierInventory })));
const BuyerCart = lazyPage(() => import("./pages/LegacyPages").then(module => ({ default: module.BuyerCart })));
const BuyerPurchases = lazyPage(() => import("./pages/LegacyPages").then(module => ({ default: module.BuyerPurchases })));
const BuyerPurchaseDetails = lazyPage(() => import("./pages/LegacyPages").then(module => ({ default: module.BuyerPurchaseDetails })));
const AdminAccount = lazyPage(() => import("../features/admin/pages/AdminPages").then(module => ({ default: module.AdminAccount })));
const AdminCatalog = lazyPage(() => import("../features/admin/pages/AdminPages").then(module => ({ default: module.AdminCatalog })));
const AdminOverview = lazyPage(() => import("../features/admin/pages/AdminPages").then(module => ({ default: module.AdminOverview })));
const AdminProductCreate = lazyPage(() => import("../features/admin/pages/AdminPages").then(module => ({ default: module.AdminProductCreate })));
const PlanningDashboard = lazyPage(() => import("../features/planning/pages/PlanningDashboard").then(module => ({ default: module.PlanningDashboard })));

export const router = createBrowserRouter([
    {
        path: "/",
        element: <MarketplaceLayout />,
        errorElement: <RouteErrorPage />,
        children: [
            { index: true, element: authMode === "api" ? <ApiBuyerHome /> : <ProductCatalog /> },
            {
                path: "produto/:productId",
                element: (
                    <ProtectedRoute allowedRoles={["BUYER_ADMIN"]} capability={authMode === "api" ? "catalog:read" : undefined}>
                        {authMode === "api" ? <ApiBuyerProductDetails /> : <ProductDetails />}
                    </ProtectedRoute>
                ),
            },
            {
                path: "comprador",
                element: (
                    <ProtectedRoute allowedRoles={["BUYER_ADMIN"]}>
                        <Outlet />
                    </ProtectedRoute>
                ),
                children: [
                    {
                        path: "carrinho",
                        element: authMode === "api"
                            ? <ProtectedRoute allowedRoles={["BUYER_ADMIN"]} capability="checkout:create"><ApiBuyerCart /></ProtectedRoute>
                            : <BuyerCart />,
                    },
                    {
                        path: "compras",
                        element: authMode === "api"
                            ? <ProtectedRoute allowedRoles={["BUYER_ADMIN"]} capability="purchase:read"><ApiBuyerPurchases /></ProtectedRoute>
                            : <BuyerPurchases />,
                    },
                    {
                        path: "compras/:purchaseId",
                        element: authMode === "api"
                            ? <ProtectedRoute allowedRoles={["BUYER_ADMIN"]} capability="purchase:read"><ApiBuyerPurchaseDetails /></ProtectedRoute>
                            : <BuyerPurchaseDetails />,
                    },
                    { path: "conta", element: <BuyerAccount /> },
                ],
            },
        ],
    },
    { path: "/login", element: <Login />, errorElement: <RouteErrorPage /> },
    { path: "/cadastro", element: <Register />, errorElement: <RouteErrorPage /> },
    {
        path: "/admin",
        element: (
            <ProtectedRoute allowedRoles={["ROTALOG_ADMIN"]} capability="catalog:read">
                <AdminLayout />
            </ProtectedRoute>
        ),
        errorElement: <RouteErrorPage />,
        children: [
            { index: true, element: <AdminOverview /> },
            { path: "products", element: <AdminCatalog /> },
            {
                path: "products/new",
                element: <ProtectedRoute allowedRoles={["ROTALOG_ADMIN"]} capability="product:write"><AdminProductCreate /></ProtectedRoute>,
            },
            { path: "account", element: <AdminAccount /> },
        ],
    },
    {
        path: "/fornecedor",
        element: (
            <ProtectedRoute allowedRoles={authMode === "api" ? ["SUPPLIER_OPERATOR", "ROUTE_PLANNER"] : ["SUPPLIER_OPERATOR"]}>
                {authMode === "api" ? <ApiOrdersProvider><AppLayout /></ApiOrdersProvider> : <AppLayout />}
            </ProtectedRoute>
        ),
        errorElement: <RouteErrorPage />,
        children: [
            { index: true, element: authMode === "api" ? <ApiSupplierDashboard /> : <SupplierDashboard /> },
            { path: "pedidos", element: authMode === "api" ? <ApiSupplierOrders /> : <SupplierOrders /> },
            { path: "produtos", element: authMode === "api" ? <ApiSupplierProducts /> : <SupplierProducts /> },
            { path: "estoque", element: authMode === "api" ? <ApiSupplierInventory /> : <SupplierInventory /> },
            { path: "conta", element: <SupplierAccount /> },
            { path: "rotas", element: <SupplierRoutes /> },
            ...(authMode === "api" ? [{ path: "planejamento", element: <ProtectedRoute allowedRoles={["ROUTE_PLANNER"]} capability="route:plan"><PlanningDashboard /></ProtectedRoute> }] : []),
        ],
    },
    { path: "*", element: <NotFoundPage /> },
]);
