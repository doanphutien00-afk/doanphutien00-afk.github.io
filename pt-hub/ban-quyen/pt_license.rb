# encoding: UTF-8
# =====================================================================
#  PT License – kiểm tra bản quyền PT Plugins (dùng chung cho mọi plugin trả phí).
#  Token do PT Hub nhận từ máy chủ bản quyền và lưu tại %APPDATA%/PT_Plugins/license/<mã>.lic | .trial
#  Chữ ký ECDSA P-256 – kiểm tra offline bằng khoá công khai bên dưới.
# =====================================================================
require 'json'
require 'base64'
require 'digest'
require 'openssl'

module PTLicense
  GATE_VERSION = 2 unless defined?(GATE_VERSION)
  unless defined?(PUBLIC_KEY)
    PUBLIC_KEY = <<~PEM.freeze
      -----BEGIN PUBLIC KEY-----
      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAENY94nhGI0f+BnEvX+zFmN7PL/qsg
      hIowO0AVfta0GPwHxT+F2Ls86o0vNXJDuTKU4MdCwn81akniupjxT/hxyA==
      -----END PUBLIC KEY-----
    PEM
    SITE = 'https://ptplugin.pages.dev'.freeze
  end

  module_function

  def dir
    base = ENV['APPDATA'].to_s.empty? ? File.join(Dir.home, 'Library', 'Application Support') : ENV['APPDATA']
    File.join(base, 'PT_Plugins', 'license')
  end

  # Mã máy: Windows → MachineGuid (đổi khi cài lại Windows); macOS → IOPlatformUUID.
  def device_id
    @device_id ||= begin
      raw = nil
      if RUBY_PLATFORM =~ /mswin|mingw|cygwin/
        begin
          require 'win32/registry'
          Win32::Registry::HKEY_LOCAL_MACHINE.open('SOFTWARE\\Microsoft\\Cryptography', Win32::Registry::KEY_READ | 0x0100) { |r| raw = r['MachineGuid'] }
        rescue StandardError
          raw = nil
        end
      else
        begin
          raw = `ioreg -rd1 -c IOPlatformExpertDevice 2>/dev/null`[/"IOPlatformUUID" = "([^"]+)"/, 1]
        rescue StandardError
          raw = nil
        end
      end
      raw = "#{ENV['COMPUTERNAME'] || ENV['HOSTNAME']}|#{Dir.home}" if raw.to_s.empty?
      Digest::SHA256.hexdigest("pt-device|#{raw.to_s.strip.downcase}")[0, 32]
    end
  end

  def device_name
    (ENV['COMPUTERNAME'] || ENV['HOSTNAME'] || 'May tinh').to_s[0, 60]
  end

  def b64u(s)
    Base64.urlsafe_decode64(s + '=' * ((4 - s.size % 4) % 4))
  end

  # Trả về payload (Hash) nếu chữ ký đúng, ngược lại nil.
  def verify(token)
    data, sig = token.to_s.strip.split('.', 2)
    return nil unless data && sig
    raw = b64u(sig)
    return nil unless raw.bytesize == 64
    der = OpenSSL::ASN1::Sequence.new([OpenSSL::ASN1::Integer.new(OpenSSL::BN.new(raw[0, 32], 2)),
                                       OpenSSL::ASN1::Integer.new(OpenSSL::BN.new(raw[32, 32], 2))]).to_der
    key = OpenSSL::PKey.read(PUBLIC_KEY)
    return nil unless key.verify(OpenSSL::Digest.new('SHA256'), der, data)
    JSON.parse(b64u(data).force_encoding('UTF-8'))
  rescue StandardError
    nil
  end

  def read(product, kind)
    f = File.join(dir, "#{product}.#{kind}")
    File.file?(f) ? File.read(f).strip : nil
  rescue StandardError
    nil
  end

  # Tài khoản PT Hub đang đăng nhập (PT Hub ghi vào _account). Token của tài khoản khác không có giá trị.
  def account
    a = read('_account', 'txt').to_s.strip.downcase
    a.empty? ? nil : a
  end

  # Lý do chưa dùng được do tài khoản: 'unowned' (chưa mua) | 'inactive' (chưa kích hoạt máy này) | 'revoked' (máy đã bị gỡ)
  def acct_mark(product)
    m = read(product, 'acct').to_s.strip
    %w[unowned inactive revoked].include?(m) ? m : nil
  end

  # { state: :licensed | :trial | :expired | :none, email:, days_left:, exp: }
  def status(product)
    t = Time.now.to_i
    if (p = verify(read(product, 'lic'))) && p['t'] == 'lic' && p['p'] == product && p['d'] == device_id &&
       (account.nil? || p['e'].to_s.downcase == account)
      return { state: :licensed, email: p['e'], exp: p['exp'] } if p['exp'].to_i > t
      return { state: :refresh, email: p['e'], exp: p['exp'] }
    end
    if (p = verify(read(product, 'trial'))) && p['t'] == 'trial' && p['p'] == product && p['d'] == device_id
      left = ((p['exp'].to_i - t) / 86_400.0).ceil
      return { state: :trial, days_left: left, exp: p['exp'] } if left > 0
      return { state: :expired, exp: p['exp'] }
    end
    return { state: :expired } if File.file?(File.join(dir, "#{product}.trial_expired"))
    { state: :none }
  end

  def ok?(product)
    %i[licensed trial].include?(status(product)[:state])
  end

  def buy_url(product)
    "#{SITE}/mua.html?p=#{product}"
  end

  # Mở bảng bản quyền của PT Hub nếu có, không thì trang mua.
  def open_hub(product)
    if defined?(PTHub) && PTHub.respond_to?(:show_license)
      PTHub.show_license(product)
    else
      UI.openURL(buy_url(product))
    end
  end

  # Gắn vào tệp nạp của plugin:
  #   PTLicense.gate('pt_cabinet', 'PT Cabinet', File.join(__dir__, 'main'))
  # Plugin luôn được nạp (giữ nguyên thanh công cụ, icon, menu). Khi chưa có bản quyền / hết dùng thử,
  # mọi nút lệnh do plugin tạo chỉ hiện thông báo, và tự chạy bình thường ngay khi được kích hoạt (không cần mở lại SketchUp).
  def gate(product, name, main_file)
    @loaded ||= {}
    @names ||= {}
    return true if @loaded[product]
    @loaded[product] = true
    @names[product] = name
    st = status(product)
    ok = %i[licensed trial].include?(st[:state])
    prev = @locking
    @locking = product
    begin
      Sketchup.require(main_file)
    ensure
      @locking = prev
    end
    remind_trial(product, name, st) if st[:state] == :trial
    ok
  end

  # Mã plugin đang được nạp qua gate (CmdLock dùng để bọc lệnh).
  def locking
    @locking
  end

  def allowed?(product)
    %i[licensed trial].include?(status(product)[:state])
  end

  # Hộp thông báo khi bấm nút lệnh mà chưa có quyền.
  def deny(product)
    name = (@names || {})[product] || product
    @msg_product = product
    mk = acct_mark(product)
    r = UI.messagebox("#{message(name, status(product), product)}\n\nCó = #{mk == 'revoked' ? 'Kích hoạt cho máy này' : (mk == 'unowned' ? 'Mua bản quyền' : 'Mở PT Hub')}    Không = Để sau", MB_YESNO)
    return unless r == IDYES
    if mk == 'revoked' && defined?(PTHub) && PTHub.respond_to?(:activate_here)
      PTHub.activate_here(product)
    elsif mk == 'unowned'
      UI.openURL(buy_url(product))
    else
      open_hub(product)
    end
  end

  def remind_trial(product, name, st)
    key = "trial_seen_#{product}"
    today = Time.now.strftime('%Y-%m-%d')
    return if Sketchup.read_default('PT_License', key, '') == today
    Sketchup.write_default('PT_License', key, today)
    UI.start_timer(6, false) do
      Sketchup.status_text = "#{name}: còn #{st[:days_left]} ngày dùng thử – mua bản quyền trong PT Hub"
    end
  end

  def message(name, st, product = nil)
    case acct_mark(product || @msg_product || '')
    when 'unowned' then return "Tài khoản này chưa có bản quyền #{name}.\nMua bản quyền để sử dụng."
    when 'revoked' then return "Máy này đã gỡ bản quyền #{name}.\nBạn muốn dùng 1 suất còn trống để kích hoạt bản quyền #{name} cho máy này không?"
    when 'inactive' then return "Tài khoản đã mua #{name} nhưng chưa kích hoạt ở máy này.\nBấm nút \"Kích hoạt ở máy này\" trong PT Hub."
    end
    case st[:state]
    when :refresh then "Bản quyền #{name} cần được làm mới.\nMở PT Hub khi có mạng (đăng nhập đúng tài khoản đã mua) để tiếp tục sử dụng."
    when :expired then "Đã hết 3 ngày dùng thử #{name}.\nMua bản quyền (vĩnh viễn, dùng trên 2 máy) để tiếp tục sử dụng."
    else "#{name} chưa được kích hoạt trên máy này.\nMở PT Hub để dùng thử 3 ngày hoặc kích hoạt bản quyền đã mua."
    end
  end
end

# Bọc lệnh (UI::Command) tạo trong lúc plugin được nạp qua PTLicense.gate: chỉ chạy khi có bản quyền / còn dùng thử.
module PTLicenseCmdLock
  def initialize(*args, &blk)
    prod = PTLicense.respond_to?(:locking) ? PTLicense.locking : nil
    if prod && blk
      orig = blk
      blk = proc do |*a|
        if PTLicense.allowed?(prod)
          orig.call(*a)
        else
          PTLicense.deny(prod)
        end
      end
    end
    super(*args, &blk)
  end
end
if defined?(UI::Command) && !UI::Command.ancestors.include?(PTLicenseCmdLock)
  UI::Command.send(:prepend, PTLicenseCmdLock)
end
