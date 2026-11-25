// Test: 打包前的「产物是不是当前提交构建的」校验（issue IKXE7V B 方案）
// Related: [[IKXE7V]]（包名带新 sha、dist 是旧的）/ [[IKXF4A]]（就这样套中过一次）
// Wiki: wiki/planning/20261123-build-info-stamp-issue.md
// Date: 2026-11-23
//
// [WHY 只测判定函数、不测整条打包链] `pack-z-agent-ui` 会 `npm pack`（十几秒）且要求
// 工作区干净 —— 在单测里跑它，红的时候分不清「判据错了」还是「这台机器树是脏的」。
// 所以这里钉**判定**（四种结局各一条），整条链用实测取证（见 issue 回填）：
// 把 dist/build-info.json 改成上一个 sha，跑打包，它必须拒。
//
// 判据：四种结局都要有，因为「能拒」与「不误拒」是两个方向 —— 只测拒的一侧时，
// 把判定写成「永远不 ok」也全绿。
import { describe, expect, it } from "vitest";
// @ts-expect-error bin/ 是 .mjs，没有类型声明
import { checkBuildInfo } from "../../bin/build-info.mjs";

const HEAD = "abc1234";

describe("产物构建戳的判定", () => {
  it("sha 一致且不脏 ⇒ 通过", () => {
    expect(checkBuildInfo({ sha: HEAD, dirty: false }, HEAD)).toEqual({ ok: true, reason: "" });
  });

  it("没有戳 ⇒ missing（旧构建产物、或忘了 build）", () => {
    expect(checkBuildInfo(null, HEAD)).toEqual({ ok: false, reason: "missing" });
  });

  it("构建时有未提交改动 ⇒ dirty（这份 dist 不对应任何提交）", () => {
    expect(checkBuildInfo({ sha: HEAD, dirty: true }, HEAD).reason).toBe("dirty");
  });

  it("sha 不一致 ⇒ sha（典型的「提交了源码、忘了 build」）", () => {
    expect(checkBuildInfo({ sha: "0000000", dirty: false }, HEAD).reason).toBe("sha");
  });
});
