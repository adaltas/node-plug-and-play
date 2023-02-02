import dts from "rollup-plugin-dts";
import typescript from "@rollup/plugin-typescript";

export default [
	{
		input: "lib/index.ts",
		output: [
			{
				file: `dist/cjs/index.cjs`,
				format: "cjs",
			},
			{
				file: `dist/esm/index.js`,
				format: "esm",
			},
		],
		external: ["mixme", "toposort"],
		plugins: [typescript({ sourceMap: true })],
	},
	{
		// path to your declaration files root
		input: "lib/index.ts",
		output: [{ dir: "types", format: "es" }],
		plugins: [dts()],
	},
];
