import js from "@eslint/js";
import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default [
  js.configs.recommended,
  {
    ignores: ["dist/**/*", "node_modules/**/*"],
  },
  {
    files: ["**/*.rules"],
    plugins: {
      "@firebase/security-rules": firebaseRulesPlugin,
    },
    rules: {
      ...firebaseRulesPlugin.configs["flat/recommended"].rules,
    },
  },
];
