import antiSlop from "ultracite/oxlint/anti-slop"
import core from "ultracite/oxlint/core"
import { selectJsPlugins } from "ultracite/oxlint/js-plugins"
import { defineConfig } from "vite-plus"

const tsdoc = selectJsPlugins(["tsdoc"])

export default defineConfig({
  fmt: { semi: false },
  lint: {
    env: core.env,
    extends: [core, antiSlop, tsdoc],
    ignorePatterns: [...(core.ignorePatterns ?? []), "demo/snow.js"],
    jsPlugins: tsdoc.jsPlugins,
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        files: ["src/snow.ts"],
        rules: {
          "no-use-before-define": "off",
          "sort-keys": "off",
          "typescript/strict-void-return": "off",
        },
      },
      {
        files: ["demo/demo.js"],
        rules: {
          "typescript/no-unsafe-assignment": "off",
          "typescript/no-unsafe-member-access": "off",
        },
      },
    ],
  },
  pack: {
    dts: { sourcemap: true },
    entry: ["src/snow.ts"],
    platform: "browser",
    sourcemap: true,
    target: "es2020",
  },
})
