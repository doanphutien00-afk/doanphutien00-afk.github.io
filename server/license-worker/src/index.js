// =====================================================================
//  PT Plugins – máy chủ bản quyền (Cloudflare Worker + D1)
//  • Đơn hàng + mã QR (SePay / VietQR), webhook SePay tự xác nhận thanh toán
//  • Bản quyền vĩnh viễn theo email Google, 1 bản quyền = 2 máy
//  • Kích hoạt / huỷ kích hoạt / tự reset (30 ngày 1 lần) / quản trị reset
//  • Dùng thử 7 ngày theo máy
//  • Token bản quyền ký ECDSA P-256 – plugin kiểm tra offline bằng khoá công khai
//
//  Biến môi trường (wrangler.toml [vars] hoặc Settings → Variables):
//    FIREBASE_PROJECT  = pt-plugins
//    ADMINS            = doanphutien00@gmail.com,doanphutien2000@gmail.com
//    BANK_ACC          = số tài khoản nhận tiền   BANK_NAME = mã ngân hàng SePay (vd. Techcombank)
//    BANK_HOLDER       = tên chủ tài khoản (hiển thị)
//    SITE_ORIGIN       = https://doanphutien00-afk.github.io
//  Bí mật (Secrets):  LICENSE_PRIVATE_JWK (khoá ký), SEPAY_API_KEY (khoá webhook SePay)
//  Ràng buộc D1: DB
// =====================================================================

export const PRODUCTS = {
  mai_viet:      { name: "PT SmartRoof",   price: 129000 },
  smart_floor:   { name: "PT Smartfloor",  price: 99000 },
  pt_wallpanel:  { name: "PT Wall Panel",  price: 79000 },
  pt_smartlight: { name: "PT Smart Light", price: 79000 },
  pt_cabinet:    { name: "PT Cabinet",     price: 99000 },
};
const MAX_DEVICES = 2;
const TRIAL_DAYS = 7;
const TOKEN_DAYS = 30;            // token bản quyền phải làm mới online trong 30 ngày
const ORDER_HOURS = 24;
const SELF_RESET_DAYS = 30;
const DAY = 86400;

const now = () => Math.floor(Date.now() / 1000);
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uStr = s => b64u(new TextEncoder().encode(s));
const fromB64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));

class HttpError extends Error { constructor(status, code, msg) { super(msg || code); this.status = status; this.code = code; } }
const bad = (code, msg, status = 400) => { throw new HttpError(status, code, msg); };

// Cấu hình mặc định (biến môi trường trên Cloudflare, nếu có, sẽ ghi đè)
const DEFAULTS = {
  FIREBASE_PROJECT: "pt-plugins",
  ADMINS: "doanphutien00@gmail.com,doanphutien2000@gmail.com",
  SITE_ORIGIN: "https://doanphutien00-afk.github.io",
  BANK_ACC: "0965132144",
  BANK_NAME: "MBBank",
  BANK_HOLDER: "DOAN PHU TIEN",
};

export default {
  async fetch(req, env0) {
    const env = { ...DEFAULTS, ...env0 };
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(req, env);
      return json(res, 200, cors);
    } catch (e) {
      const st = e instanceof HttpError ? e.status : 500;
      if (st === 500) console.error(e.stack || e);
      return json({ ok: false, error: e.code || "server_error", message: e.message, ...(e.devices ? { devices: e.devices } : {}) }, st, cors);
    }
  },
  // dọn đơn quá hạn (Cron Trigger, tuỳ chọn)
  async scheduled(_ev, env0) {
    const env = { ...DEFAULTS, ...env0 };
    await env.DB.prepare("UPDATE orders SET status='expired' WHERE status='pending' AND created < ?").bind(now() - ORDER_HOURS * 3600).run();
  },
};

function corsHeaders(req, env) {
  const o = req.headers.get("Origin") || "";
  const allow = !o || o === env.SITE_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(o) ? (o || "*") : env.SITE_ORIGIN;
  return { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Authorization,Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" };
}
function json(o, status, headers) { return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } }); }
async function body(req) { try { return await req.json(); } catch (e) { return {}; } }

