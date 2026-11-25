import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".js"],
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    // [WHY 排除 tests/tools] 那里放的是**生成器**（manifest / page-spec / page-fixtures），
    // 它们直接 fs.writeFileSync 覆盖仓库里的产物、没有任何断言。挂进 `npm test` 有两个后果：
    //   1. 每次跑测试都把工作区弄脏，人于是养成 `git checkout registry/` 的习惯；
    //   2. 更致命的是**掩盖漂移**：生成器先跑（写盘）→ 守卫后跑（读刚写过的文件）→ 恒绿。
    //      源码改了却没重新生成，本该红的那条从此永远绿（issue IKTJVR）。
    // 生成器改用 `npm run manifest` / `manifest:check`（见 vitest.gen.config.ts）。
    exclude: ["**/node_modules/**", "**/dist/**", "tests/tools/**"],
    css: true,
  },
});
