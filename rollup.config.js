export default [
  {
    input: "lib/index.js",
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
  },
];
