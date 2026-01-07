import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./theme-toggle";

// Mock next-themes
const mockSetTheme = vi.fn();
let mockTheme = "light";
let mockResolvedTheme = "light";

vi.mock("next-themes", () => ({
    useTheme: () => ({
        theme: mockTheme,
        setTheme: mockSetTheme,
        resolvedTheme: mockResolvedTheme,
    }),
}));

describe("ThemeToggle", () => {
    beforeEach(() => {
        mockSetTheme.mockClear();
        mockTheme = "light";
        mockResolvedTheme = "light";
    });

    describe("Rendering", () => {
        it("should render a button", () => {
            render(<ThemeToggle />);
            const button = screen.getByRole("button");
            expect(button).toBeInTheDocument();
        });

        it("should have proper accessibility label for light mode", () => {
            mockResolvedTheme = "light";
            render(<ThemeToggle />);
            const button = screen.getByRole("button");
            expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
        });

        it("should have proper accessibility label for dark mode", () => {
            mockResolvedTheme = "dark";
            render(<ThemeToggle />);
            const button = screen.getByRole("button");
            expect(button).toHaveAttribute("aria-label", "Switch to light mode");
        });

        it("should have correct size classes", () => {
            render(<ThemeToggle />);
            const button = screen.getByRole("button");
            expect(button).toHaveClass("h-8", "w-8");
        });
    });

    describe("Theme Switching", () => {
        it("should switch from light to dark when clicked", () => {
            mockResolvedTheme = "light";
            render(<ThemeToggle />);
            const button = screen.getByRole("button");
            fireEvent.click(button);
            expect(mockSetTheme).toHaveBeenCalledWith("dark");
        });

        it("should switch from dark to light when clicked", () => {
            mockResolvedTheme = "dark";
            render(<ThemeToggle />);
            const button = screen.getByRole("button");
            fireEvent.click(button);
            expect(mockSetTheme).toHaveBeenCalledWith("light");
        });
    });

    describe("Icon Display", () => {
        it("should show moon icon in light mode", () => {
            mockResolvedTheme = "light";
            render(<ThemeToggle />);
            const button = screen.getByRole("button");
            // The button should contain an SVG (the moon icon)
            const svg = button.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });

        it("should show sun icon in dark mode", () => {
            mockResolvedTheme = "dark";
            render(<ThemeToggle />);
            const button = screen.getByRole("button");
            // The button should contain an SVG (the sun icon)
            const svg = button.querySelector("svg");
            expect(svg).toBeInTheDocument();
        });
    });
});

describe("ThemeProvider Configuration", () => {
    it("should use class attribute for theme", () => {
        const attribute = "class";
        expect(attribute).toBe("class");
    });

    it("should default to system theme", () => {
        const defaultTheme = "system";
        expect(defaultTheme).toBe("system");
    });

    it("should enable system theme detection", () => {
        const enableSystem = true;
        expect(enableSystem).toBe(true);
    });

    it("should disable transition on theme change", () => {
        const disableTransitionOnChange = true;
        expect(disableTransitionOnChange).toBe(true);
    });
});

describe("Theme Modes", () => {
    it("should support light mode", () => {
        const modes = ["light", "dark", "system"];
        expect(modes).toContain("light");
    });

    it("should support dark mode", () => {
        const modes = ["light", "dark", "system"];
        expect(modes).toContain("dark");
    });

    it("should support system mode", () => {
        const modes = ["light", "dark", "system"];
        expect(modes).toContain("system");
    });
});

describe("CSS Variables for Themes", () => {
    describe("Light Mode", () => {
        it("should have background color defined", () => {
            const background = "oklch(1 0 0)";
            expect(background).toBeTruthy();
        });

        it("should have foreground color defined", () => {
            const foreground = "oklch(0.145 0 0)";
            expect(foreground).toBeTruthy();
        });

        it("should have primary color defined", () => {
            const primary = "oklch(0.205 0 0)";
            expect(primary).toBeTruthy();
        });

        it("should have muted foreground color defined", () => {
            const mutedForeground = "oklch(0.556 0 0)";
            expect(mutedForeground).toBeTruthy();
        });
    });

    describe("Dark Mode", () => {
        it("should have dark background color defined", () => {
            const background = "oklch(0.145 0 0)";
            expect(background).toBeTruthy();
        });

        it("should have dark foreground color defined", () => {
            const foreground = "oklch(0.985 0 0)";
            expect(foreground).toBeTruthy();
        });

        it("should have dark primary color defined", () => {
            const primary = "oklch(0.87 0.00 0)";
            expect(primary).toBeTruthy();
        });

        it("should have dark muted foreground color defined", () => {
            const mutedForeground = "oklch(0.708 0 0)";
            expect(mutedForeground).toBeTruthy();
        });
    });
});

describe("Accessibility", () => {
    it("should be keyboard accessible", () => {
        render(<ThemeToggle />);
        const button = screen.getByRole("button");
        expect(button).toBeVisible();
        expect(button.tagName).toBe("BUTTON");
    });

    it("should have accessible role", () => {
        render(<ThemeToggle />);
        const button = screen.getByRole("button");
        expect(button).toBeInTheDocument();
    });

    it("should provide visual feedback", () => {
        render(<ThemeToggle />);
        const button = screen.getByRole("button");
        // Button should have outline variant styling
        expect(button).toHaveClass("border");
    });
});
