import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
  {
    external: ['mixme', 'toposort'],
    input: 'lib/index.ts',
    output: [
      {
        file: `dist/cjs/index.cjs`,
        format: 'cjs',
      },
      {
        file: `dist/esm/index.js`,
        format: 'esm',
      },
    ],
    plugins: [typescript({ sourceMap: true })],
  },
  {
    // path to your declaration files root
    input: 'lib/index.ts',
    output: [{ dir: 'dist', format: 'es' }],
    plugins: [dts()],
  },
];
