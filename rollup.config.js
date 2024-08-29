import terser from "@rollup/plugin-terser";
import typescript from "rollup-plugin-typescript2";
import { dts } from "rollup-plugin-dts";
import commonjs from "@rollup/plugin-commonjs";
import del from "rollup-plugin-delete";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        dir: `dist/cjs`,
        format: "cjs",
        sourcemap: true,
      },
      {
        dir: `dist/esm`,
        format: "esm",
        sourcemap: true,
      },
    ],
    external: ["mixme", "toposort"],
    plugins: [
      del({ targets: "dist/*" }),
      commonjs(),
      typescript({
        tsconfig: "tsconfig.json",
        useTsconfigDeclarationDir: true,
      }),
      terser(),
    ],
  },
  {
    input: "./dist/types/index.d.ts",
    output: [{ file: "dist/types/index.d.ts" }],
    plugins: [dts(), del({ targets: "dist/types", hook: "buildEnd" })],
  },
];
