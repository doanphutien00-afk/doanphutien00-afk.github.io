// =====================================================================
//  ĐĂNG NHẬP / ĐĂNG KÝ — Firebase Authentication (Google + Email)
//  Cấu hình nằm trong plugins.json → site.auth.firebase
// =====================================================================
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

/* ---------- Chuỗi song ngữ ---------- */
Object.assign(I18N.vi, {
  au_login: "Đăng nhập", au_signup: "Tạo tài khoản", au_logout: "Đăng xuất",
  au_google: "Tiếp tục với Google", au_or: "hoặc dùng email",
  au_name: "Họ và tên", au_email: "Email", au_pass: "Mật khẩu", au_pass2: "Nhập lại mật khẩu",
  au_forgot: "Quên mật khẩu?", au_send_reset: "Gửi link đặt lại", au_back: "← Quay lại đăng nhập",
  au_no_acc: "Chưa có tài khoản?", au_has_acc: "Đã có tài khoản?",
  au_t_login: "Chào mừng trở lại", au_s_login: "Đăng nhập để tải plugin và nhận thông báo phiên bản mới.",
  au_t_signup: "Tạo tài khoản", au_s_signup: "Miễn phí. Chỉ mất 30 giây.",
  au_t_reset: "Đặt lại mật khẩu", au_s_reset: "Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu.",
  au_need_login: "Vui lòng đăng nhập để tải plugin.",
  au_admin: "Trang quản trị", au_hello: "Xin chào", au_verify: "Chưa xác minh email", au_resend: "Gửi lại email xác minh",
  au_ok_signup: "Đã tạo tài khoản! Kiểm tra hộp thư để xác minh email.",
  au_ok_reset: "Đã gửi link đặt lại mật khẩu. Kiểm tra hộp thư (cả mục Spam).",
  au_ok_login: "Đăng nhập thành công", au_ok_logout: "Đã đăng xuất", au_ok_verify: "Đã gửi lại email xác minh",
  au_not_ready: "Chức năng đăng nhập chưa được kết nối máy chủ. Vui lòng quay lại sau.",
  au_terms: "Bằng việc tiếp tục, bạn đồng ý nhận email thông báo về plugin.",
  e_mismatch: "Hai mật khẩu không khớp.", e_short: "Mật khẩu cần ít nhất 6 ký tự.",
  "auth/invalid-email": "Email không hợp lệ.", "auth/user-not-found": "Không tìm thấy tài khoản với email này.",
  "auth/wrong-password": "Sai mật khẩu.", "auth/invalid-credential": "Email hoặc mật khẩu không đúng.",
  "auth/email-already-in-use": "Email này đã được đăng ký. Hãy đăng nhập.",
  "auth/weak-password": "Mật khẩu quá yếu (tối thiểu 6 ký tự).",
  "auth/too-many-requests": "Thử quá nhiều lần. Vui lòng đợi ít phút.",
  "auth/popup-closed-by-user": "Bạn đã đóng cửa sổ đăng nhập Google.",
  "auth/popup-blocked": "Trình duyệt chặn cửa sổ bật lên. Hãy cho phép popup rồi thử lại.",
  "auth/unauthorized-domain": "Tên miền này chưa được cho phép trong Firebase.",
  "auth/network-request-failed": "Lỗi mạng. Kiểm tra kết nối và thử lại.",
  e_generic: "Có lỗi xảy ra. Vui lòng thử lại."
});
Object.assign(I18N.en, {
  au_login: "Sign in", au_signup: "Create account", au_logout: "Sign out",
  au_google: "Continue with Google", au_or: "or use email",
  au_name: "Full name", au_email: "Email", au_pass: "Password", au_pass2: "Confirm password",
  au_forgot: "Forgot password?", au_send_reset: "Send reset link", au_back: "← Back to sign in",
  au_no_acc: "No account yet?", au_has_acc: "Already have an account?",
  au_t_login: "Welcome back", au_s_login: "Sign in to download plugins and get release notifications.",
  au_t_signup: "Create your account", au_s_signup: "Free. Takes 30 seconds.",
  au_t_reset: "Reset password", au_s_reset: "Enter your registered email and we'll send you a reset link.",
  au_need_login: "Please sign in to download plugins.",
  au_admin: "Admin dashboard", au_hello: "Hello", au_verify: "Email not verified", au_resend: "Resend verification email",
  au_ok_signup: "Account created! Check your inbox to verify your email.",
  au_ok_reset: "Reset link sent. Check your inbox (and Spam).",
  au_ok_login: "Signed in", au_ok_logout: "Signed out", au_ok_verify: "Verification email sent",
  au_not_ready: "Sign-in is not connected to the server yet. Please come back later.",
  au_terms: "By continuing you agree to receive plugin update emails.",
  e_mismatch: "Passwords do not match.", e_short: "Password must be at least 6 characters.",
  "auth/invalid-email": "Invalid email address.", "auth/user-not-found": "No account found for this email.",
  "auth/wrong-password": "Wrong password.", "auth/invalid-credential": "Incorrect email or password.",
  "auth/email-already-in-use": "This email is already registered. Please sign in.",
  "auth/weak-password": "Password is too weak (min. 6 characters).",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes.",
  "auth/popup-closed-by-user": "The Google sign-in window was closed.",
  "auth/popup-blocked": "Your browser blocked the pop-up. Allow pop-ups and try again.",
  "auth/unauthorized-domain": "This domain is not authorised in Firebase.",
  "auth/network-request-failed": "Network error. Check your connection and retry.",
  e_generic: "Something went wrong. Please try again."
});

