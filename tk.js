// =====================================================================
//  TÀI KHOẢN PT dùng chung cho các trang phụ (liên kết PT Hub, góp ý)
//  Firebase Authentication + Firestore · cấu hình trong plugins.json → site.auth.firebase
// =====================================================================
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ERR = {
  "auth/invalid-email": "Email không hợp lệ.",
  "auth/user-not-found": "Không tìm thấy tài khoản với email này.",
  "auth/wrong-password": "Sai mật khẩu.",
  "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
  "auth/email-already-in-use": "Email này đã được đăng ký. Hãy đăng nhập.",
  "auth/weak-password": "Mật khẩu quá yếu (tối thiểu 6 ký tự).",
  "auth/too-many-requests": "Thử quá nhiều lần. Vui lòng đợi ít phút.",
  "auth/popup-closed-by-user": "Bạn đã đóng cửa sổ đăng nhập Google.",
  "auth/popup-blocked": "Trình duyệt chặn cửa sổ bật lên. Hãy cho phép popup rồi thử lại.",
  "auth/network-request-failed": "Lỗi mạng. Kiểm tra kết nối và thử lại.",
  "permission-denied": "Máy chủ từ chối. Firestore chưa được bật hoặc chưa dán quy tắc bảo mật (firestore.rules).",
  "failed-precondition": "Firestore cần tạo chỉ mục – mở bảng điều khiển Firebase theo link trong Console."
};
export const errMsg = e => ERR[e?.code] || e?.message || "Có lỗi xảy ra. Vui lòng thử lại.";

