import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  discover,
  registerTagLoader,
  resolveTagSubpath,
  startAutoloader,
  unregisterTagLoader,
} from "../../../src/core/index.js";

describe("Autoloader 自动按需加载器", () => {
  afterEach(() => {
    unregisterTagLoader("z-custom-demo");
    document.body.innerHTML = "";
  });

  it("清单中全部 134 个组件标签都能解析到真实存在的 dist 产物子路径", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "registry/component-manifest.json"), "utf8"),
    ) as { components: Array<{ tag: string }> };

    expect(manifest.components.length).toBeGreaterThanOrEqual(134);
    const missing: string[] = [];
    for (const c of manifest.components) {
      const subpath = resolveTagSubpath(c.tag);
      if (!subpath || !existsSync(resolve(process.cwd(), `dist/${subpath}.js`))) {
        missing.push(`${c.tag} -> ${subpath}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("discover 扫描未注册的 z-* / m-* 标签并调用自定义 load，同标签自动去重", async () => {
    const host = document.createElement("div");
    host.innerHTML = `<z-auto-alpha></z-auto-alpha><z-auto-alpha></z-auto-alpha><m-auto-beta></m-auto-beta><span>plain</span>`;
    document.body.appendChild(host);

    const load = vi.fn().mockResolvedValue(undefined);
    await discover(host, { load });

    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledWith("z-auto-alpha", "components/auto-alpha");
    expect(load).toHaveBeenCalledWith("m-auto-beta", "components/m-auto-beta");
  });

  it("startAutoloader 监听动态插入的节点，stop() 后停止监听", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    const load = vi.fn().mockResolvedValue(undefined);
    const handle = startAutoloader({ root: host, load });

    const el1 = document.createElement("z-auto-dyn-one");
    host.appendChild(el1);
    await new Promise((r) => setTimeout(r, 0));

    expect(load).toHaveBeenCalledWith("z-auto-dyn-one", "components/auto-dyn-one");

    handle.stop();
    load.mockClear();

    const el2 = document.createElement("z-auto-dyn-two");
    host.appendChild(el2);
    await new Promise((r) => setTimeout(r, 0));
    expect(load).not.toHaveBeenCalled();
  });

  it("registerTagLoader 优先于默认子路径加载，加载报错经 onError 捕获不崩溃", async () => {
    const customFn = vi.fn().mockResolvedValue(undefined);
    registerTagLoader("z-custom-demo", customFn);

    const host = document.createElement("div");
    host.innerHTML = `<z-custom-demo></z-custom-demo><z-auto-fail></z-auto-fail>`;
    document.body.appendChild(host);

    const onError = vi.fn();
    await discover(host, {
      load: () => Promise.reject(new Error("boom")),
      onError,
    });

    expect(customFn).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBe("z-auto-fail");
  });
});
