
export type UserRole = "BUYER_ADMIN" | "SUPPLIER_OPERATOR" | "DRIVER" | "ROTALOG_ADMIN";

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organization_id?: string;
    organizations?: { id: string; name: string; role: UserRole }[];
    capabilities?: string[];
};

export type LoginCredentials = {
    email: string;
    password: string;
};

export interface AuthService {
    login(credentials: LoginCredentials): Promise<AuthUser>;
    logout(): Promise<void>;
}

const mockUsers = [
    {
        id: "comprador-001",
        name: "Comprador Demonstração",
        email: "comprador@rotalog.test",
        password: "Teste@123",
        role: "BUYER_ADMIN",
    },
    {
        id: "fornecedor-001",
        name: "Fornecedor Demonstração",
        email: "fornecedor@rotalog.test",
        password: "Teste@123",
        role: "SUPPLIER_OPERATOR",
    },
] satisfies Array<AuthUser & { password: string }>;

export const mockAuthService: AuthService = {
    async login({ email, password }) {
        const user = mockUsers.find(
            (item) =>
                item.email === email.trim().toLowerCase() &&
                item.password === password
        );

        if (!user) {
            throw new Error("E-mail ou senha inválidos.");
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };
    },

    async logout() {
        return;
    },
};
