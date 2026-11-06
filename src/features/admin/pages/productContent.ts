import type { ProductCreate } from "../../products/api/catalogRepository";

const maximumQuantity = 2_147_483_647;

export function parseProductContent(formData: FormData): Pick<ProductCreate, "net_content" | "net_content_unit"> {
    const unit = String(formData.get("net_content_unit") ?? "");
    const value = String(formData.get("net_content") ?? "").trim();

    if (unit === "kg") {
        if (!/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(value)) {
            throw new Error("Conteúdo líquido em kg: informe um valor positivo com até 3 casas decimais.");
        }
        const grams = Math.round(Number(value) * 1000);
        if (!Number.isSafeInteger(grams) || grams < 1 || grams > maximumQuantity) {
            throw new Error("Conteúdo líquido em kg: o valor convertido deve estar entre 1 g e 2.147.483.647 g.");
        }
        return { net_content: grams, net_content_unit: "g" };
    }

    if (unit !== "g" && unit !== "ml" && unit !== "un") {
        throw new Error("Unidade do conteúdo inválida.");
    }
    if (!/^\d+$/.test(value)) {
        throw new Error("Conteúdo líquido: informe um número inteiro positivo.");
    }
    const quantity = Number(value);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > maximumQuantity) {
        throw new Error("Conteúdo líquido: o valor deve estar entre 1 e 2.147.483.647.");
    }

    return { net_content: quantity, net_content_unit: unit };
}
