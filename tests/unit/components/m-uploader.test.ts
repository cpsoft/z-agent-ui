// Test: m-uploader —— 多选、上限截断、受控删除
// Date: 2026-11-09
//
// [背景] 上传控件有三处「静默错」：
//   ① 没写 multiple 却以为能多选（`<input>` 只接受一个，界面没有任何提示）；
//   ② 超过 max 时全收（后端只存得下 3 张，第 4 张静默丢）；
//   ③ 满员后还显示加号（点了弹不出选择框，用户以为是坏了）。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-uploader/MUploader";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-uploader") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

/** 造一个假的 FileList：组件只读 `files` / `length`。 */
function fakeFiles(n: number): FileList {
  return Array.from({ length: n }, (_, i) => ({ name: `f${i}.png`, url: "" })) as unknown as FileList;
}

/** 直接触发 shadow 里 file input 的 change（真实点击会开系统对话框，测试里做不到）。 */
async function pick(el: any, n: number): Promise<void> {
  const input = el.shadowRoot.querySelector("input[type=file]");
  Object.defineProperty(input, "files", { value: fakeFiles(n), configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
}

describe("m-uploader", () => {
  let el: any;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
  });

  it("多选模式：选中几个就上报几个，文件交给宿主（自己不落库）", async () => {
    el = mount({ max: 9, multiple: true });
    await flush();
    const hits = collect(el, "z-select");
    await pick(el, 2);
    expect(hits).toHaveLength(1);
    expect(hits[0].files).toHaveLength(2);
    // 受控：宿主没回写，列表仍是空的
    expect(el.files).toHaveLength(0);
  });

  it("单张模式（默认）一次只收一个：多选要显式声明", async () => {
    el = mount({ max: 9 });
    await flush();
    const hits = collect(el, "z-select");
    await pick(el, 3);
    expect(hits[0].files).toHaveLength(1);
  });

  it("file input 的 multiple 跟着属性走（不然浏览器只让选一个）", async () => {
    el = mount({ multiple: true });
    await flush();
    expect(el.shadowRoot.querySelector("input[type=file]").hasAttribute("multiple")).toBe(true);
  });

  it("超过剩余名额时截断到 max，不是全收", async () => {
    el = mount({ max: 3, multiple: true });
    await flush();
    el.files = [{ name: "a" }, { name: "b" }]; // 已有 2 个，只剩 1 个名额
    await flush();
    const hits = collect(el, "z-select");
    await pick(el, 5);
    expect(hits[0].files).toHaveLength(1);
  });

  it("满了不显示加号按钮（继续显示的话点了没反应）", async () => {
    el = mount({ max: 2 });
    await flush();
    el.files = [{ name: "a" }, { name: "b" }];
    await flush();
    expect(el.shadowRoot.querySelector("[data-act='add']")).toBeNull();
  });

  it("删除：发 z-remove 带下标，但列表由宿主改（受控）", async () => {
    el = mount({ max: 3 });
    await flush();
    el.files = [{ name: "a" }, { name: "b" }];
    await flush();
    const hits = collect(el, "z-remove");
    el.shadowRoot.querySelector("[data-index='1']").click();
    expect(hits).toEqual([{ index: 1 }]);
    expect(el.files, "宿主没回写时列表不变").toHaveLength(2);
  });

  it("文件名显示在缩略图上（没有 url 时退化成文件名）", async () => {
    el = mount({ max: 3 });
    await flush();
    el.files = [{ name: "小票.png" }];
    await flush();
    expect(el.shadowRoot.querySelector(".m-uploader__name").textContent).toBe("小票.png");
  });

  it("disabled 时没有加号、也没有删除按钮", async () => {
    el = mount({ max: 3, disabled: true });
    await flush();
    el.files = [{ name: "a" }];
    await flush();
    expect(el.shadowRoot.querySelector("[data-act='add']")).toBeNull();
    expect(el.shadowRoot.querySelector("[data-act='remove']")).toBeNull();
  });

  it("accept 传到 file input（相机/相册过滤靠它）", async () => {
    el = mount({ accept: "image/png" });
    await flush();
    expect(el.shadowRoot.querySelector("input[type=file]").getAttribute("accept")).toBe("image/png");
  });

  it("选完清空 input.value：否则「删掉再选同一张」不触发 change", async () => {
    el = mount({ max: 3 });
    await flush();
    const input = el.shadowRoot.querySelector("input[type=file]");
    Object.defineProperty(input, "files", { value: fakeFiles(1), configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    // [WHY 这条重要] 相册里重选同一张照片时几乎必现「点了没反应」
    expect(input.value).toBe("");
  });
});
