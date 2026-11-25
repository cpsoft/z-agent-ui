// 拍摄/相册取到的照片，在上报之前先在**本地**缩一遍。
//
// [WHY 压缩必须发生在组件里，而不是交给宿主] 手机直出的照片 3~8MB，一张就是一整条
// 移动网络的账单；而「上传」这一步在 ADR-004 里归宿主（鉴权、网关、重试各系统不同）。
// 若压缩也交给宿主，每个宿主都要重写一遍 canvas 缩放，写歪的形态是「有的页面传 6MB、
// 有的传 200KB」，从接口上看不出差别。压缩是**取图这一侧**的事，与「传到哪」无关，
// 所以放在这里：宿主拿到的 File 已经是可直传的大小。
//
// 三条不动手的边界：
//   ① `maxEdge <= 0`（缺省）：完全不碰文件，字节级原样上报 —— 后端的存储格式不由组件猜。
//   ② GIF / SVG：转成 JPEG 会丢动画与矢量清晰度，宁可不缩。
//   ③ 任何一步失败（环境没有 canvas、解码失败、压完反而更大）：**返回原文件**。
//      丢文件是最难解释的故障，慢一点是可接受的。
export interface CompressOptions {
  /** 长边上限（px）。<= 0 表示不压缩。 */
  maxEdge: number;
  /** JPEG 质量 0.1~1，缺省 0.82。 */
  quality?: number;
}

/** 长边缩到 `maxEdge` 以内，宽高比不变；本来就不超限时返回 null（调用方据此跳过重编码）。 */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } | null {
  const long = Math.max(width, height);
  if (!(maxEdge > 0) || long <= maxEdge) return null;
  const scale = maxEdge / long;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * 按长边上限压缩一张照片。
 *
 * 输出的 MIME 固定为 `image/jpeg`（照片没有透明通道的需求，而 JPEG 的兼容性最好）；
 * 文件名同步换成 `.jpg` —— 名字与类型不一致会让一部分后端按扩展名校验时拒收。
 */
export async function compressPhoto(file: File, opts: CompressOptions): Promise<File> {
  const maxEdge = Math.floor(opts.maxEdge);
  if (!(maxEdge > 0)) return file;
  if (!file.type.startsWith("image/")) return file;
  if (/^image\/(gif|svg\+xml)$/.test(file.type)) return file;
  let url = "";
  try {
    url = URL.createObjectURL(file);
    const img = await loadImage(url);
    const size = fitWithin(img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge);
    if (!size) return file;
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, size.width, size.height);
    const blob = await toBlob(canvas, opts.quality ?? 0.82);
    // 压完更大说明原图本来就是小尺寸高质量图：保持原样比「看起来压缩过」更有用
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], jpegName(file.name), { type: blob.type || "image/jpeg", lastModified: file.lastModified });
  } catch {
    // 解码失败、canvas 被裁、环境没有 toBlob：都不该让这次选择白做
    return file;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/** `IMG_0042.HEIC` → `IMG_0042.jpg`（不带点的名字直接补后缀）。 */
export function jpegName(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return `${stem}.jpg`;
}
