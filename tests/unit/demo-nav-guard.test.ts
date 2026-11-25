// Test: demo 导航数据源守卫 —— `demo/nav.ts` 与代码结构 / 清单 / 磁盘三方一致
//
// [WHY 需要这条守卫] demo 站的问题是「两份事实」：侧栏在 shell.ts，首页目录在 index.html，
// 谁也不管谁。合并成 nav.ts 之后，新的风险是**它自己腐化**：清单加了组件、src 加了域目录、
// 页面删了，而 nav.ts 还是上个月的样子 —— 这种漂移不会报错，只会让人在 demo 里找不到东西。
//
// 六类判据：
//   ① 8 个家族的成员并集 == 清单 `layer=base`，且每个恰好一次（缺失 / 重复分开报）
//   ② 家族成员必须真实存在于清单（防 tag 拼错 —— 拼错会安静地少覆盖一个组件）
//   ③ 层栈自下而上，且 3 个 dirs 覆盖 src 一级目录（`react` 是适配器，不属层栈）
//   ④ 页 id / file 唯一；`live` 的文件必须存在
//   ⑤ `planned` 的文件不许已经存在（建好了不翻 status，导航就成了假的）
//   ⑥ 旧分类页仍在磁盘上就必须登记在 LEGACY_PAGES，登记了就必须真的还在（名单双向）
//
// 判据 ⑤ 是这里唯一的「未来时」判据：它把「建了页忘接线」变成红，而不是靠人记得。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LAYER_STACK, FAMILIES, PAGES, LEGACY_PAGES, MERGING, FRAMED_DEMOS } from "../../demo/nav";

const MANIFEST = "registry/component-manifest.json";
const SRC = "src";
const DEMO = "demo";

interface Comp {
  tag: string;
  layer: string;
}

const manifest: { components: Comp[] } = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const baseTags = manifest.components.filter((c) => c.layer === "base").map((c) => c.tag);
const allTags = new Set(manifest.components.map((c) => c.tag));

function exists(rel: string): boolean {
  return fs.existsSync(path.join(DEMO, rel));
}

