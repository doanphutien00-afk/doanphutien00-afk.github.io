// =====================================================================
//  Gọi máy chủ bản quyền PT (Cloudflare Worker) – dùng chung cho mua.html, ban-quyen.html, admin.html
//  Địa chỉ máy chủ: plugins.json → site.license_api
// =====================================================================
export const PRICES = {
  mai_viet: 129000, smart_floor: 99000, pt_wallpanel: 79000, pt_smartlight: 79000, pt_cabinet: 99000
};
export const money = v => Number(v || 0).toLocaleString("vi-VN") + "đ";

let BASE = null;
export async function apiBase() {
  if (BASE) return BASE;
  const m = await fetch("/plugins.json", { cache: "no-store" }).then(r => r.json()).catch(() => ({}));
  BASE = (m.site?.license_api || "").replace(/\/+$/, "");
  return BASE;
}

// fb: kết quả initFb() (tk.js) hoặc { auth }
export async function api(fb, path, { method = "GET", body } = {}) {
  const base = await apiBase();
  if (!base) throw Object.assign(new Error("Hệ thống bản quyền chưa được kết nối máy chủ."), { code: "no_api" });
  const u = fb?.auth?.currentUser;
  const headers = { "Content-Type": "application/json" };
  if (u) headers.Authorization = "Bearer " + await u.getIdToken();
  let r;
  try { r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { throw Object.assign(new Error("Không kết nối được máy chủ bản quyền. Kiểm tra mạng và thử lại."), { code: "network" }); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw Object.assign(new Error(j.message || `Lỗi máy chủ (${r.status})`), { code: j.error, status: r.status, data: j });
  return j;
}
