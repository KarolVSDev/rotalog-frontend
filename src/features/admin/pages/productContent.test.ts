import { describe, expect, it } from "vitest";
import { parseProductContent } from "./productContent";

function formContent(content: string, unit: string): FormData {
    const formData = new FormData();
    formData.set("net_content", content);
    formData.set("net_content_unit", unit);
    return formData;
}

describe("parseProductContent", () => {
    it.each([
        ["g", "500", 500],
        ["ml", "750", 750],
        ["un", "12", 12],
    ])("preserva a unidade %s", (unit, content, expected) => {
        expect(parseProductContent(formContent(content, unit))).toEqual({
            net_content: expected,
            net_content_unit: unit,
        });
    });

    it.each([
        ["1", 1000],
        ["0.5", 500],
        [".5", 500],
        ["1.234", 1234],
    ])("converte %s kg para gramas", (content, expected) => {
        expect(parseProductContent(formContent(content, "kg"))).toEqual({
            net_content: expected,
            net_content_unit: "g",
        });
    });

    it.each([
        ["0", "kg"],
        ["1.2345", "kg"],
        ["2147483.648", "kg"],
        ["1.5", "g"],
        ["1", "lb"],
    ])("rejeita conteúdo %s na unidade %s", (content, unit) => {
        expect(() => parseProductContent(formContent(content, unit))).toThrow();
    });
});