describe("demo 导航：nav.ts 是唯一事实", () => {
  it("① 8 个家族并集 == 清单 layer=base（且每个恰好一次）", () => {
    const seen = new Map<string, string[]>();
    for (const f of FAMILIES) {
      for (const tag of f.members) {
        seen.set(tag, [...(seen.get(tag) ?? []), f.title]);
      }
    }
    const duplicated = [...seen.entries()]
      .filter(([, owners]) => owners.length > 1)
      .map(([tag, owners]) => `${tag} 出现在 ${owners.join(" / ")}`);
    const missing = baseTags.filter((t) => !seen.has(t));
    const extra = [...seen.keys()].filter((t) => !baseTags.includes(t));

    expect(
      duplicated,
      `同一个组件只能属于一个家族（重复比缺失更难发现：两处都写一半，页面上哪边都不全）`,
    ).toEqual([]);
    expect(missing, `清单里 layer=base 但这 ${missing.length} 个不在任何家族：`).toEqual([]);
    expect(extra, `家族里有清单中不属于 base 的 tag：`).toEqual([]);
  });

  it("② 家族成员都存在于清单（拼错的 tag 会安静地少覆盖一个组件）", () => {
    const ghosts = FAMILIES.flatMap((f) =>
      f.members.filter((t) => !allTags.has(t)).map((t) => `${f.title}: ${t}`),
    );
    expect(ghosts, `这些 tag 在清单里不存在：`).toEqual([]);
  });

  it("③ 层栈自下而上，dirs 覆盖 src 一级目录（react 是适配器，不属层栈）", () => {
    // 三层自下而上。L3 页面引擎 / L4 驱动 / L5 平台**不在这个仓库** ——
    // 它们依赖本包的组件，是另一个仓库，所以这里也谈不上给它们画分层图。
    // 这条列表故意写死：新增一层必须同时改这里，不能靠 `LAYER_STACK` 自己证明自己。
    expect(LAYER_STACK.map((l) => l.id)).toEqual(["foundation", "base", "composite"]);

    const declared = LAYER_STACK.flatMap((l) => l.dirs);
    const onDisk = fs
      .readdirSync(SRC, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((d) => d !== "react");

    expect([...declared].sort(), `nav.ts 声明的目录与 src 一级目录不一致`).toEqual([...onDisk].sort());
    // 每个目录都得真的在（拼错目录名同样会静默失效）
    const gone = declared.filter((d) => !fs.existsSync(path.join(SRC, d)));
    expect(gone, `nav.ts 里的目录在 src 下不存在：`).toEqual([]);
  });

  it("④ 页 id / file 唯一，live 的文件真实存在", () => {
    const dupIds = PAGES.map((p) => p.id).filter((id, i, a) => a.indexOf(id) !== i);
    const dupFiles = PAGES.map((p) => p.file).filter((f, i, a) => a.indexOf(f) !== i);
    expect(dupIds, `页 id 重复：`).toEqual([]);
    expect(dupFiles, `页文件重复（两个 id 指同一文件必然有一个是错的）：`).toEqual([]);

    const missing = PAGES.filter((p) => p.status === "live" && !exists(p.file)).map(
      (p) => `${p.file}（id=${p.id}）`,
    );
    expect(missing, `标成 live 但文件不存在：`).toEqual([]);
  });

  it("⑤ planned 的文件不许已经存在（建好了不翻 status，导航就是假的）", () => {
    const stale = PAGES.filter((p) => p.status === "planned" && exists(p.file)).map(
      (p) => `${p.file} 已存在，把 status 改成 "live" 并接进侧栏`,
    );
    expect(stale, `这些页已经建好了却还标着 planned：`).toEqual([]);
  });

  it("⑥ 磁盘上每个 html 都必须在 PAGES / LEGACY_PAGES / MERGING / FRAMED 四者之一", () => {
    const lost = LEGACY_PAGES.filter((f) => !exists(f));
    const untracked = fs
      .readdirSync(DEMO)
      .filter((f) => f.endsWith(".html"))
      .filter(
        (f) =>
          !PAGES.some((p) => p.file === f) &&
          !LEGACY_PAGES.includes(f) &&
          !MERGING.some((m) => m.file === f) &&
          !FRAMED_DEMOS.some((d) => d.file === f),
      );

    expect(lost, `LEGACY_PAGES 里登记了但磁盘上没有（删完了就从名单里去掉）：`).toEqual([]);
    // [WHY 这条是整条守卫的主判据] 现状「6 个页面不在导航里」正是从这种缝隙里长出来的：
    // 既不在新架构、也不在待删名单 = 谁都不管。往后再加页面，必须先在这里落户。
    expect(
      untracked,
      `demo/ 下这些页面不在 PAGES / LEGACY / MERGING / FRAMED 任何一个名单里 —— 「谁也不知道该不该留」的那批：`,
    ).toEqual([]);
  });

  it("⑦ 搬迁计划的去向必须是真的页；搬完的行要删掉", () => {
    const ids = new Set(PAGES.map((p) => p.id));
    const badTarget = MERGING.filter((m) => !ids.has(m.into)).map((m) => `${m.file} → ${m.into}`);
    const gone = MERGING.filter((m) => !exists(m.file)).map((m) => `${m.file}（搬完了，删这一行）`);

    expect(badTarget, `MERGING.into 指向不存在的 PageDef.id：`).toEqual([]);
    expect(gone, `MERGING 里登记的文件已不存在：`).toEqual([]);
  });
  it("⑧ 画框清单：源文件必须存在、framedBy 必须是真的页、不许与待删名单重叠", () => {
    const ids = new Set(PAGES.map((p) => p.id));
    const ghosts = FRAMED_DEMOS.filter((d) => !exists(d.file)).map((d) => d.file);
    const badHost = FRAMED_DEMOS.filter((d) => !ids.has(d.framedBy)).map((d) => `${d.file} → ${d.framedBy}`);
    const both = FRAMED_DEMOS.filter(
      (d) => LEGACY_PAGES.includes(d.file) || MERGING.some((m) => m.file === d.file),
    ).map((d) => d.file);

    expect(ghosts, `画框指向的文件不存在：`).toEqual([]);
    expect(badHost, `framedBy 不是 PAGES 里的 id：`).toEqual([]);
    // [WHY 这条] 「既要删、又要嵌」是自相矛盾的两种状态 —— 结局只会是某天删了文件、
    // 文档页上留一个空白画框，而构建不报错。
    expect(both, `同时被列为「待删」和「画框」，先决定留还是删：`).toEqual([]);
  });
  it("⑨ 家族的 section 锚点必须真的存在于它指向的那一页", () => {
    // [WHY] 家族对象里存了 `section: "ex-form"`，详情页的「看示例」直接用它拼链接。
    // 锚点写错不会报错 —— 链接会跳到页面顶部，看起来像「示例还没做」。
    const problems: string[] = [];
    for (const f of FAMILIES) {
      const file = path.join(DEMO, f.page);
      if (!fs.existsSync(file)) {
        problems.push(`${f.id}: page 不存在 ${f.page}`);
        continue;
      }
      const html = fs.readFileSync(file, "utf8");
      if (!html.includes(`id="${f.section}"`)) {
        problems.push(`${f.id}: ${f.page} 里没有 id="${f.section}"`);
      }
    }
    expect(problems, "家族的示例锚点对不上页面：").toEqual([]);
  });

});