async function route(req, env) {
  const url = new URL(req.url), p = url.pathname.replace(/\/+$/, ""), m = req.method;
  if (p === "" || p === "/api") return { ok: true, service: "pt-license" };
  if (p === "/api/products" && m === "GET") return { ok: true, products: PRODUCTS, max_devices: MAX_DEVICES, trial_days: TRIAL_DAYS };
  if (p === "/api/sepay/webhook" && m === "POST") return sepayWebhook(req, env);
  if (p === "/api/trial" && m === "POST") return trial(await body(req), env);
  if (p === "/api/pubkey" && m === "GET") return { ok: true, pem: await publicPem(env) };

  const user = await authUser(req, env);                    // các API dưới cần đăng nhập
  if (p === "/api/orders" && m === "POST") return createOrder(user, await body(req), env);
  if (p.startsWith("/api/orders/") && m === "GET") return getOrder(user, decodeURIComponent(p.slice(12)), env);
  if (p === "/api/me" && m === "GET") return me(user, env);
  if (p === "/api/license/activate" && m === "POST") return activate(user, await body(req), env, false);
  if (p === "/api/license/refresh" && m === "POST") return activate(user, await body(req), env, true);
  if (p === "/api/license/deactivate" && m === "POST") return deactivate(user, await body(req), env);
  if (p === "/api/license/self-reset" && m === "POST") return selfReset(user, await body(req), env);

  if (p.startsWith("/api/admin/")) {
    if (!isAdmin(user, env)) bad("forbidden", "Chỉ quản trị viên", 403);
    const b = m === "POST" ? await body(req) : {};
    switch (p) {
      case "/api/admin/overview": return adminOverview(env, url);
      case "/api/admin/config": return { ok: true, webhook_url: url.origin + "/api/sepay/webhook", sepay_api_key: await sepayKey(env), auth_header: "Authorization: Apikey <khoá>", pem: await publicPem(env), bank: { acc: env.BANK_ACC, name: env.BANK_NAME, holder: env.BANK_HOLDER } };
      case "/api/admin/reset": return adminReset(b, env);
      case "/api/admin/revoke": return adminRevoke(b, env);
      case "/api/admin/grant": return adminGrant(b, env);
      case "/api/admin/mark-paid": return adminMarkPaid(b, env);
      case "/api/admin/remove-device": return adminRemoveDevice(b, env);
    }
  }
  bad("not_found", "Không có API này", 404);
}

/* ------------------------------------------------ xác thực Firebase ID token */
let JWKS = null, JWKS_AT = 0;
async function authUser(req, env) {
  const h = req.headers.get("Authorization") || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!tok) bad("auth_required", "Cần đăng nhập", 401);
  const [hB, pB, sB] = tok.split(".");
  if (!sB) bad("auth_invalid", "Phiên đăng nhập không hợp lệ", 401);
  const hdr = JSON.parse(new TextDecoder().decode(fromB64u(hB))), pl = JSON.parse(new TextDecoder().decode(fromB64u(pB)));
  if (!JWKS || Date.now() - JWKS_AT > 3600e3) {
    JWKS = (await (await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")).json()).keys;
    JWKS_AT = Date.now();
  }
  const jwk = JWKS.find(k => k.kid === hdr.kid);
  if (!jwk || hdr.alg !== "RS256") bad("auth_invalid", "Phiên đăng nhập không hợp lệ", 401);
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, fromB64u(sB), new TextEncoder().encode(hB + "." + pB));
  const proj = env.FIREBASE_PROJECT || "pt-plugins", t = now();
  if (!ok || pl.aud !== proj || pl.iss !== `https://securetoken.google.com/${proj}` || pl.exp < t || pl.iat > t + 300)
    bad("auth_invalid", "Phiên đăng nhập hết hạn, hãy đăng nhập lại", 401);
  if (!pl.email || !pl.email_verified) bad("email_unverified", "Email chưa được xác minh", 403);
  return { uid: pl.user_id || pl.sub, email: String(pl.email).toLowerCase(), name: pl.name || "", provider: pl.firebase?.sign_in_provider };
}
const isAdmin = (u, env) => (env.ADMINS || "").toLowerCase().split(/[,\s]+/).includes(u.email);

