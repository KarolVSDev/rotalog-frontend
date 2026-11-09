import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { BrandLogo } from "./BrandLogo";

afterEach(cleanup);

test("renders the official RotaLog symbol and wordmark as one accessible brand", () => {
    render(<BrandLogo size="large" />);

    expect(screen.getByRole("img", { name: "RotaLog" })).toBeTruthy();
    const images = screen.getByRole("img", { name: "RotaLog" }).querySelectorAll("img");
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute("src")).toBe("/images/brand/rotalog-mark.png");
    expect(images[1].getAttribute("src")).toBe("/images/brand/rotalog-wordmark.png");
    expect(images[0].getAttribute("alt")).toBe("");
    expect(images[1].getAttribute("alt")).toBe("");
});
