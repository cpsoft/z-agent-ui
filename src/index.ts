// 包对外面（`z-agent-ui` 主入口）。
//
// [WHY 只有一行、且指向 public.ts 而不是 core/index.ts] 2026-11-14（D-L0-3）：
// 此前它转发 `core/index.ts`，而那个文件同时是「L0 内部出口」。两者共用一份清单的
// 结果是**内部工具与对外承诺绑死** —— 想给 `cleanFloat` 一条正规路径，就得把它
// 加进对外面。现在对外承诺单独成文件（`core/public.ts`），内部出口（`core/index.ts`）
// 可以自由增删；主入口只认前者。
//
// [契约] 本文件导出集合与改造前逐字相同（13 值 + 5 类型），由
// `tests/unit/l0-exports.test.ts` 钉住；同一测试还反向确认「内部符号没漏进来」。
export * from "./core/public.js";