/* ------------------------------------------------ ký token bản quyền */
// Khoá & cấu hình bí mật: lấy từ Secret nếu có, không thì tự sinh 1 lần và lưu trong D1 (bảng kv).
async function kvGet(env, k) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)").run();
  return (await env.DB.prepare("SELECT v FROM kv WHERE k=?").bind(k).first())?.v ?? null;
}
async function kvInit(env, k, make) {
  let v = await kvGet(env, k);
  if (v == null) {
    await env.DB.prepare("INSERT OR IGNORE INTO kv (k,v) VALUES (?,?)").bind(k, await make()).run();
    v = await kvGet(env, k);
  }
  return v;
}
async function privJwk(env) {
  if (env.LICENSE_PRIVATE_JWK) return env.LICENSE_PRIVATE_JWK;
  return kvInit(env, "license_private_jwk", async () => {
    const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    return JSON.stringify(await crypto.subtle.exportKey("jwk", k.privateKey));
  });
}
async function publicPem(env) {
  const j = JSON.parse(await privJwk(env)); delete j.d; j.key_ops = ["verify"];
  const pub = await crypto.subtle.importKey("jwk", j, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
  const b = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("spki", pub))));
  return "-----BEGIN PUBLIC KEY-----\n" + b.match(/.{1,64}/g).join("\n") + "\n-----END PUBLIC KEY-----\n";
}
async function sepayKey(env) {
  if (env.SEPAY_API_KEY) return env.SEPAY_API_KEY;
  return kvInit(env, "sepay_api_key", async () => [...crypto.getRandomValues(new Uint8Array(24))].map(x => x.toString(16).padStart(2, "0")).join(""));
}

let PRIV = null;
async function sign(payload, env) {
  if (!PRIV) PRIV = await crypto.subtle.importKey("jwk", JSON.parse(await privJwk(env)), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const data = b64uStr(JSON.stringify(payload));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, PRIV, new TextEncoder().encode(data));
  return data + "." + b64u(sig);   // chữ ký dạng r||s (64 byte)
}
const prod = id => PRODUCTS[id] || bad("bad_product", "Plugin không bán bản quyền");
const devOk = d => typeof d === "string" && /^[a-f0-9]{32,64}$/.test(d) || bad("bad_device", "Mã máy không hợp lệ");

