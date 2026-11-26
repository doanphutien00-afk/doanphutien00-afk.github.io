/* PT Plugins – đọc / ghi gói .rbz (ZIP) trong trình duyệt và tự gắn khoá bản quyền cho plugin trả phí.
   Dùng ở admin.html; chạy được cả trong Node ≥ 18 để kiểm tra (globalThis.RbzGate). */
(function (G) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

  /* Đọc danh mục ZIP: mỗi mục giữ nguyên dữ liệu nén để ghi lại không cần giải nén */
  function read(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let eocd = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("Tệp không phải gói .rbz (ZIP) hợp lệ");
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true); const out = [];
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("Gói .rbz bị hỏng (danh mục ZIP)");
      const e = { vmade: dv.getUint16(p + 4, true), flags: dv.getUint16(p + 8, true), meth: dv.getUint16(p + 10, true), time: dv.getUint16(p + 12, true), date: dv.getUint16(p + 14, true),
        crc: dv.getUint32(p + 16, true), csz: dv.getUint32(p + 20, true), usz: dv.getUint32(p + 24, true), ext: dv.getUint32(p + 38, true) };
      const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      e.nameBytes = u8.slice(p + 46, p + 46 + nl); e.name = dec.decode(e.nameBytes);
      const ds = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
      e.data = u8.subarray(ds, ds + e.csz);
      out.push(e); p += 46 + nl + xl + cl;
    }
    return out;
  }
  async function text(e) {
    if (e.meth === 0) return dec.decode(e.data);
    if (e.meth !== 8) throw new Error("Kiểu nén không hỗ trợ: " + e.name);
    const ab = await new Response(new Blob([e.data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
    return dec.decode(ab);
  }
  function fileEntry(name, str, like) {
    const data = enc.encode(str);
    return { vmade: 20, flags: 0x800, meth: 0, time: like ? like.time : 0, date: like ? like.date : 0x21, crc: crc32(data), csz: data.length, usz: data.length,
      ext: 0x81A40000, nameBytes: enc.encode(name), name, data };
  }
  /* Ghi ZIP mới (dữ liệu nén của mục cũ chép nguyên, mục mới lưu không nén) */
  function write(entries) {
    let size = 22; for (const e of entries) size += 30 + e.nameBytes.length + e.data.length + 46 + e.nameBytes.length;
    const out = new Uint8Array(size), dv = new DataView(out.buffer); let p = 0; const offs = [];
    for (const e of entries) {
      offs.push(p); const fl = e.flags & ~8;
      dv.setUint32(p, 0x04034b50, true); dv.setUint16(p + 4, 20, true); dv.setUint16(p + 6, fl, true); dv.setUint16(p + 8, e.meth, true);
      dv.setUint16(p + 10, e.time, true); dv.setUint16(p + 12, e.date, true); dv.setUint32(p + 14, e.crc, true); dv.setUint32(p + 18, e.csz, true); dv.setUint32(p + 22, e.usz, true);
      dv.setUint16(p + 26, e.nameBytes.length, true); dv.setUint16(p + 28, 0, true); out.set(e.nameBytes, p + 30); p += 30 + e.nameBytes.length;
      out.set(e.data, p); p += e.data.length;
    }
    const cd = p;
    entries.forEach((e, i) => {
      dv.setUint32(p, 0x02014b50, true); dv.setUint16(p + 4, e.vmade || 20, true); dv.setUint16(p + 6, 20, true); dv.setUint16(p + 8, e.flags & ~8, true); dv.setUint16(p + 10, e.meth, true);
      dv.setUint16(p + 12, e.time, true); dv.setUint16(p + 14, e.date, true); dv.setUint32(p + 16, e.crc, true); dv.setUint32(p + 20, e.csz, true); dv.setUint32(p + 24, e.usz, true);
      dv.setUint16(p + 28, e.nameBytes.length, true); dv.setUint16(p + 30, 0, true); dv.setUint16(p + 32, 0, true); dv.setUint16(p + 34, 0, true); dv.setUint16(p + 36, 0, true);
      dv.setUint32(p + 38, e.ext >>> 0, true); dv.setUint32(p + 42, offs[i], true); out.set(e.nameBytes, p + 46); p += 46 + e.nameBytes.length;
    });
    dv.setUint32(p, 0x06054b50, true); dv.setUint16(p + 8, entries.length, true); dv.setUint16(p + 10, entries.length, true);
    dv.setUint32(p + 12, p - cd, true); dv.setUint32(p + 16, cd, true);
    return out;
  }

  /* Gắn khoá bản quyền: thêm <mã>/pt_license.rb + <mã>/pt_gate.rb, tệp nạp trỏ sang pt_gate.
     Trả về { buf, gated:true, already:true } nếu gói đã có khoá. */
  async function gate(buf, id, name, licenseRb) {
    const ents = read(buf);
    const loader = ents.find(e => e.name === id + ".rb");
    if (!loader) throw new Error(`Không thấy tệp nạp ${id}.rb ở gốc gói`);
    let src = await text(loader);
    if (ents.some(e => e.name === `${id}/pt_gate.rb`) && /['"\/]pt_gate['"]/.test(src)) return { buf: new Uint8Array(buf), already: true };
    const lines = src.split("\n"), li = lines.findIndex(l => /SketchupExtension\.new\s*\(/.test(l));
    if (li < 0) throw new Error("Không thấy SketchupExtension.new trong tệp nạp – không gắn được khoá bản quyền");
    // chuỗi cuối cùng trong lệnh SketchupExtension.new(...) là tệp chính; đổi phần cuối đường dẫn thành pt_gate
    let call = lines[li], j = li; while (!/\)\s*(#.*)?$/.test(call) && j + 1 < lines.length && j - li < 4) call += "\n" + lines[++j];
    const lits = [...call.matchAll(/(['"])([^'"]*?)\1/g)];
    if (lits.length < 1) throw new Error("Không đọc được tệp chính trong SketchupExtension.new");
    const last = lits[lits.length - 1], target = last[2].split("/").pop().replace(/\.rb$/i, "");
    if (!target || target === "pt_gate") throw new Error("Không xác định được tệp chính của plugin");
    if (!ents.some(e => e.name === `${id}/${target}.rb` || e.name === `${id}/${target}.rbe` || e.name === `${id}/${target}.rbs`))
      throw new Error(`Không thấy tệp chính ${id}/${target}.rb trong gói`);
    const newLit = last[1] + last[2].replace(/[^/]*$/, "pt_gate") + last[1];
    const at = last.index, fixed = call.slice(0, at) + newLit + call.slice(at + last[0].length);
    const outLines = [...lines.slice(0, li), ...fixed.split("\n"), ...lines.slice(j + 1)];
    const gateRb = `# Khoá bản quyền PT Plugins (tự gắn khi đăng trên trang quản trị) – không sửa / xoá tệp này\nrequire_relative 'pt_license'\nPTLicense.gate('${id}', '${String(name).replace(/'/g, "\\'")}', File.join(__dir__, '${target}'))\n`;
    const keep = ents.filter(e => e !== loader && e.name !== `${id}/pt_gate.rb` && e.name !== `${id}/pt_license.rb`);
    const nl = fileEntry(loader.name, outLines.join("\n"), loader);
    const out = write([nl, ...keep, fileEntry(`${id}/pt_license.rb`, licenseRb, loader), fileEntry(`${id}/pt_gate.rb`, gateRb, loader)]);
    return { buf: out, gated: true, target };
  }

  G.RbzGate = { read, write, text, gate, crc32 };
})(typeof window !== "undefined" ? window : globalThis);
