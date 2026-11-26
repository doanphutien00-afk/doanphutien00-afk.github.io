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
  GATE_VERSION = 1 unless defined?(GATE_VERSION)
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

  # { state: :licensed | :trial | :expired | :none, email:, days_left:, exp: }
  def status(product)
    t = Time.now.to_i
    if (p = verify(read(product, 'lic'))) && p['t'] == 'lic' && p['p'] == product && p['d'] == device_id
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
  # Có bản quyền / còn hạn dùng thử → nạp plugin. Chưa có → chỉ hiện menu + nút "Kích hoạt".
  def gate(product, name, main_file)
    @loaded ||= {}
    return true if @loaded[product]
    st = status(product)
    if %i[licensed trial].include?(st[:state])
      @loaded[product] = true
      Sketchup.require(main_file)
      remind_trial(product, name, st) if st[:state] == :trial
      return true
    end
    stub(product, name, main_file, st)
    false
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

  def message(name, st)
    case st[:state]
    when :refresh then "Bản quyền #{name} cần được làm mới.\nMở PT Hub khi có mạng (đăng nhập đúng tài khoản đã mua) để tiếp tục sử dụng."
    when :expired then "Đã hết 3 ngày dùng thử #{name}.\nMua bản quyền (vĩnh viễn, dùng trên 2 máy) để tiếp tục sử dụng."
    else "#{name} chưa được kích hoạt trên máy này.\nMở PT Hub để dùng thử 3 ngày hoặc kích hoạt bản quyền đã mua."
    end
  end

  def stub(product, name, main_file, st)
    @stubs ||= {}
    return if @stubs[product]
    @stubs[product] = true
    act = proc do
      if gate(product, name, main_file)
        UI.messagebox("#{name} đã được kích hoạt và sẵn sàng sử dụng.")
      else
        r = UI.messagebox("#{message(name, status(product))}\n\nCó = Mở PT Hub / mua bản quyền    Không = Để sau", MB_YESNO)
        open_hub(product) if r == IDYES
      end
    end
    cmd = UI::Command.new("#{name} – Kích hoạt bản quyền") { act.call }
    cmd.tooltip = "#{name} – Kích hoạt bản quyền"
    cmd.status_bar_text = message(name, st).tr("\n", ' ')
    UI.menu('Extensions').add_item(cmd)
    tb = UI::Toolbar.new("#{name} (chưa kích hoạt)")
    tb.add_item(cmd)
    tb.show if tb.get_last_state != TB_HIDDEN
  rescue StandardError => e
    puts "PTLicense stub: #{e.message}"
  end
end