/* ------------------------------------------------ đơn hàng */
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode() { const r = crypto.getRandomValues(new Uint8Array(6)); return "PT" + [...r].map(x => ALPH[x % ALPH.length]).join(""); }
function qrUrl(env, o) {
  return `https://qr.sepay.vn/img?acc=${encodeURIComponent(env.BANK_ACC || "")}&bank=${encodeURIComponent(env.BANK_NAME || "")}&amount=${o.amount}&des=${o.code}&template=compact`;
}
function orderOut(env, o) {
  return { code: o.code, product: o.product, product_name: PRODUCTS[o.product]?.name, amount: o.amount, status: o.status, created: o.created,
    expires: o.created + ORDER_HOURS * 3600, paid_at: o.paid_at, qr: qrUrl(env, o), bank: { acc: env.BANK_ACC, name: env.BANK_NAME, holder: env.BANK_HOLDER } };
}
async function createOrder(user, b, env) {
  const p = prod(b.product);
  const lic = await env.DB.prepare("SELECT * FROM licenses WHERE email=? AND product=?").bind(user.email, b.product).first();
  if (lic && !lic.revoked) bad("already_owned", "Tài khoản này đã sở hữu bản quyền plugin này", 409);
  // dùng lại đơn đang chờ (cùng email + plugin) nếu còn hạn
  const old = await env.DB.prepare("SELECT * FROM orders WHERE email=? AND product=? AND status='pending' AND created>? ORDER BY created DESC")
    .bind(user.email, b.product, now() - ORDER_HOURS * 3600).first();
  if (old && old.amount === p.price) return { ok: true, order: orderOut(env, old) };
  let code;
  for (let i = 0; i < 5; i++) { code = newCode(); if (!(await env.DB.prepare("SELECT 1 FROM orders WHERE code=?").bind(code).first())) break; }
  const o = { code, email: user.email, uid: user.uid, product: b.product, amount: p.price, status: "pending", created: now() };
  await env.DB.prepare("INSERT INTO orders (code,email,uid,product,amount,status,created) VALUES (?,?,?,?,?,?,?)")
    .bind(o.code, o.email, o.uid, o.product, o.amount, o.status, o.created).run();
  return { ok: true, order: orderOut(env, o) };
}
async function getOrder(user, code, env) {
  const o = await env.DB.prepare("SELECT * FROM orders WHERE code=?").bind(code).first();
  if (!o || (o.email !== user.email && !isAdmin(user, env))) bad("not_found", "Không tìm thấy đơn hàng", 404);
  if (o.status === "pending" && o.created < now() - ORDER_HOURS * 3600) o.status = "expired";
  return { ok: true, order: orderOut(env, o) };
}

/* ------------------------------------------------ webhook SePay */
async function sepayWebhook(req, env) {
  const auth = req.headers.get("Authorization") || "";
  if (auth.replace(/^Apikey\s+/i, "").trim() !== await sepayKey(env)) bad("forbidden", "Sai khoá webhook", 401);
  const t = await body(req);
  if (t.transferType && t.transferType !== "in") return { success: true, ignored: "out" };
  const id = String(t.id ?? t.referenceCode ?? "");
  if (id && await env.DB.prepare("SELECT 1 FROM payments WHERE id=?").bind(id).first()) return { success: true, duplicate: true };
  const text = `${t.code || ""} ${t.content || ""} ${t.description || ""}`.toUpperCase().replace(/[^A-Z0-9]/g, " ");
  const m = text.match(/\bPT[A-Z0-9]{6}\b/) || text.replace(/\s+/g, "").match(/PT[A-HJ-NP-Z2-9]{6}/);
  const code = m ? m[0].replace(/\s/g, "") : null;
  const amount = Math.round(Number(t.transferAmount || 0));
  await env.DB.prepare("INSERT OR IGNORE INTO payments (id,order_code,amount,content,raw,created) VALUES (?,?,?,?,?,?)")
    .bind(id || crypto.randomUUID(), code, amount, String(t.content || ""), JSON.stringify(t).slice(0, 4000), now()).run();
  if (!code) return { success: true, matched: false };
  const o = await env.DB.prepare("SELECT * FROM orders WHERE code=?").bind(code).first();
  if (!o) return { success: true, matched: false };
  if (o.status === "paid") return { success: true, already: true };
  if (amount < o.amount) {
    await env.DB.prepare("UPDATE orders SET note=? WHERE code=?").bind(`Nhận ${amount}đ < ${o.amount}đ – chưa cấp`, code).run();
    return { success: true, matched: true, underpaid: true };
  }
  await markPaid(o, id, amount, env);
  return { success: true, matched: true, paid: true };
}
async function markPaid(o, payId, amount, env) {
  const t = now();
  await env.DB.batch([
    env.DB.prepare("UPDATE orders SET status='paid', paid_at=?, payment_id=?, paid_amount=? WHERE code=?").bind(t, payId || null, amount, o.code),
    env.DB.prepare("INSERT INTO licenses (email,product,order_code,created) VALUES (?,?,?,?) ON CONFLICT(email,product) DO UPDATE SET revoked=0, order_code=excluded.order_code")
      .bind(o.email, o.product, o.code, t),
  ]);
}

