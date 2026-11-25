// 生成器专用 vitest 配置（**不是**测试配置）。
//
// [WHY 要单独一份] 生成器（tests/tools/*.gen.test.ts）会直接写盘覆盖仓库产物，且没有断言。
// 它们必须能跑，但**不能**被 `npm test` 收集 —— 否则「先写盘再断言」会让漂移守卫恒绿
// （issue IKTJVR）。两份配置的分工：
//   vitest.config.ts     → `npm test`：只跑无副作用的测试，exclude tests/tools
//   vitest.gen.config.ts → `npm run manifest` / `page-spec` / `page-fixtures`：只跑生成器
//
// 用法：vitest run --config vitest.gen.config.ts [具体文件]
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".js"],
  },
  test: {
    environment: "happy-dom",
    include: ["tests/tools/*.gen.test.ts"],
    css: true,
  },
});