/* ---------- Giao diện ---------- */
const css = `
.au-btn{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:999px;border:1px solid var(--line-2);background:none;cursor:pointer;font-size:13.5px;font-weight:500;transition:border-color .2s,background .2s}
.au-btn:hover{border-color:var(--accent);color:var(--accent)}
.au-btn svg{width:15px;height:15px}
.au-user{position:relative}
.au-avatar{width:34px;height:34px;border-radius:50%;border:2px solid var(--accent);background:var(--surface-2);display:grid;place-items:center;cursor:pointer;overflow:hidden;font-weight:600;font-size:13px;padding:0;transition:transform .25s var(--ease)}
.au-avatar:hover{transform:scale(1.06)}
.au-avatar img{width:100%;height:100%;object-fit:cover}
.au-menu{position:absolute;right:0;top:calc(100% + 10px);min-width:240px;background:var(--surface);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow);padding:8px;opacity:0;transform:translateY(-6px) scale(.98);transform-origin:top right;pointer-events:none;transition:.22s var(--ease);z-index:40}
.au-menu.open{opacity:1;transform:none;pointer-events:auto}
.au-menu .who{padding:10px 10px 12px;border-bottom:1px solid var(--line);margin-bottom:6px}
.au-menu .who b{display:block;font-size:14.5px}
.au-menu .who span{font-size:12.5px;color:var(--muted);word-break:break-all}
.au-menu .warn{display:block;margin-top:6px;font-size:11.5px;color:var(--accent)}
.au-menu .au-mi{display:block;padding:9px 10px;border-radius:6px;font-size:13.5px;text-decoration:none;color:inherit}
.au-menu .au-mi:hover{background:var(--surface-2);color:var(--accent)}
.au-menu button{width:100%;text-align:left;border:0;background:none;padding:9px 10px;border-radius:6px;cursor:pointer;font-size:13.5px}
.au-menu button:hover{background:var(--surface-2)}

.au-ov{position:fixed;inset:0;z-index:60;background:rgba(10,10,12,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:grid;place-items:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .3s var(--ease)}
.au-ov.open{opacity:1;pointer-events:auto}
.au-modal{width:min(420px,100%);background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);padding:52px 28px 24px;position:relative;border-top:3px solid var(--accent);transform:translateY(18px) scale(.97);transition:transform .4s var(--ease);max-height:calc(100vh - 40px);overflow:auto}
.au-ov.open .au-modal{transform:none}
.au-x{position:absolute;right:12px;top:10px;width:32px;height:32px;border-radius:50%;border:0;background:none;cursor:pointer;color:var(--muted);font-size:20px;line-height:1}
.au-x:hover{background:var(--surface-2);color:var(--ink)}
.au-tabs{display:grid;grid-template-columns:1fr 1fr;background:var(--surface-2);border-radius:8px;padding:3px;margin-bottom:22px;position:relative}
.au-tabs button{border:0;background:none;padding:8px;border-radius:6px;cursor:pointer;font-size:13.5px;font-weight:500;color:var(--muted);position:relative;z-index:1;transition:color .25s}
.au-tabs button[aria-selected="true"]{color:var(--ink)}
.au-tabs .pill{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);background:var(--surface);border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.12);transition:transform .35s var(--ease)}
.au-tabs.signup .pill{transform:translateX(100%)}
.au-modal h3{font-size:22px;margin:0 0 4px;text-transform:none}
.au-sub{color:var(--muted);font-size:13.5px;margin:0 0 20px}
.au-g{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:11px;border:1px solid var(--line-2);border-radius:8px;background:var(--surface);cursor:pointer;font-weight:500;font-size:14.5px;transition:border-color .2s,transform .15s}
.au-g:hover{border-color:var(--ink)}
.au-g:active{transform:scale(.99)}
.au-g svg{width:18px;height:18px}
.au-sep{display:flex;align-items:center;gap:12px;color:var(--muted);font-size:12px;margin:18px 0}
.au-sep::before,.au-sep::after{content:"";flex:1;height:1px;background:var(--line)}
.au-f{display:grid;gap:12px}
.au-fld{position:relative}
.au-fld input{width:100%;padding:18px 12px 6px;border:1px solid var(--line-2);border-radius:8px;background:var(--bg);color:var(--ink);font:inherit;font-size:14.5px;transition:border-color .2s,box-shadow .2s}
.au-fld input:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
.au-fld label{position:absolute;left:12px;top:13px;color:var(--muted);font-size:14px;pointer-events:none;transition:.18s var(--ease)}
.au-fld input:focus + label,.au-fld input:not(:placeholder-shown) + label{top:5px;font-size:11px}
.au-eye{position:absolute;right:8px;top:50%;translate:0 -50%;border:0;background:none;cursor:pointer;color:var(--muted);padding:6px}
.au-eye svg{width:17px;height:17px}
.au-meter{height:3px;border-radius:3px;background:var(--line);overflow:hidden;margin-top:-6px}
.au-meter i{display:block;height:100%;width:0;transition:width .3s,background .3s}
.au-row{display:flex;justify-content:flex-end;margin-top:-4px}
.au-link{border:0;background:none;color:var(--accent);cursor:pointer;font-size:13px;padding:0}
.au-link:hover{text-decoration:underline}
.au-submit{width:100%;justify-content:center;margin-top:4px;padding:12px}
.au-submit[disabled]{opacity:.6;pointer-events:none}
.au-spin{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:auspin .7s linear infinite}
@keyframes auspin{to{transform:rotate(360deg)}}
.au-msg{font-size:13px;border-radius:8px;padding:0 12px;max-height:0;overflow:hidden;transition:.3s var(--ease)}
.au-msg.show{max-height:120px;padding:10px 12px;margin-top:2px}
.au-msg.err{background:color-mix(in srgb,#d33 12%,transparent);color:#d84a4a}
.au-msg.ok{background:color-mix(in srgb,#2a9d68 14%,transparent);color:#2a9d68}
.au-foot{text-align:center;font-size:13px;color:var(--muted);margin-top:18px}
.au-terms{font-size:11.5px;color:var(--muted);text-align:center;margin-top:14px}
.au-view{animation:auin .35s var(--ease)}
@keyframes auin{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}
.au-shake{animation:aushake .4s}
@keyframes aushake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@media (max-width:520px){.au-btn span{display:none}.au-btn{padding:0 10px}}
`;
document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

