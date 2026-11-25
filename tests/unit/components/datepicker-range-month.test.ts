// Test: z-datepicker 区间选择跨月
// Date: 2026-11-06
//
// [WHY] 用户报「日期范围控件好像无法跨月选择」。面板一次只画一个月，上/下月的补格是
// `--out`（灰字），原先点击直接 return —— 想「10-30 选到 11-03」时点灰格毫无反应。
// 另外 `_navMonth/_navYear` 用了 `_floating.panel!` 非空断言，面板已关闭时是
// `null.innerHTML` 的 TypeError。
import { describe, it, expect } from 'vitest';
import '../../../src/components/datepicker/Datepicker';

function makeRange(start = '', end = ''): any {
  const el = document.createElement('z-datepicker') as any;
  el.setAttribute('mode', 'range');
  if (start) el.setAttribute('start', start);
  if (end) el.setAttribute('end', end);
  document.body.appendChild(el);
  return el;
}

function cell(iso: string, cls: string): HTMLElement {
  const td = document.createElement('td');
  td.className = `z-datepicker__cell ${cls}`;
  td.dataset.iso = iso;
  return td;
}

function clickEvent(target: HTMLElement): any {
  return { target, preventDefault() {} };
}

describe('z-datepicker 区间：跨月', () => {
  it('10 月起点 + 11 月终点派发跨月区间', () => {
    const el = makeRange('2026-10-07', '2026-11-05');
    const seen: any[] = [];
    el.addEventListener('z-change', (e: any) => seen.push(e.detail));
    el._selectISO('2026-10-20');
    el._selectISO('2026-11-03');
    expect(seen).toEqual([{ start: '2026-10-20', end: '2026-11-03' }]);
    el.remove();
  });

  it('点下月灰格（--out）= 选中该日并翻到它的月份', () => {
    const el = makeRange('2026-10-07', '2026-11-05');
    const seen: any[] = [];
    el.addEventListener('z-change', (e: any) => seen.push(e.detail));
    el._selectISO('2026-10-20'); // 先定起点
    el._onPanelClick(clickEvent(cell('2026-11-03', 'z-datepicker__cell--out')));
    expect(seen, '灰格必须能选中（否则用户以为不能跨月）').toEqual([
      { start: '2026-10-20', end: '2026-11-03' },
    ]);
    el.remove();
  });

  it('min/max 之外的格子仍然不可选', () => {
    const el = makeRange('2026-10-07', '2026-11-05');
    el.setAttribute('min', '2026-10-01');
    el.setAttribute('max', '2026-11-05');
    const seen: any[] = [];
    el.addEventListener('z-change', (e: any) => seen.push(e.detail));
    el._selectISO('2026-10-20');
    el._onPanelClick(clickEvent(cell('2026-12-03', 'z-datepicker__cell--out')));
    expect(seen, '超上限不得被选中').toEqual([]);
    expect(el.end).toBe('');
    el.remove();
  });

  it('面板未打开时翻页不抛错（非空断言会 TypeError）', () => {
    const el = makeRange();
    expect(() => el._navMonth(1, false)).not.toThrow();
    expect(() => el._navYear(-1)).not.toThrow();
    el.remove();
  });
});
