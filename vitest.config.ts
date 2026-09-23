import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const domDependentUtilityTests = [
  'src/utils/deck/deckFile.test.ts',
  'src/utils/deck/deckStorage.test.ts',
  'src/utils/deckBuilder/deckBuilderPersistence.test.ts',
  'src/utils/gameBoard/gameBoardDismissals.test.ts',
];

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**'],
    maxWorkers: '50%',
    projects: [
      {
        extends: true,
        test: {
          name: 'logic',
          environment: 'node',
          include: [
            'src/utils/**/*.test.ts',
            'src/models/**/*.test.ts',
            'src/i18n/**/*.test.ts',
          ],
          exclude: [...domDependentUtilityTests, 'node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: [
            'src/**/*.test.tsx',
            'src/components/**/*.test.ts',
            'src/hooks/**/*.test.ts',
            ...domDependentUtilityTests,
          ],
          exclude: ['node_modules/**'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**'],
    },
  },
});
