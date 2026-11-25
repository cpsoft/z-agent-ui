// 图片卡（M6）：地址校验与填充模式。
//
// [为什么地址要过一层校验] 报表配置会被整份塞进列表接口返回给所有读者。
// 一张 data:image/png;base64 的图随便几十 KB，列表响应就从几 KB 变成几百 KB，
// 而列表只是要画个目录树。javascript: 这类协议放进 <img src> 当前不会执行，
// 但只要以后有人加「点击放大」，它就是一条现成的注入路径 —— 现在挡住，比那时再补便宜。
//
// [为什么允许 http 不带 s] 内网报表系统常见 http 图片服务。这里不是传输安全边界，
// 是「别把奇怪协议当图片地址」的边界。

/** 图片地址是否可用。true 才渲染 <img>，false 显示占位框。 */
export function isUsableImageUrl(raw: string | undefined | null): boolean {
  const s = (raw ?? "").trim();
  if (!s) return false;
  // 站内相对路径：以 / 开头但**不能**是 //（协议相对 URL 会指向外部主机）
  if (s.startsWith("//")) return false;
  if (s.startsWith("/")) return true;
  return /^https?:\/\/[^\s]+$/i.test(s);
}

/** 填充模式 → object-fit 值。缺省 cover（铺满裁切，看板里最好看）。 */
export function imageFit(raw: string | undefined | null): "cover" | "contain" | "fill" {
  return raw === "contain" || raw === "fill" ? raw : "cover";
}

/** 占位提示文案：说清「为什么没有图」，而不是空白。
 *  [为什么要区分「没配」和「配了但不能用」] 两种情况用户要做的事完全不同：
 *  前者去填地址，后者去改地址。显示同一句话等于让人自己猜。 */
export function imagePlaceholder(raw: string | undefined | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "未设置图片地址";
  return "图片地址无效（仅支持 http(s) 或站内路径）";
}
