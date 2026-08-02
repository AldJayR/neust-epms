import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { normalizePath } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vitest/config";

const pdfjsDistPath = fileURLToPath(
	new URL("./node_modules/pdfjs-dist/", import.meta.url),
);
const pdfjsResourceDirectories = [
	"cmaps",
	"standard_fonts",
	"wasm",
	"iccs",
] as const;
const pdfjsCopyTargets = pdfjsResourceDirectories.map((directory) => ({
	src: normalizePath(path.resolve(pdfjsDistPath, directory, "*")),
	dest: `pdfjs/${directory}`,
	rename: { stripBase: true },
}));

const config = defineConfig({
	plugins: [
		viteStaticCopy({ targets: pdfjsCopyTargets }),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
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