/* ------------------------------------------------ bản quyền của tôi */
async function licensesOf(email, env) {
  const ls = (await env.DB.prepare("SELECT * FROM licenses WHERE email=? AND revoked=0 ORDER BY created").bind(email).all()).results;
  for (const l of ls) {
    l.devices = (await env.DB.prepare("SELECT device_id,name,activated,last_seen FROM devices WHERE license_id=? ORDER BY activated").bind(l.id).all()).results;
    l.product_name = PRODUCTS[l.product]?.name || l.product;
    l.can_self_reset_at = (l.last_self_reset || 0) + SELF_RESET_DAYS * DAY;
  }
  return ls;
}
async function me(user, env) {
  const orders = (await env.DB.prepare("SELECT * FROM orders WHERE email=? ORDER BY created DESC LIMIT 20").bind(user.email).all()).results;
  return { ok: true, email: user.email, max_devices: MAX_DEVICES, licenses: await licensesOf(user.email, env), orders: orders.map(o => orderOut(env, o)) };
}

/* ------------------------------------------------ kích hoạt / làm mới */
async function activate(user, b, env, refreshOnly) {
  prod(b.product); devOk(b.device_id);
  const lic = await env.DB.prepare("SELECT * FROM licenses WHERE email=? AND product=? AND revoked=0").bind(user.email, b.product).first();
  if (!lic) bad("no_license", "Tài khoản này chưa mua bản quyền plugin", 402);
  const t = now(), name = String(b.device_name || "").slice(0, 80);
  const dev = await env.DB.prepare("SELECT * FROM devices WHERE license_id=? AND device_id=?").bind(lic.id, b.device_id).first();
  if (dev) {
    await env.DB.prepare("UPDATE devices SET last_seen=?, name=COALESCE(NULLIF(?,''),name) WHERE license_id=? AND device_id=?").bind(t, name, lic.id, b.device_id).run();
  } else {
    if (refreshOnly) bad("not_activated", "Máy này đã bị huỷ kích hoạt", 403);
    const n = (await env.DB.prepare("SELECT COUNT(*) n FROM devices WHERE license_id=?").bind(lic.id).first()).n;
    if (n >= MAX_DEVICES) {
      const devices = (await env.DB.prepare("SELECT device_id,name,activated,last_seen FROM devices WHERE license_id=?").bind(lic.id).all()).results;
      throw Object.assign(new HttpError(409, "device_limit", `Bản quyền đã kích hoạt đủ ${MAX_DEVICES} máy. Huỷ kích hoạt máy cũ hoặc reset thiết bị.`), { devices });
    }
    await env.DB.prepare("INSERT INTO devices (license_id,device_id,name,activated,last_seen) VALUES (?,?,?,?,?)").bind(lic.id, b.device_id, name, t, t).run();
  }
  const token = await sign({ v: 1, t: "lic", p: b.product, e: user.email, d: b.device_id, l: lic.id, iat: t, exp: t + TOKEN_DAYS * DAY }, env);
  return { ok: true, token, exp: t + TOKEN_DAYS * DAY };
}
async function deactivate(user, b, env) {
  prod(b.product); devOk(b.device_id);
  const lic = await env.DB.prepare("SELECT * FROM licenses WHERE email=? AND product=?").bind(user.email, b.product).first();
  if (!lic) bad("no_license", "Không có bản quyền", 404);
  await env.DB.prepare("DELETE FROM devices WHERE license_id=? AND device_id=?").bind(lic.id, b.device_id).run();
  return { ok: true };
}
async function selfReset(user, b, env) {
  prod(b.product);
  const lic = await env.DB.prepare("SELECT * FROM licenses WHERE email=? AND product=? AND revoked=0").bind(user.email, b.product).first();
  if (!lic) bad("no_license", "Không có bản quyền", 404);
  const next = (lic.last_self_reset || 0) + SELF_RESET_DAYS * DAY;
  if (now() < next) bad("reset_limit", `Mỗi ${SELF_RESET_DAYS} ngày chỉ tự reset được 1 lần. Liên hệ tác giả nếu cần gấp.`, 429);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM devices WHERE license_id=?").bind(lic.id),
    env.DB.prepare("UPDATE licenses SET last_self_reset=? WHERE id=?").bind(now(), lic.id),
  ]);
  return { ok: true };
}

