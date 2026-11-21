// Cloudflare Pages Function: tải gói .rbz ngay trên ptplugin.pages.dev.
// Gói không nằm trong trang (Cloudflare giới hạn 25 MB/tệp) nên lấy từ GitHub Release (vẫn tính lượt tải),
// nếu không có thì lấy bản trong kho trang GitHub Pages.
//   /pt-hub/goi/<thẻ release>/<tệp>.rbz   (trang chủ dùng dạng này)
//   /pt-hub/goi/<mã>-<phiên bản>.rbz      (đường dẫn như trên GitHub Pages)
const REPO = "doanphutien00-afk/doanphutien00-afk.github.io";
const PAGES = "https://doanphutien00-afk.github.io/pt-hub/goi/";
const SAFE = /^[\w.\-]+$/;

export async function onRequest({ params, request }) {
  const seg = [].concat(params.path || []);
  const name = seg[seg.length - 1] || "";
  if (seg.length > 2 || !seg.every(x => SAFE.test(x)) || !/\.rbz$/i.test(name)) return notFound();
  const sources = [];
  if (seg.length === 2) sources.push(`https://github.com/${REPO}/releases/download/${seg[0]}/${name}`);
  else {
    const m = /^([a-z0-9_]+)-(\d+(?:\.\d+)*)\.rbz$/i.exec(name);
    if (m) sources.push(`https://github.com/${REPO}/releases/download/${m[1]}-v${m[2]}/${name}`);
    sources.push(PAGES + name);
  }
  const method = request.method === "HEAD" ? "HEAD" : "GET";
  for (const url of sources) {
    const r = await fetch(url, { method, redirect: "follow" });
    if (!r.ok) continue;
    const h = new Headers({ "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" });
    const len = r.headers.get("Content-Length"); if (len) h.set("Content-Length", len);
    return new Response(method === "HEAD" ? null : r.body, { status: 200, headers: h });
  }
  return notFound();
}
const notFound = () => new Response("Không tìm thấy tệp", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
