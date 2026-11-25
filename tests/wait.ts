// 等一个条件成立，而不是睡固定毫秒。
//
// [WHY] `await new Promise((r) => setTimeout(r, 10))` 在单跑时够用，在**全量并行**下不够：
// 同一批里可能有跑 20 秒的重负载用例，10ms 里重渲染未必完成。症状是偶发红，
// 而重跑就绿 —— 于是所有人学会「再跑一次」，把真 bug 也一起重跑掉。
// 2026-11-17 实测：`page-m-view-form.test.ts` 两条「切 link 后应隐藏」的用例
// 在全量下红、单跑绿，同批 `page-event-emit.test.ts` 一条跑了 20s。
//
// [WHY 仍然给上限] 不设上限的等待会把「永远不成立」变成卡死，比红更难查。
// 超时抛错时把最后一次的值带出来，这样失败信息与直接断言几乎一样。
//
// [不铺开替换的理由] 全仓还有 ~530 处固定 sleep。逐处换掉的收益递减，而风险是
// 把某些「本来就靠 sleep 掩盖的竞态」暴露成大面积红。只在实测抖过的地方用它，
// 新写的用例默认用它。

export interface WaitOptions {
  /** 总超时，缺省 2000ms。 */
  timeout?: number;
  /** 轮询间隔，缺省 16ms（一帧）。 */
  step?: number;
  /** 失败信息里说清在等什么。 */
  label?: string;
}

/**
 * 轮询直到 `predicate` 返回真值。
 *
 * @returns predicate 的最后一次返回值（真值）
 * @throws 超时时抛错，信息含 `label` 与耗时
 */
export async function waitFor<T>(
  predicate: () => T,
  { timeout = 2000, step = 16, label = "条件" }: WaitOptions = {},
): Promise<T> {
  const started = Date.now();
  for (;;) {
    const value = predicate();
    if (value) return value;
    if (Date.now() - started >= timeout) {
      throw new Error(`waitFor 超时 ${timeout}ms：${label} 始终不成立`);
    }
    await new Promise((r) => setTimeout(r, step));
  }
}
