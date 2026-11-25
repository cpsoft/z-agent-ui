// Test: 图片卡的地址校验与填充模式。
//
// [NOTE] 这些用例守的是「什么不该被当成图片地址」。允许清单写了 3 种（http/https/站内相对），
// 其余一律拒绝 —— 包括 data:（会把报表配置撑大）与 javascript:（现在无害，加个点击放大就无害变有害）。
import { describe, expect, it } from "vitest";
import { imageFit, imagePlaceholder, isUsableImageUrl } from "../../src/report/core/report-image.js";

describe("isUsableImageUrl", () => {
  it("http / https 通过", () => {
    expect(isUsableImageUrl("http://img.corp.local/a.png")).toBe(true);
    expect(isUsableImageUrl("https://cdn.example.com/a/b.jpg?x=1")).toBe(true);
  });

  it("站内相对路径通过", () => {
    expect(isUsableImageUrl("/static/report/cover.png")).toBe(true);
  });

  it("协议相对 URL（//host）拒绝 —— 它会指向外部主机", () => {
    expect(isUsableImageUrl("//evil.example.com/x.png")).toBe(false);
  });

  it("javascript: / data: / file: 拒绝", () => {
    expect(isUsableImageUrl("javascript:alert(1)")).toBe(false);
    expect(isUsableImageUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(false);
    expect(isUsableImageUrl("file:///etc/passwd")).toBe(false);
  });

  it("空值 / 只有空白 → false", () => {
    expect(isUsableImageUrl("")).toBe(false);
    expect(isUsableImageUrl("   ")).toBe(false);
    expect(isUsableImageUrl(undefined)).toBe(false);
    expect(isUsableImageUrl(null)).toBe(false);
  });

  it("前后空白不影响判定（用户从文档里复制常带空格）", () => {
    expect(isUsableImageUrl("  https://a.com/x.png  ")).toBe(true);
  });

  it("没有协议的裸域名拒绝（浏览器会当相对路径，实际指向不存在的站内文件）", () => {
    expect(isUsableImageUrl("a.com/x.png")).toBe(false);
  });
});

describe("imageFit", () => {
  it("缺省 cover（看板里铺满裁切最好看）", () => {
    expect(imageFit(undefined)).toBe("cover");
    expect(imageFit("")).toBe("cover");
  });

  it("合法值原样返回", () => {
    expect(imageFit("contain")).toBe("contain");
    expect(imageFit("fill")).toBe("fill");
    expect(imageFit("cover")).toBe("cover");
  });

  it("非法值回落 cover", () => {
    expect(imageFit("stretch")).toBe("cover");
  });
});

describe("imagePlaceholder", () => {
  it("没配地址说「未设置」", () => {
    expect(imagePlaceholder("")).toBe("未设置图片地址");
    expect(imagePlaceholder(undefined)).toBe("未设置图片地址");
  });

  it("配了但不合法说「无效」—— 两者用户要做的事不同", () => {
    expect(imagePlaceholder("javascript:alert(1)")).toContain("无效");
    expect(imagePlaceholder("javascript:alert(1)")).not.toContain("未设置");
  });
});