const ICON = {
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>`,
  // Biểu tượng chung (chữ G cách điệu đơn sắc), không dùng logo thương hiệu
  google: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 12.2h-7.5"/><path d="M19.6 9A8 8 0 1 0 20 12.2"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>`
};

const slot = document.getElementById("authSlot");
document.body.insertAdjacentHTML("beforeend", `<div class="au-ov" id="auOv" role="dialog" aria-modal="true"><div class="au-modal" id="auModal"></div></div>`);
const ov = document.getElementById("auOv"), modal = document.getElementById("auModal");

let fb = null, user = null, view = "login", pendingHref = null, cfg = {};
const t = k => T(k) || k;
const esc2 = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- Thanh điều hướng ---------- */
function renderSlot() {
  if (!slot) return;
  if (!user) {
    slot.innerHTML = `<button class="au-btn" id="auOpen">${ICON.user}<span>${t("au_login")}</span></button>`;
    slot.querySelector("#auOpen").onclick = () => open("login");
    return;
  }
  const name = user.displayName || user.email.split("@")[0];
  const ini = name.split(/\s+/).map(w => w[0]).slice(-2).join("").toUpperCase();
  const isAdmin = user.emailVerified && (cfg.admins || []).map(e => e.toLowerCase()).includes((user.email || "").toLowerCase());
  const needVerify = user.providerData.some(p => p.providerId === "password") && !user.emailVerified;
  slot.innerHTML = `<div class="au-user">
    <button class="au-avatar" id="auAv" aria-label="${esc2(name)}">${user.photoURL ? `<img src="${esc2(user.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc2(ini)}</button>
    <div class="au-menu" id="auMenu">
      <div class="who"><b>${t("au_hello")}, ${esc2(name)}</b><span>${esc2(user.email)}</span>${needVerify ? `<span class="warn">● ${t("au_verify")}</span>` : ""}</div>
      ${isAdmin ? `<button id="auAdmin">★ ${t("au_admin")}</button>` : ""}
      ${needVerify ? `<button id="auResend">${t("au_resend")}</button>` : ""}
      <a class="au-mi" href="gop-y.html">${document.documentElement.lang === "en" ? "Feedback & bug reports" : "Góp ý & báo lỗi"}</a>
      <button id="auOut">${t("au_logout")}</button>
    </div></div>`;
  const menu = slot.querySelector("#auMenu");
  slot.querySelector("#auAv").onclick = e => { e.stopPropagation(); menu.classList.toggle("open"); };
  const ad = slot.querySelector("#auAdmin"); if (ad) ad.onclick = () => { location.href = "admin.html"; };
  slot.querySelector("#auOut").onclick = async () => { await fb.signOut(fb.auth); toast(t("au_ok_logout")); };
  const rs = slot.querySelector("#auResend");
  if (rs) rs.onclick = async () => { try { await fb.sendEmailVerification(user); toast(t("au_ok_verify")); } catch (e) { toast(errMsg(e)); } };
}
document.addEventListener("click", () => document.getElementById("auMenu")?.classList.remove("open"));

/* ---------- Hộp thoại ---------- */
function fld(id, label, type = "text", ac = "") {
  return `<div class="au-fld"><input id="${id}" type="${type}" placeholder=" " autocomplete="${ac}" required>
    <label for="${id}">${label}</label>${type === "password" ? `<button type="button" class="au-eye" data-eye="${id}" aria-label="show">${ICON.eye}</button>` : ""}</div>`;
}
function renderModal(note) {
  const tabs = view === "reset" ? "" : `<div class="au-tabs ${view === "signup" ? "signup" : ""}" role="tablist">
      <span class="pill"></span>
      <button role="tab" data-v="login" aria-selected="${view === "login"}">${t("au_login")}</button>
      <button role="tab" data-v="signup" aria-selected="${view === "signup"}">${t("au_signup")}</button></div>`;
  let body = "";
  if (view === "login") body = `
    <h3>${t("au_t_login")}</h3><p class="au-sub">${esc2(note || t("au_s_login"))}</p>
    <button class="au-g" data-g>${ICON.google}${t("au_google")}</button>
    <div class="au-sep">${t("au_or")}</div>
    <form class="au-f" data-form="login" novalidate>
      ${fld("auEmail", t("au_email"), "email", "email")}
      ${fld("auPass", t("au_pass"), "password", "current-password")}
      <div class="au-row"><button type="button" class="au-link" data-v="reset">${t("au_forgot")}</button></div>
      <div class="au-msg" id="auMsg"></div>
      <button class="btn primary au-submit" type="submit">${t("au_login")}</button>
    </form>
    <div class="au-foot">${t("au_no_acc")} <button class="au-link" data-v="signup">${t("au_signup")}</button></div>`;
  if (view === "signup") body = `
    <h3>${t("au_t_signup")}</h3><p class="au-sub">${t("au_s_signup")}</p>
    <button class="au-g" data-g>${ICON.google}${t("au_google")}</button>
    <div class="au-sep">${t("au_or")}</div>
    <form class="au-f" data-form="signup" novalidate>
      ${fld("auName", t("au_name"), "text", "name")}
      ${fld("auEmail", t("au_email"), "email", "email")}
      ${fld("auPass", t("au_pass"), "password", "new-password")}
      <div class="au-meter"><i id="auMeter"></i></div>
      ${fld("auPass2", t("au_pass2"), "password", "new-password")}
      <div class="au-msg" id="auMsg"></div>
      <button class="btn primary au-submit" type="submit">${t("au_signup")}</button>
    </form>
    <div class="au-terms">${t("au_terms")}</div>
    <div class="au-foot">${t("au_has_acc")} <button class="au-link" data-v="login">${t("au_login")}</button></div>`;
  if (view === "reset") body = `
    <h3>${t("au_t_reset")}</h3><p class="au-sub">${t("au_s_reset")}</p>
    <form class="au-f" data-form="reset" novalidate>
      ${fld("auEmail", t("au_email"), "email", "email")}
      <div class="au-msg" id="auMsg"></div>
      <button class="btn primary au-submit" type="submit">${t("au_send_reset")}</button>
    </form>
    <div class="au-foot"><button class="au-link" data-v="login">${t("au_back")}</button></div>`;
  modal.innerHTML = `<button class="au-x" aria-label="close" data-close>×</button>${tabs}<div class="au-view">${body}</div>`;
}

function open(v = "login", note) {
  view = v; renderModal(note); ov.classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(() => modal.querySelector("input")?.focus(), 250);
}
function close() { ov.classList.remove("open"); document.body.style.overflow = ""; pendingHref = null; }

function msg(text, type = "err") {
  const m = document.getElementById("auMsg"); if (!m) return;
  m.className = `au-msg ${type} show`; m.textContent = text;
  if (type === "err") { modal.classList.remove("au-shake"); void modal.offsetWidth; modal.classList.add("au-shake"); }
}
const errMsg = e => (I18N[state.lang][e?.code]) || t("e_generic");
function busy(on) {
  const b = modal.querySelector(".au-submit"); if (!b) return;
  b.disabled = on;
  if (on) { b.dataset.txt = b.innerHTML; b.innerHTML = `<span class="au-spin"></span>`; } else if (b.dataset.txt) b.innerHTML = b.dataset.txt;
}

ov.addEventListener("click", e => {
  if (e.target === ov || e.target.closest("[data-close]")) return close();
  const v = e.target.closest("[data-v]");
  if (v) { view = v.dataset.v; renderModal(); setTimeout(() => modal.querySelector("input")?.focus(), 50); return; }
  const eye = e.target.closest("[data-eye]");
  if (eye) { const i = document.getElementById(eye.dataset.eye); i.type = i.type === "password" ? "text" : "password"; return; }
  if (e.target.closest("[data-g]")) googleLogin();
});
ov.addEventListener("input", e => {
  if (e.target.id !== "auPass" || view !== "signup") return;
  const p = e.target.value; let s = 0;
  if (p.length >= 6) s++; if (p.length >= 10) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  const m = document.getElementById("auMeter");
  m.style.width = (p ? Math.max(15, s * 25) : 0) + "%";
  m.style.background = ["#d84a4a", "#d84a4a", "#e0a23a", "#7bb662", "#2a9d68"][s];
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && ov.classList.contains("open")) close(); });

ov.addEventListener("submit", async e => {
  e.preventDefault();
  if (!fb) return msg(t("au_not_ready"));
  const f = e.target.dataset.form, $v = id => (document.getElementById(id)?.value || "").trim();
  const email = $v("auEmail"), pass = document.getElementById("auPass")?.value || "";
  try {
    busy(true);
    if (f === "login") {
      await fb.signInWithEmailAndPassword(fb.auth, email, pass);
      done(t("au_ok_login"));
    } else if (f === "signup") {
      if (pass.length < 6) { busy(false); return msg(t("e_short")); }
      if (pass !== document.getElementById("auPass2").value) { busy(false); return msg(t("e_mismatch")); }
      const cred = await fb.createUserWithEmailAndPassword(fb.auth, email, pass);
      if ($v("auName")) await fb.updateProfile(cred.user, { displayName: $v("auName") });
      fb.auth.languageCode = state.lang;
      await fb.sendEmailVerification(cred.user).catch(() => {});
      renderSlot(); done(t("au_ok_signup"));
    } else if (f === "reset") {
      fb.auth.languageCode = state.lang;
      await fb.sendPasswordResetEmail(fb.auth, email);
      busy(false); msg(t("au_ok_reset"), "ok");
    }
  } catch (err) { busy(false); msg(errMsg(err)); }
});

async function googleLogin() {
  if (!fb) return msg(t("au_not_ready"));
  try {
    const p = new fb.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    await fb.signInWithPopup(fb.auth, p);
    done(t("au_ok_login"));
  } catch (err) { if (err.code !== "auth/cancelled-popup-request") msg(errMsg(err)); }
}

function done(text) {
  const href = pendingHref; close(); toast(text);
  if (href) setTimeout(() => { location.href = href; }, 400);
}

/* ---------- Yêu cầu đăng nhập trước khi tải ---------- */
document.getElementById("grid")?.addEventListener("click", e => {
  const a = e.target.closest("a.btn.primary, .rel-top a");
  if (!a || !cfg.requireLoginToDownload || !fb || user) return;
  const href = a.getAttribute("href"); if (!href || href === "#") return;
  e.preventDefault(); e.stopPropagation();
  open("login", t("au_need_login")); pendingHref = href;
}, true);

/* ---------- Khởi động Firebase ---------- */
window.ptAuthRender = () => { renderSlot(); if (ov.classList.contains("open")) renderModal(); };
renderSlot();

(async () => {
  try {
    const m = await (await fetch("plugins.json", { cache: "no-cache" })).json();
    cfg = m.site?.auth || {};
  } catch (e) {}
  const c = cfg.firebase || {};
  if (!c.apiKey || !c.authDomain) { console.info("[auth] Firebase chưa được cấu hình trong plugins.json"); return; }
  try {
    const [{ initializeApp }, A] = await Promise.all([import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js")]);
    const app = initializeApp(c);
    fb = { ...A, auth: A.getAuth(app) };
    fb.auth.languageCode = state.lang;
    A.onAuthStateChanged(fb.auth, u => { user = u; renderSlot(); document.dispatchEvent(new CustomEvent("pt-auth", { detail: u })); });
  } catch (e) { console.error("[auth]", e); }
})();
