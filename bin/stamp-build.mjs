#!/usr/bin/env node
// `npm run build` 的最后一步：把构建戳写进 dist（见 bin/build-info.mjs 的说明）。
// 单独一个入口而不是塞进 build-info.mjs，是为了让那个文件保持「纯函数、可被测试 import」。
import { writeBuildInfo } from "./build-info.mjs";

const info = writeBuildInfo();
console.log(`[build-info] dist/build-info.json → ${info.sha}${info.dirty ? "-dirty（工作区有未提交改动）" : ""}`);
