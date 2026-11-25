/**
 * 列展示名的唯一口径（[[plan-20261023]] §6.3「UI 显示中文列名」）。
 *
 * 优先级：别名 > 源表注释 > 物理名。
 *
 * [为什么别名优先于注释] 别名是**本系统里人手工/LLM 起的名字**，是主动表达；
 * 注释是源表带过来的、由别的团队维护的字串。两者冲突时听前者的，否则用户
 * 在字段面板改的别名会被源库注释顶掉 —— 症状是「改了名保存后还是老名字」。
 *
 * [为什么找不到别名时要回退注释] 大部分物理表的列名是 `shop_code` / `amt`
 * 这类缩写，而源库注释往往就是「门店编码」。不显示出来等于让每个人去
 * information_schema 里查一遍。
 *
 * ★ 本函数只用于**展示**。任何往规则参数/取数 SQL 里写的列名必须用
 *   `column.name`：注释是给人看的，写进 groupBy 就是「Unknown column」。
 */
export interface LabeledColumn {
  name: string;
  alias?: string;
  comment?: string;
}

/** 展示名：别名 > 注释 > 物理名。 */
export function columnLabel(c?: LabeledColumn | null): string {
  if (!c) return "";
  const alias = (c.alias ?? "").trim();
  if (alias) return alias;
  const comment = (c.comment ?? "").trim();
  if (comment) return comment;
  return c.name;
}

/**
 * 「展示名（物理名）」：只有两者不同时才带括号。
 *
 * 同名字段加括号会变成「store（store）」，在字段选择器里读起来像坏了；
 * 但下拉里只显示中文名又会让用户无法判断到底选了哪一列（两列注释可能同名），
 * 所以物理名必须跟着出现。
 */
export function columnLabelWithName(c: LabeledColumn): string {
  const label = columnLabel(c);
  return label === c.name ? label : `${label}（${c.name}）`;
}
