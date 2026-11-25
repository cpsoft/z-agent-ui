// 构建戳：把「这份 dist 是哪个提交构建的」写进产物（issue IKXE7V B 方案）。
//
// [WHY 需要它] `dist/` 与 `skills/` 都是生成物、不入库，而 `pack:z-agent-ui` 只看两件事：
// 工作区干净、包名用当前 HEAD。于是「提交了源码、忘了 build」会打出
// **旧 dist + 新 sha** 的包，宿主那边依赖行、包名、`git log` 三处都说「是最新的」，
// 只有行为是旧的 —— 2026-11-23 就这样套中过一次（IKXF4A 的列名支持在包里不存在）。
//
// [WHY 写在 dist 里而不是仓库根] 它必须跟着产物走：宿主装完包可以直接读
// `node_modules/<包名>/dist/build-info.json` 验「我装的到底是哪个提交」，
// 不必靠包名猜。写在仓库根就只在开发机上有效。
//
// [WHY dirty 也记] 脏包允许用 `--force` 打（名字带 `-dirty`），但装了它的人
// 有权知道「这个包不对应任何提交」。dirty 时不写 sha 会让人误以为是干净构建。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

// 包名从 package.json 读，不在这里硬编码 —— 改项目名时不该还要记得改这一行。
const SELF = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"),
).name;

/**
 * 读出「当前仓库状态 + 时间」并写到 `<distDir>/build-info.json`。
 * @param distDir 默认 `dist`
 */
export function writeBuildInfo(distDir = "dist") {
  const run = (args) =>
    execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const sha = run(["rev-parse", "--short", "HEAD"]);
  const dirty = run(["status", "--porcelain"]) !== "";
  const info = { name: SELF, sha, dirty, builtAt: new Date().toISOString() };
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, "build-info.json"), `${JSON.stringify(info, null, 2)}\n`, "utf8");
  return info;
}

/**
 * 校验「产物是当前 HEAD 构建的」。
 *
 * 返回 `{ ok, reason }` 而不是抛异常：调用方（打包脚本 / 测试）对「为什么不行」
 * 的措辞不一样 —— 打包脚本要给出下一步该跑什么，测试要能断言拒绝的原因。
 *
 * 判据只有一条：`build-info.sha === headSha` 且不是 dirty。
 * 不比对时间戳：`git checkout` 会把文件 mtime 全刷成现在，按时间判会天天误报。
 */
export function checkBuildInfo(info, headSha) {
  if (!info) return { ok: false, reason: "missing" };
  if (info.dirty) return { ok: false, reason: "dirty" };
  if (info.sha !== headSha) return { ok: false, reason: "sha" };
  return { ok: true, reason: "" };
}
