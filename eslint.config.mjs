import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

// eslint-config-next@16 ships native ESLint flat config (an array of
// Linter.Config objects), so it is spread in directly. The @eslint/eslintrc
// FlatCompat shim used pre-Next-16 (when eslint-config-next was still a
// legacy shareable config resolved via compat.extends('next/core-web-vitals'))
// is no longer needed and in fact breaks: passing a pre-built flat config
// array through FlatCompat.extends() causes ESLint's legacy config
// validator to choke on a circular reference inside the react plugin object.
export default defineConfig([
  ...nextVitals,
  {
    // eslint-plugin-react@7.37.5 (bundled by eslint-config-next@16.2.10) has
    // not yet been updated for ESLint 10: its react-version auto-detection
    // (triggered by settings.react.version === 'detect') calls the removed
    // context.getFilename() API and crashes every react/* rule that reads
    // prop usage. Pinning the version explicitly skips that code path.
    // TODO: revert to 'detect' once eslint-plugin-react ships ESLint 10
    // support (tracked upstream; no fixed release as of this writing).
    settings: {
      react: {
        version: '19.2.7',
      },
    },
  },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'anchor/**',
    'solana-ledger/**',
    'tmp/**',
    // *.config.mjs (this file, next.config.mjs, postcss.config.mjs) are
    // plain Node ESM with no JSX. eslint-config-next's "next" block routes
    // all *.mjs files through next/dist/compiled/babel/eslint-parser, whose
    // scope manager predates ESLint 10's SourceCode.finalize() and crashes
    // with "scopeManager.addGlobals is not a function". These files gain
    // nothing from Next's React-aware parser, so they are excluded rather
    // than worked around.
    '*.config.mjs',
  ]),
]);
