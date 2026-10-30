import antiSlop from "ultracite/oxlint/anti-slop"
import core from "ultracite/oxlint/core"
import { selectJsPlugins } from "ultracite/oxlint/js-plugins"
import { defineConfig } from "vite-plus"
import { playwright } from "vite-plus/test/browser-playwright"

const tsdoc = selectJsPlugins(["tsdoc"])

export default defineConfig({
  fmt: { semi: false },
  lint: {
    env: core.env,
    extends: [core, antiSlop, tsdoc],
    ignorePatterns: [...(core.ignorePatterns ?? []), "demo/dist/**"],
    jsPlugins: tsdoc.jsPlugins,
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        files: ["src/**/*.ts"],
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
    rules: {
      "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    },
  },
  pack: {
    // The mixin library is a devDependency; bundle it so users need nothing extra.
    deps: { alwaysBundle: ["@quentinroy/custom-element-mixins"] },
    dts: { sourcemap: true },
    entry: {
      element: "src/element.ts",
      "element/register": "src/element-register.ts",
      snow: "src/snow.ts",
    },
    platform: "browser",
    sourcemap: true,
    target: "es2020",
  },
  test: {
    projects: [
      {
        extends: true,
        test: { include: ["src/**/*.test.js"], name: "core" },
      },
      {
        extends: true,
        test: {
          browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }],
            provider: playwright(),
          },
          include: ["src/**/*.browser.test.ts"],
          name: "element",
        },
      },
    ],
  },
})
