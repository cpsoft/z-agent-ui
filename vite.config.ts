import { defineConfig } from "vite";
import { resolve } from "path";
import { readdirSync, existsSync } from "fs";

/**
 * 组件库（L0-L2）的构建入口表。
 *
 * 只覆盖 core / primitives / theme / components / report / flow / doc / content /
 * property / app 与 react 适配层。页面引擎（page / editor / engine / platform）不在这个
 * 仓库里 —— 它们依赖本包，依赖方向是单向的。
 *
 * scanEntries / scanFiles 两个扫描器的理由见原仓库同名函数的注释：
 * 手写入口漏一个不会报错，只在消费方 import 那一刻失败。
 */
function scanEntries(baseDir: string, prefix: string): Record<string, string> {
  const abs = resolve(__dirname, baseDir);
  const entries: Record<string, string> = {};
  if (!existsSync(abs)) return entries;

  const walk = (dir: string, rel: string) => {
    for (const dirent of readdirSync(dir, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      const child = resolve(dir, dirent.name);
      const name = rel ? `${rel}/${dirent.name}` : dirent.name;
      const entry = resolve(child, "index.ts");
      if (existsSync(entry)) entries[`${prefix}/${name}`] = entry;
      else walk(child, name);
    }
  };

  walk(abs, "");
  return entries;
}

/**
 * 把目录下所有 .ts 逐个列成入口（跳过顶层 index.ts 与 .d.ts）。
 *
 * preserveModules 只保证「模块按文件输出」，不保证导出完整：rollup 会 tree-shake 掉
 * 「本包内无人 import」的导出。列成 entry 才算根，导出不再被裁。
 */
function scanFiles(baseDir: string, prefix: string): Record<string, string> {
  const abs = resolve(__dirname, baseDir);
  const entries: Record<string, string> = {};
  if (!existsSync(abs)) return entries;

  const walk = (dir: string, rel: string) => {
    for (const dirent of readdirSync(dir, { withFileTypes: true })) {
      if (dirent.isDirectory()) {
        walk(resolve(dir, dirent.name), rel ? `${rel}/${dirent.name}` : dirent.name);
        continue;
      }
      if (!dirent.name.endsWith(".ts") || dirent.name.endsWith(".d.ts")) continue;
      if (dirent.name === "index.ts" && !rel) continue;
      const base = dirent.name.slice(0, -3);
      const name = rel ? `${rel}/${base}` : base;
      entries[`${prefix}/${name}`] = resolve(dir, dirent.name);
    }
  };

  walk(abs, "");
  return entries;
}

export default defineConfig({
  build: {
    lib: {
      entry: {
        // 主入口与框架适配层
        "z-agent-ui": resolve(__dirname, "src/index.ts"),
        react: resolve(__dirname, "src/react/index.ts"),
        theme: resolve(__dirname, "src/theme/index.ts"),
        primitives: resolve(__dirname, "src/primitives/index.ts"),

        // 全部组件按目录自动成为子入口（components/<name>）
        ...scanEntries("src/components", "components"),
        ...scanEntries("src/primitives", "primitives"),
        ...scanEntries("src/report", "report"),
        ...scanEntries("src/content", "content"),
        ...scanEntries("src/property", "property"),
        ...scanEntries("src/app", "app"),

        // doc-template 三个组件共用一个目录，可分别按需引入
        "doc/manager": resolve(__dirname, "src/doc/DocTemplateManager.ts"),
        "doc/editor": resolve(__dirname, "src/doc/DocTemplateEditor.ts"),
        "doc/preview": resolve(__dirname, "src/doc/DocPreview.ts"),

        // 域根 barrel（scanEntries 不扫根自己，漏一行不报错、只在消费方解析失败）
        doc: resolve(__dirname, "src/doc/index.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
        property: resolve(__dirname, "src/property/index.ts"),
        app: resolve(__dirname, "src/app/index.ts"),
        flow: resolve(__dirname, "src/flow/index.ts"),
        report: resolve(__dirname, "src/report/index.ts"),
        "report/core": resolve(__dirname, "src/report/core/index.ts"),
        // 渲染元素逐个成入口：只要一张卡就不该拖进整个报表域
        "report/card": resolve(__dirname, "src/report/elements/index.ts"),

        // 纯 TS 模块集合：exports 的 `./core/*` 与 `./report/core/*` 承诺了「每个文件都可 import」
        ...scanFiles("src/core", "core"),
        ...scanFiles("src/report/core", "report/core"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      // marked / react 走 external：否则 preserveModules 会把 node_modules 打进 dist。
      // marked 是 optional peer（只有 import content/markdown 或 doc 子路径才需要）。
      external: ["react", "react-dom", "marked"],
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
    minify: "esbuild",
  },
  server: {
    open: "/demo/",
  },
});
