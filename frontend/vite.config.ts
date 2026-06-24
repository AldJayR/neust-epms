import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const config = defineConfig({
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackStart(),
		viteReact({
			// @ts-expect-error - 'babel' property from earlier vite-react-plugin versions
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
	],
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		environment: "jsdom",
		globals: true,
	},
});

export default config;