export async function initFb() {
  const m = await fetch("/plugins.json", { cache: "no-store" }).then(r => r.json());
  const site = m.site || {}, c = site.auth?.firebase;
  if (!c?.apiKey) throw new Error("Chưa cấu hình Firebase trong plugins.json");
  const [{ initializeApp }, A, F] = await Promise.all([import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js")]);
  const app = initializeApp(c);
  return { A, F, auth: A.getAuth(app), db: F.getFirestore(app), site };
}

const G = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5a4.3 4.3 0 0 1-1.9 2.8v2.3h3A9 9 0 0 0 21 12.2z" fill="#4285F4"/><path d="M12 21c2.5 0 4.6-.8 6.1-2.3l-3-2.3c-.8.6-1.9.9-3.1.9a5.4 5.4 0 0 1-5-3.7H3.9v2.4A9 9 0 0 0 12 21z" fill="#34A853"/><path d="M7 13.6a5.4 5.4 0 0 1 0-3.4V7.8H3.9a9 9 0 0 0 0 8.2z" fill="#FBBC05"/><path d="M12 6.6c1.4 0 2.6.5 3.6 1.4l2.7-2.7A9 9 0 0 0 3.9 7.8L7 10.2a5.4 5.4 0 0 1 5-3.6z" fill="#EA4335"/></svg>`;

// Hộp đăng nhập (Google + email/mật khẩu + tạo tài khoản + quên mật khẩu).
export function loginBox(el, fb, note = "") {
  let view = "login";
  const draw = () => {
    const f = (id, label, type = "text", ac = "") => `<label class="tk-fld"><span>${label}</span><input id="${id}" type="${type}" autocomplete="${ac}"></label>`;
    el.innerHTML = `<div class="tk-box">
      ${note ? `<p class="tk-note">${esc(note)}</p>` : ""}
      ${view !== "reset" ? `<div class="tk-tabs"><button data-v="login" class="${view === "login" ? "on" : ""}">Đăng nhập</button><button data-v="signup" class="${view === "signup" ? "on" : ""}">Tạo tài khoản</button></div>
      <button class="tk-g" data-g>${G}Tiếp tục với Google</button><div class="tk-or"><span>hoặc dùng email</span></div>` : `<h3>Đặt lại mật khẩu</h3>`}
      <form data-f="${view}">
        ${view === "signup" ? f("tkName", "Họ và tên", "text", "name") : ""}
        ${f("tkEmail", "Email", "email", "email")}
        ${view !== "reset" ? f("tkPass", "Mật khẩu", "password", view === "signup" ? "new-password" : "current-password") : ""}
        ${view === "login" ? `<a class="tk-lnk r" data-v="reset">Quên mật khẩu?</a>` : ""}
        <div class="tk-msg" id="tkMsg"></div>
        <button class="tk-btn primary" type="submit">${view === "login" ? "Đăng nhập" : view === "signup" ? "Tạo tài khoản" : "Gửi link đặt lại"}</button>
        ${view === "reset" ? `<a class="tk-lnk" data-v="login">← Quay lại đăng nhập</a>` : ""}
      </form></div>`;
  };
  const msg = (t, ok) => { const m = el.querySelector("#tkMsg"); if (m) { m.textContent = t; m.className = "tk-msg " + (ok ? "ok" : "err"); } };
  el.onclick = async e => {
    const v = e.target.closest("[data-v]");
    if (v) { view = v.dataset.v; draw(); return; }
    if (e.target.closest("[data-g]")) {
      try { await fb.A.signInWithPopup(fb.auth, new fb.A.GoogleAuthProvider()); } catch (er) { msg(errMsg(er)); }
    }
  };
  el.onsubmit = async e => {
    e.preventDefault();
    const q = id => el.querySelector("#" + id)?.value.trim() || "";
    const btn = el.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      if (view === "login") await fb.A.signInWithEmailAndPassword(fb.auth, q("tkEmail"), el.querySelector("#tkPass").value);
      else if (view === "signup") {
        const r = await fb.A.createUserWithEmailAndPassword(fb.auth, q("tkEmail"), el.querySelector("#tkPass").value);
        if (q("tkName")) await fb.A.updateProfile(r.user, { displayName: q("tkName") });
        await fb.A.sendEmailVerification(r.user).catch(() => {});
      } else { await fb.A.sendPasswordResetEmail(fb.auth, q("tkEmail")); msg("Đã gửi link đặt lại mật khẩu – kiểm tra hộp thư (cả Spam).", true); }
    } catch (er) { msg(errMsg(er)); }
    btn.disabled = false;
  };
  draw();
}

export function avatar(u, big) {
  const name = u.displayName || (u.email || "?").split("@")[0];
  const ini = name.split(/\s+/).map(w => w[0]).slice(-2).join("").toUpperCase();
  return `<span class="tk-av${big ? " big" : ""}">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc(ini)}</span>`;
}

// Kiểu dáng chung (nền đen, nhấn cam như PT Hub).
export const CSS = `
:root{--bg:#111315;--surface:#181b1e;--surface-2:#1f2326;--ink:#ebe6db;--ink-2:#c9c3b7;--muted:#8f8a80;--line:#2b2f33;--line-2:#41464c;--accent:#d77a52;--accent-2:#e89670;--ok:#5fbf7f;--warn:#e0b04f;--err:#e06363;--ease:cubic-bezier(.2,.7,.2,1)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:400 15px/1.6 "Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
.nav a{text-decoration:none}
button,input,textarea,select{font:inherit;color:inherit}
.nav{position:sticky;top:0;z-index:20;background:rgba(17,19,21,.85);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.nav .in{max-width:1100px;margin:0 auto;padding:0 24px;height:60px;display:flex;align-items:center;gap:16px}
.brand{display:flex;align-items:center;gap:10px;font-weight:600;text-decoration:none;color:var(--ink)}
.brand img{width:28px;height:28px}
.nav .sp{flex:1}
.wrap{max-width:1100px;margin:0 auto;padding:32px 24px 80px}
h1{font-size:clamp(28px,4vw,40px);letter-spacing:-.03em;margin:0 0 6px}
.lead{color:var(--ink-2);margin:0 0 24px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:22px;animation:rise .4s var(--ease) both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.tk-box{max-width:380px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.tk-box form{display:flex;flex-direction:column;gap:10px}
.tk-note{margin:0;color:var(--ink-2);text-align:center}
.tk-tabs{display:flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2)}
.tk-tabs button{flex:1;border:0;background:none;padding:7px;border-radius:7px;cursor:pointer;color:var(--muted);transition:.2s}
.tk-tabs button.on{background:var(--accent);color:#fff}
.tk-g{display:flex;align-items:center;justify-content:center;gap:10px;padding:10px;border:1px solid var(--line-2);border-radius:10px;background:var(--surface-2);cursor:pointer;font-weight:600;transition:border-color .2s}
.tk-g:hover{border-color:var(--accent)}
.tk-or{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12.5px}
.tk-or::before,.tk-or::after{content:"";flex:1;height:1px;background:var(--line)}
.tk-fld{display:flex;flex-direction:column;gap:4px}
.tk-fld span{font-size:12.5px;color:var(--muted)}
.tk-fld input,.inp{background:var(--surface-2);border:1px solid var(--line);border-radius:9px;padding:9px 12px;outline:none;transition:border-color .2s,box-shadow .2s}
.tk-fld input:focus,.inp:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(215,122,82,.18)}
.tk-lnk{cursor:pointer;font-size:13px;text-decoration:none}
.tk-lnk.r{align-self:flex-end;margin-top:-4px}
.tk-msg{font-size:13px;min-height:0}
.tk-msg.err{color:var(--err)}.tk-msg.ok{color:var(--ok)}
.tk-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:9px 16px;border-radius:10px;border:1px solid var(--line-2);background:var(--surface-2);cursor:pointer;transition:background .2s,border-color .2s,transform .2s}
.tk-btn:hover{border-color:var(--accent)}
.tk-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
.tk-btn.primary:hover{background:var(--accent-2)}
.tk-btn:disabled{opacity:.6;cursor:default}
.tk-btn.sm{padding:5px 11px;font-size:13px;border-radius:8px}
.tk-av{width:36px;height:36px;border-radius:50%;border:2px solid var(--accent);display:inline-grid;place-items:center;overflow:hidden;font-weight:700;font-size:13px;color:var(--accent);background:#0d0e10;flex:none}
.tk-av img{width:100%;height:100%;object-fit:cover}
.tk-av.big{width:64px;height:64px;font-size:21px}
.tag{display:inline-block;font-size:11.5px;font-weight:600;padding:1px 9px;border-radius:999px;border:1px solid var(--line-2);color:var(--muted);white-space:nowrap}
.tag.new{color:var(--accent);border-color:rgba(215,122,82,.45);background:rgba(215,122,82,.1)}
.tag.seen{color:var(--warn);border-color:rgba(224,176,79,.45);background:rgba(224,176,79,.1)}
.tag.done{color:var(--ok);border-color:rgba(95,191,127,.45);background:rgba(95,191,127,.1)}
.tag.bo_qua{color:var(--err);border-color:rgba(224,99,99,.45);background:rgba(224,99,99,.1)}
.muted{color:var(--muted)}
.spinner{width:28px;height:28px;border-radius:50%;border:3px solid rgba(215,122,82,.2);border-top-color:var(--accent);animation:spin 1s linear infinite;margin:20px auto}
@keyframes spin{to{transform:rotate(360deg)}}
`;
