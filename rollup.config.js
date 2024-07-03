import typescript from 'rollup-plugin-typescript2';
import del from 'rollup-plugin-delete';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

const bundle = (config) => ({
  ...config,
  input: 'lib/index.ts',
});

export default [
  bundle({
    external: ['mixme', 'toposort'],
    output: [
      {
        file: `dist/cjs/index.cjs`,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: `dist/esm/index.js`,
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      resolve(),
      del({ targets: './dist/*' }),
      typescript({
        tsconfig: 'tsconfig.build.json',
        useTsconfigDeclarationDir: true,
      }),
      terser(),
    ],
  }),
];
