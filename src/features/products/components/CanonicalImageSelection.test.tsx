import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { CanonicalImageSelection } from "./CanonicalImageSelection";
import type { ImageJob } from "../api/productImagesRepository";

const { prepareImageMock } = vi.hoisted(() => ({ prepareImageMock: vi.fn() }));
vi.mock("../api/productImagesRepository", () => ({ prepareImage: prepareImageMock }));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

test("selects, previews and removes images using the accessible picker", async () => {
    const file = new File(["image"], "rice-bag.png", { type: "image/png" });
    const job: ImageJob = {
        id: "image-job",
        file,
        width: 120,
        height: 80,
        sha256: "a".repeat(64),
        phase: "Selecionada",
        keys: { intent: "intent", upload: "upload", confirm: "confirm" },
    };
    prepareImageMock.mockResolvedValue(job);
    vi.stubGlobal("URL", {
        createObjectURL: vi.fn(() => "blob:preview"),
        revokeObjectURL: vi.fn(),
    });

    function Harness() {
        const [jobs, setJobs] = useState<ImageJob[]>([]);
        return <CanonicalImageSelection jobs={jobs} onChange={setJobs}/>;
    }

    render(<Harness/>);
    const picker = screen.getByLabelText("Selecionar imagens");
    expect(picker.getAttribute("accept")).toBe("image/png,image/jpeg");
    expect(picker.hasAttribute("multiple")).toBe(true);

    fireEvent.change(picker, { target: { files: [file] } });

    expect(await screen.findByRole("img", { name: "Prévia de rice-bag.png" })).toBeTruthy();
    expect(screen.getByText("1 de 5 selecionadas")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remover seleção rice-bag.png" }));
    expect(screen.queryByRole("img", { name: "Prévia de rice-bag.png" })).toBeNull();
    expect(screen.getByText("0 de 5 selecionadas")).toBeTruthy();
});
