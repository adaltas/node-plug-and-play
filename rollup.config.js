import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { dts } from "rollup-plugin-dts";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: `dist/cjs/index.cjs`,
        format: "cjs",
        sourcemap: true,
      },
      {
        file: `dist/esm/index.js`,
        format: "esm",
        sourcemap: true,
      },
    ],
    external: ["mixme", "toposort"],
    plugins: [
      typescript({
        tsconfig: "tsconfig.src.json",
        // Prevent warning "[plugin typescript] @rollup/plugin-typescript: outputToFilesystem option is defaulting to true"
        outputToFilesystem: true,
        compilerOptions: {
          // declaration: true,
          // Ideally, declaration would be generated in "./dist/types" but we failed to do it.
          // declarationDir: "./types",
          // emitDeclarationOnly: true,
        },
      }),
      terser(),
    ],
  },
  {
    input: "./dist/types/index.d.ts",
    output: [{ file: "dist/esm/index.d.ts" }],
    plugins: [dts()],
  },
  {
    input: "./dist/types/index.d.ts",
    output: [{ file: "dist/cjs/index.d.ts" }],
    plugins: [dts()],
  },
];
