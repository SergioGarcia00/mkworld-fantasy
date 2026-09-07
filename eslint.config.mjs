import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
export default defineConfig([
  ...next,
  ...ts,
  globalIgnores([
    '.agents/**',
    '.next/**',
    'node_modules/**',
    'exportar_atlas_league_s3.js',
    'next-env.d.ts',
  ]),
]);
