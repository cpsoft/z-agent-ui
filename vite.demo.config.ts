import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { readdirSync } from "fs";

/**
 * 演示站构建（静态托管用）。
 *
 * `demo/` 下每个 html 即一个入口，新增页面无需改配置 —— 递归扫描是因为
 * `demo/internal/` 里有验收页，只扫一层会**安静地少构建几页**而输出依然「成功」。
 *
 * 构建：npx vite build --config vite.demo.config.ts
 */
const __d = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const demoRoot = resolve(__d, "demo");

function scanEntries(dir: string, base = ""): [string, string][] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = resolve(dir, e.name);
    if (e.isDirectory()) return scanEntries(full, `${base}${e.name}/`);
    if (!e.name.endsWith(".html")) return [];
    return [[`${base}${e.name.replace(/\.html$/, "")}`, full]] as [string, string];
  });
}

const entries = Object.fromEntries(scanEntries(demoRoot));

export default defineConfig({
  root: demoRoot,
  base: "/",
  build: {
    outDir: resolve(__d, "docs"),
    emptyOutDir: true,
    rollupOptions: { input: entries },
  },
});
