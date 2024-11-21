import globals from "globals";
import js      from "@eslint/js";
import ts      from "typescript-eslint";

export default [
  {
    ignores: [ ".yalc/*", "dist", "dist_www" ],
  },

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // js
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": "off",
      "no-undef":       "off",
    },
  },

  // ts
  ...ts.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars":  "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  {
    rules: {},
  }
];
