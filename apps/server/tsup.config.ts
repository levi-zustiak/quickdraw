import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  platform: 'node',
  // Bundle workspace packages so the output is self-contained
  noExternal: [/^@quickdraw\//],
  clean: true,
});
