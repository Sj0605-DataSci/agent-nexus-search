import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#0F1729",
        background: "#FFFFFF",
        foreground: "#0F1729",
        primary: {
          DEFAULT: "#5D9CEC",
          foreground: "#F5F9FF",
        },
        secondary: {
          DEFAULT: "#F1F5F9",
          foreground: "#1E293B",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#F5F9FF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#F1F5F9",
          foreground: "#1E293B",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F1729",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F1729",
        },
        sidebar: {
          DEFAULT: "#FAFAFA",
          foreground: "#424249",
          primary: "#1A1A1F",
          "primary-foreground": "#FAFAFA",
          accent: "#F4F4F5",
          "accent-foreground": "#1A1A1F",
          border: "#E8E8EC",
          ring: "#5D9CEC",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-in forwards",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
        fadeIn: "fadeIn 0.5s ease-out forwards",
      },
    },
  },
  //   plugins: [require("tailwindcss-animate")],
} satisfies Config;
