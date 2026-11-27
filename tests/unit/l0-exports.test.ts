// L0 对外面的契约：`src/index.ts` 导出什么，是**已经承诺出去**的东西。
//
// [为什么需要] 2026-11-14（D-L0-3）之后是三个文件一条链：
//   src/index.ts（一行转发） → core/public.ts（具名清单，对外承诺）
//   core/index.ts（内部出口，= public + 内部工具）
// 这条链上有三个地方会悄悄改变承诺：
//   1. 有人给 public.ts 加了一行导出 —— 对外面跟着变大，发版说明里没有；
//   2. 有人把 public.ts 改成 `export *`，于是 decorators 的 `kebabAttr`
//      这类内部工具也进了对外面，再也收不回来；
//   3. 有人图省事把内部工具（`cleanFloat`）加进 public.ts，让上层能 import ——
//      同样是一次没有说明的承诺扩大（正确做法是加到 core/index.ts）。
// 这个测试把「当前承诺了哪些名字」写成一份显式清单，三种改动都会让它红。
//
// [为什么只测运行时导出] 类型导出（`UpdateContext` / `SanitizeOptions` / `Tone` 等）
// 在运行时不存在，`Object.keys` 看不到它们。那部分由 `npm run type:check` 覆盖：
// 清单里任何一个类型被删掉，引用它的地方就编译不过。这里补一句说明，
// 避免有人以为「测过导出就是全测了」。
//
// [改这份清单的正确姿势] 加一个对外符号 = 同时改 public.ts 与本文件的数组，
// 并在 commit message 里说明「这是一次对外承诺的扩大」。不要顺手改。

import { describe, expect, it } from "vitest";

/**
 * 对外承诺的运行时符号。
 *
 * 2026-11-14 从改造前的 `src/index.ts` 原样抄下来（13 个）。
 * 同一次改造中，`src/index.ts` 被改成 `export * from "./core/index.js"`，
 * 这个数组就是「改造前后等价」的判据 —— 不是看 diff，是看导出面。
 */
const PROMISED = [
  "APPEARANCES",
  "BaseElement",
  "ContextConsumer",
  "ContextProvider",
  "ContextRequestEvent",
  "DEFAULT_LOCALE",
  "SIZES",
  "TONES",
  "TONE_ALIASES",
  "createContext",
  "css",
  "discover",
  "escapeAttr",
  "escapeHtml",
  "fmt",
  "getDateTimeFormat",
  "getLocale",
  "getNumberFormat",
  "governedDimension",
  "hasMessage",
  "html",
  "injectGlobalStyles",
  "onLocaleChange",
  "property",
  "registerMessages",
  "registerTagLoader",
  "resolveTagSubpath",
  "safeHtml",
  "sanitizeHtml",
  "setLocale",
  "startAutoloader",
  "t",
  "unregisterTagLoader",
  "unsafeHTML",
] as const;

/** 只在类型空间存在，运行时不可见。列在这里是为了让「承诺了什么」一眼看全。 */
const PROMISED_TYPES = [
  "UpdateContext",
  "ReactiveController",
  "ReactiveControllerHost",
  "Context",
  "ContextCallback",
  "ContextProviderOptions",
  "ContextConsumerOptions",
  "AutoloaderHandle",
  "AutoloaderOptions",
  "TagLoader",
  "SanitizeOptions",
  "Tone",
  "Appearance",
  "Size",
  "MessageKey",
  "MessageParams",
  "Messages",
  "RawHtml",
] as const;

describe("L0 对外面：导出集合", () => {
  it("src/index.ts 的运行时导出与承诺清单逐字一致", async () => {
    const mod = await import("../../src/index.js");
    const actual = Object.keys(mod).sort();

    const added = actual.filter((k) => !(PROMISED as readonly string[]).includes(k));
    const removed = (PROMISED as readonly string[]).filter((k) => !actual.includes(k));

    expect(
      added,
      `对外面多出了这些符号。它们是新的对外承诺，需要显式加进 PROMISED 并在 commit 里说明：\n` +
        added.map((k) => `  + ${k}`).join("\n"),
    ).toEqual([]);
    expect(
      removed,
      `对外面少了这些符号 —— 这是破坏性改动，宿主会 import 失败：\n` +
        removed.map((k) => `  - ${k}`).join("\n"),
    ).toEqual([]);
  });

  it("core/public.ts 与 src/index.ts 是同一份东西（门面只转发，不增删）", async () => {
    const facade = Object.keys(await import("../../src/index.js")).sort();
    const pub = Object.keys(await import("../../src/core/public.js")).sort();
    expect(pub).toEqual(facade);
  });

  it("core/index.ts（内部出口）包含对外面的全部符号", async () => {
    // 内部出口是「对外面 ⊇ 内部工具」，不是另一份清单。
    // 若这里红，说明有人往 index.ts 里删了 public 的符号 —— 组件会 import 不到 BaseElement。
    const internal = Object.keys(await import("../../src/core/index.js"));
    const missing = (PROMISED as readonly string[]).filter((k) => !internal.includes(k));
    expect(missing, `内部出口丢了对外符号：\n${missing.map((k) => "  - " + k).join("\n")}`).toEqual(
      [],
    );
  });

  it("内部工具不得漏进对外面", async () => {
    // [WHY] 这条是 D-L0-3 的判据。拆成 public.ts 的目的就是让内部工具（cleanFloat 等）
    // 有一条正规出口，同时**不进**主入口。一旦漏进去，就是一次没有发版说明的对外承诺扩大。
    const facade = Object.keys(await import("../../src/index.js"));
    const leaked = ["cleanFloat", "plainNumberText", "kebabAttr", "legacyAttrName", "metaAliases"].filter(
      (k) => facade.includes(k),
    );
    expect(
      leaked,
      `这些是 L0 内部工具，不该出现在 z-agent-ui 主入口：\n${leaked.map((k) => "  + " + k).join("\n")}`,
    ).toEqual([]);
  });

  it("承诺清单自身没有重复（重复会让上面两条比对失真）", () => {
    expect(new Set(PROMISED).size).toBe(PROMISED.length);
    expect(new Set(PROMISED_TYPES).size).toBe(PROMISED_TYPES.length);
    // 类型名不该出现在运行时清单里，否则说明有人把它写成了值
    for (const t of PROMISED_TYPES) {
      expect((PROMISED as readonly string[]).includes(t), `${t} 是类型，不该在运行时清单里`).toBe(false);
    }
  });
});
