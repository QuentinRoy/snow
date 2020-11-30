module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "eslint-plugin-tsdoc"],
  env: { browser: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "prettier/@typescript-eslint",
  ],
  rules: {
    "tsdoc/syntax": "warn",
    "prefer-const": 0,
  },
  overrides: [
    {
      files: [".*rc.js"],
      env: { node: true },
    },
  ],
}
