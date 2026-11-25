#!/usr/bin/env node
// 把 scripts/hooks/* 装进 .git/hooks/（issue IKTJVR）。
//
// [WHY 需要这个脚本] `.git/hooks` 不进版本库，所以「写一份钩子」本身没法共享。
// 仓里存的是模板（scripts/hooks/），安装是显式动作：npm run hooks:install。
// 不装的后果就是现状 —— 检查都在，没人跑，漂移靠人偶然发现。
//
// [WHY 只处理 pre-push] 其余钩子没写好之前不装：一个半成品的 pre-commit 会挡住所有提交，
// 人会本能地 `--no-verify` 并从此绕过一切钩子，比没有更坏。
//
// 用法：
//   node bin/install-hooks.mjs           安装/更新（内容不同才覆盖）
//   node bin/install-hooks.mjs --check   只检查是否已装且一致（退出码 1 表示没装）

import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HOOKS = ["pre-push"];
const SRC = "scripts/hooks";
const DST = ".git/hooks";
const checkOnly = process.argv.includes("--check");

// [WHY 先看自己是不是被当成依赖安装] 本脚本挂在 `prepare` 上，而 `prepare` 会**随包发布**
// 并在消费方 `npm install` 时执行 —— 那时的 cwd 是**宿主项目根**，宿主当然有 .git，
// 于是下面那段会把 z-agent-ui 的 pre-push 装进宿主的 .git/hooks：污染别人的仓、跑的是
// 本仓的检查。判据用脚本自身路径：在 node_modules 里就说明我们是被安装的依赖。
if (import.meta.url.includes("node_modules")) {
  process.exit(0);
}

if (!existsSync(".git")) {
  // [WHY 不是错误] 本脚本也挂在 `npm run prepare` 上（clone 后 npm install 就自动装好钩子）。
  // 而发布包、Docker 构建、CI 的干净拷贝里没有 .git —— 那里失败一次就会挡住 npm install，
  // 人于是把这个 prepare 删掉，钩子又回到「没人装」的状态。所以跳过并说明。
  console.log("[hooks] 当前目录没有 .git（打包/CI 环境），跳过钩子安装。");
  process.exit(0);
}
mkdirSync(DST, { recursive: true });

// 钩子正文里用 `cd "$(git rev-parse --show-toplevel)"` 定位仓库根，所以拷过去即可，
// 不需要重写路径 —— 保持模板与安装结果逐字节一致，--check 才能可靠地判「已装且一致」。
let stale = 0;
for (const name of HOOKS) {
  const src = join(SRC, name);
  const dst = join(DST, name);
  if (!existsSync(src)) {
    console.error(`[hooks] 模板缺失：${src}`);
    process.exit(1);
  }

  const want = readFileSync(src, "utf8");
  const has = existsSync(dst) ? readFileSync(dst, "utf8") : null;
  const same = has === want;

  if (same) {
    if (checkOnly) console.log(`HOOK_OK  ${dst} 已安装且一致`);
    else {
      chmodSync(dst, 0o755);
      console.log(`[hooks] ${dst} 已是最新`);
    }
    continue;
  }

  stale++;
  if (checkOnly) {
    console.error(`[hooks] ${dst} ${has === null ? "未安装" : "内容过期"} —— 跑 npm run hooks:install`);
    continue;
  }

  if (has !== null && !has.includes("scripts/hooks")) {
    // 别人的自定义钩子：不覆盖，只提示（覆盖会静默删掉别人的逻辑）
    console.error(`[hooks] ${dst} 已存在且不是本仓模板生成的，跳过。请手工合并 ${src}。`);
    continue;
  }

  writeFileSync(dst, want);
  chmodSync(dst, 0o755);
  console.log(`[hooks] 安装 ${dst}`);
}

if (checkOnly && stale) process.exit(1);
