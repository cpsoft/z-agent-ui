// Test: m-uploader 的拍摄入口（capture）与本地压缩（max-edge）
// Related: [[req-20261120-h5-photo]]（2026-11-20）
// Wiki: wiki/log.md（2026-11-20 指标卡等高同一波）
// Date: 2026-11-20
//
// [WHY 这条要单独存在] 「点拍照却打开相册」和「照片传上去变成空的」都不报错：
//   ① `capture` 属性写错（写成 `camera` 之类）时浏览器**安静忽略**，路口退回系统选择单；
//   ② 相机 input 上带了 `multiple`，安卓某些浏览器会退化成相册多选；
//   ③ 压缩路径抛错时若直接丢掉文件，事件里 `files` 是空数组，宿主看到的是「用户没选」。
// 三者的共同形态是「界面正常、结果不对」，只能靠读事件 payload 断言。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-uploader/MUploader";
import { fitWithin, jpegName } from "../../../src/components/m-uploader/photo-compress";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}, attrs: Record<string, string> = {}): any {
  const el = document.createElement("m-uploader") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

function fakePhotos(n: number): File[] {
  return Array.from({ length: n }, (_, i) => new File([`x${i}`.repeat(10)], `p${i}.jpg`, { type: "image/jpeg" }));
}

/** 直接触发 shadow 里某个入口的 change（真实点击会开系统相机/相册，测试里做不到）。 */
async function pick(el: any, source: "camera" | "album", files: File[]): Promise<void> {
  const input = el.shadowRoot.querySelector(`input[data-src="${source}"]`) as HTMLInputElement;
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
}

describe("m-uploader 拍摄入口", () => {
  let el: any;
  const origCreate = URL.createObjectURL;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
    URL.createObjectURL = origCreate;
  });

  it("布尔写法 `<m-uploader capture>`：出拍照 + 相册两个入口，相机 input 朝后", async () => {
    el = mount({}, { capture: "" });
    await flush();
    expect(el.shadowRoot.querySelector("[data-act='shot']")).not.toBeNull();
    expect(el.shadowRoot.querySelector("[data-act='album']")).not.toBeNull();
    const cam = el.shadowRoot.querySelector("input[data-src='camera']");
    expect(cam.getAttribute("capture")).toBe("environment");
  });

  it("capture=user 走前置相机", async () => {
    el = mount({ capture: "user" });
    await flush();
    expect(el.shadowRoot.querySelector("input[data-src='camera']").getAttribute("capture")).toBe("user");
  });

  it("capture 关着时只有一个入口，且 input 不带 capture（老形态不变）", async () => {
    el = mount();
    await flush();
    expect(el.shadowRoot.querySelector("[data-act='add']")).not.toBeNull();
    expect(el.shadowRoot.querySelector("[data-act='shot']")).toBeNull();
    expect(el.shadowRoot.querySelector("input[data-src='camera']")).toBeNull();
    expect(el.shadowRoot.querySelector("input[type=file]").hasAttribute("capture")).toBe(false);
  });

  it("相机 input 永不带 multiple：多选会让安卓退化成相册", async () => {
    el = mount({ capture: "environment", multiple: true });
    await flush();
    expect(el.shadowRoot.querySelector("input[data-src='camera']").hasAttribute("multiple")).toBe(false);
    expect(el.shadowRoot.querySelector("input[data-src='album']").hasAttribute("multiple")).toBe(true);
  });

  it("一次只能拍一张：即使 multiple 打开，相机入口也只收第一个", async () => {
    el = mount({ capture: "environment", multiple: true });
    await flush();
    const hits = collect(el, "z-select");
    await pick(el, "camera", fakePhotos(2));
    expect(hits[0].files).toHaveLength(1);
    expect(hits[0].source).toBe("camera");
  });

  it("相册入口按 multiple 收，并标明来源", async () => {
    el = mount({ capture: "environment", multiple: true });
    await flush();
    const hits = collect(el, "z-select");
    await pick(el, "album", fakePhotos(2));
    expect(hits[0].files).toHaveLength(2);
    expect(hits[0].source).toBe("album");
  });

  it("max-edge=0（缺省）不碰文件：上报的就是同一个 File", async () => {
    el = mount({ capture: "environment" });
    await flush();
    const hits = collect(el, "z-select");
    const photos = fakePhotos(1);
    await pick(el, "camera", photos);
    expect(hits[0].files[0]).toBe(photos[0]);
  });

  it("压缩失败时**原样上报**：宁可慢，也不能让这次选择白做", async () => {
    URL.createObjectURL = () => {
      throw new Error("no blob support");
    };
    el = mount({ capture: "environment", maxEdge: 1600 });
    await flush();
    const hits = collect(el, "z-select");
    const photos = fakePhotos(1);
    await pick(el, "camera", photos);
    expect(hits).toHaveLength(1);
    expect(hits[0].files[0]).toBe(photos[0]);
  });
});

describe("照片压缩的纯函数", () => {
  it("长边超限才缩，宽高比不变", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1200, 4000, 1600)).toEqual({ width: 480, height: 1600 });
  });

  it("本来就不超限时返回 null（调用方据此跳过重编码，保住原图画质）", () => {
    expect(fitWithin(800, 600, 1600)).toBeNull();
    expect(fitWithin(1600, 1600, 1600)).toBeNull();
    expect(fitWithin(4000, 3000, 0)).toBeNull();
  });

  it("文件名跟着 MIME 换成 .jpg：名字与类型不一致会被按扩展名校验的后端拒收", () => {
    expect(jpegName("IMG_0042.HEIC")).toBe("IMG_0042.jpg");
    expect(jpegName("photo")).toBe("photo.jpg");
    expect(jpegName("a.b.c.png")).toBe("a.b.c.jpg");
  });
});