/* ------------------------------------------------ dùng thử */
async function trial(b, env) {
  prod(b.product); devOk(b.device_id);
  const t = now();
  await env.DB.prepare("INSERT OR IGNORE INTO trials (device_id,product,started) VALUES (?,?,?)").bind(b.device_id, b.product, t).run();
  const row = await env.DB.prepare("SELECT started FROM trials WHERE device_id=? AND product=?").bind(b.device_id, b.product).first();
  const exp = row.started + TRIAL_DAYS * DAY;
  if (exp <= t) return { ok: true, expired: true, started: row.started, exp };
  const token = await sign({ v: 1, t: "trial", p: b.product, d: b.device_id, iat: t, exp }, env);
  return { ok: true, token, exp, started: row.started };
}

/* ------------------------------------------------ quản trị */
async function adminOverview(env, url) {
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();
  const like = `%${q}%`;
  const lic = (await env.DB.prepare(`SELECT * FROM licenses ${q ? "WHERE email LIKE ? OR order_code LIKE ?" : ""} ORDER BY created DESC LIMIT 500`).bind(...(q ? [like, like] : [])).all()).results;
  const devs = (await env.DB.prepare("SELECT * FROM devices").all()).results;
  for (const l of lic) { l.devices = devs.filter(d => d.license_id === l.id); l.product_name = PRODUCTS[l.product]?.name || l.product; }
  const orders = (await env.DB.prepare(`SELECT * FROM orders ${q ? "WHERE email LIKE ? OR code LIKE ?" : ""} ORDER BY created DESC LIMIT 300`).bind(...(q ? [like, like] : [])).all()).results;
  const pays = (await env.DB.prepare("SELECT id,order_code,amount,content,created FROM payments ORDER BY created DESC LIMIT 100").all()).results;
  const stats = await env.DB.prepare("SELECT COUNT(*) n, COALESCE(SUM(paid_amount),0) s FROM orders WHERE status='paid'").first();
  return { ok: true, products: PRODUCTS, licenses: lic, orders: orders.map(o => ({ ...o, product_name: PRODUCTS[o.product]?.name })), payments: pays, stats };
}
async function adminReset(b, env) { await env.DB.prepare("DELETE FROM devices WHERE license_id=?").bind(b.license_id).run(); return { ok: true }; }
async function adminRemoveDevice(b, env) { await env.DB.prepare("DELETE FROM devices WHERE license_id=? AND device_id=?").bind(b.license_id, b.device_id).run(); return { ok: true }; }
async function adminRevoke(b, env) {
  await env.DB.batch([
    env.DB.prepare("UPDATE licenses SET revoked=? WHERE id=?").bind(b.revoked ? 1 : 0, b.license_id),
    ...(b.revoked ? [env.DB.prepare("DELETE FROM devices WHERE license_id=?").bind(b.license_id)] : []),
  ]);
  return { ok: true };
}
async function adminGrant(b, env) {
  prod(b.product);
  const email = String(b.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) bad("bad_email", "Email không hợp lệ");
  await env.DB.prepare("INSERT INTO licenses (email,product,created,note) VALUES (?,?,?,?) ON CONFLICT(email,product) DO UPDATE SET revoked=0, note=excluded.note")
    .bind(email, b.product, now(), String(b.note || "Cấp tay").slice(0, 200)).run();
  return { ok: true };
}
async function adminMarkPaid(b, env) {
  const o = await env.DB.prepare("SELECT * FROM orders WHERE code=?").bind(b.code).first();
  if (!o) bad("not_found", "Không có đơn", 404);
  if (o.status !== "paid") await markPaid(o, "manual", o.amount, env);
  return { ok: true };
}
