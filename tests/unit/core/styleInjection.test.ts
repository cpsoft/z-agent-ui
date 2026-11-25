// Test: injectGlobalStyles（light DOM 全局样式的幂等注入）
//
// [为什么补这份] 它在包的对外面里（`injectGlobalStyles` 是承诺的 13 个运行时符号之一，
// 见 tests/unit/l0-exports.test.ts），却零直接单测。它被 10 个浮层组件当作
// 「往 head 塞一份样式」的统一入口，幂等一旦失效，症状是同一条 CSS 被塞进页面十份 ——
// 不会报错、不会变丑，只是每多开一个浮层就多一份（在长会话里慢慢堆）。
//
// [为什么只测到「幂等开关」这一层] 已插入的 <style> 不归它管（不摘除），
// 所以断言只到「同一 id 只插一次」。

import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetInjectedStylesForTest,
  injectGlobalStyles,
} from "../../../src/core/styleInjection";

const stylesFor = (id: string) => document.head.querySelectorAll(`style[data-z-style="${id}"]`);

beforeEach(() => {
  __resetInjectedStylesForTest();
  document.head.innerHTML = "";
});

describe("injectGlobalStyles", () => {
  it("写入 head，并带上 data-z-style 便于 DevTools 定位", () => {
    injectGlobalStyles("t-a", ".a{color:red}");

    const list = stylesFor("t-a");
    expect(list.length).toBe(1);
    expect(list[0].textContent).toBe(".a{color:red}");
  });

  it("同一 id 重复调用只插一份（幂等）", () => {
    injectGlobalStyles("t-a", ".a{color:red}");
    injectGlobalStyles("t-a", ".a{color:blue}");

    const list = stylesFor("t-a");
    expect(list.length).toBe(1);
    // 第二次的文本被忽略：这是「首次为准」的既有语义，不是合并
    expect(list[0].textContent).toBe(".a{color:red}");
  });

  it("不同 id 各插一份", () => {
    injectGlobalStyles("t-a", ".a{}");
    injectGlobalStyles("t-b", ".b{}");

    expect(stylesFor("t-a").length).toBe(1);
    expect(stylesFor("t-b").length).toBe(1);
  });

  it("测试钩子清空记录后允许再次注入（它只清开关，不摘已插入的 style）", () => {
    injectGlobalStyles("t-a", ".a{}");
    __resetInjectedStylesForTest();
    injectGlobalStyles("t-a", ".a{}");

    // 已知副作用：老节点留着 ⇒ head 里出现两份同 id 的 style。
    // 这只发生在测试钩子被调用的场合，生产路径没有「清空记录」的入口。
    expect(stylesFor("t-a").length).toBe(2);
  });
});
