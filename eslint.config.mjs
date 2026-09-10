import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This rule (shipped for React Compiler adoption) flags the standard
      // "reset/fetch on dependency change" data-fetching effect as an error,
      // including the SSR-safe `useEffect(() => setMounted(true), [])` mount
      // guard used by our portal-based Modal. Those patterns are correct and
      // widely used in the App Router; keep the signal as a warning rather
      // than a build-blocking error.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
