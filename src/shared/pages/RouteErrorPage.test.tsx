import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { RouteErrorPage } from "./RouteErrorPage";
import { NotFoundPage } from "./NotFoundPage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function show(error: unknown) {
    const router = createMemoryRouter([{ path: "/", loader: () => { throw error; }, element: <p>Conteúdo</p>, errorElement: <RouteErrorPage /> }]);
    render(<RouterProvider router={router}/>);
}
test("unexpected errors show safe recovery without sensitive details", async () => {
    show(new Error("internal secret database credentials"));
    expect(await screen.findByRole("heading", { name: "Não foi possível carregar esta página" })).toBeTruthy();
    expect(screen.queryByText(/internal secret/)).toBeNull();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Voltar ao início" }).getAttribute("href")).toBe("/");
});
test("HTTP 404 shows the missing page", async () => {
    show(new Response("private diagnostic", { status: 404 }));
    expect(await screen.findByRole("heading", { name: "Página não encontrada" })).toBeTruthy();
    expect(screen.queryByText(/private diagnostic/)).toBeNull();
});
test("HTTP 500 is not presented as 404", async () => {
    show(new Response("internal failure", { status: 500 }));
    expect(await screen.findByRole("heading", { name: "Não foi possível carregar esta página" })).toBeTruthy();
});
test("unknown URLs still use the wildcard page", async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: "*", element: <NotFoundPage/> }], { initialEntries: ["/missing"] })}/>);
    expect(await screen.findByRole("heading", { name: "Página não encontrada" })).toBeTruthy();
});
