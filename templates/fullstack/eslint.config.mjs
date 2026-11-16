import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".data/**",
      "playwright-report/**",
      "test-results/**",
      "drizzle/**",
    ],
  },
  {
    settings: {
      next: {
        rootDir: __dirname,
      },
    },
  },
];

export default eslintConfig;
