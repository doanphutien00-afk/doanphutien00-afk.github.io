# encoding: UTF-8
# =====================================================================
#  TỰ ĐỘNG CẬP NHẬT từ GitHub Releases (doanphutien00-afk/doanphutien00-afk.github.io)
#  Kiểm tra tối đa 1 lần/ngày khi mở SketchUp + menu "Kiểm tra cập nhật…".
#  Phát hành bản mới: tạo Release có tag "tuong_nhanh-v<phiên bản>" kèm file .rbz
# =====================================================================
require 'json'
require 'net/http'
require 'uri'
require 'tmpdir'

module KTStudio
module TuongNhanh
    module Updater
      GITHUB_OWNER = 'doanphutien00-afk'.freeze
      GITHUB_REPO  = 'doanphutien00-afk.github.io'.freeze
      PLUGIN_ID    = 'tuong_nhanh'.freeze
      PLUGIN_NAME  = 'Tường Nhanh'.freeze
      CURRENT_VERSION = TuongNhanh::VERSION
      CHECK_EVERY_HOURS = 24
      PREF_KEY = "PTUpdater_#{PLUGIN_ID}".freeze
      API_URL  = "https://api.github.com/repos/#{GITHUB_OWNER}/#{GITHUB_REPO}/releases?per_page=100".freeze
      TAG_RE   = /\A#{Regexp.escape(PLUGIN_ID)}-v(\d+(?:\.\d+)*)\z/

      # silent: true  = kiểm tra ngầm, không báo gì nếu đã là bản mới nhất
      # silent: false = người dùng bấm menu, luôn báo kết quả
      def self.check(silent: true)
        return if @busy
        if silent
          last = Sketchup.read_default(PREF_KEY, 'last_check', 0).to_i
          return if Time.now.to_i - last < CHECK_EVERY_HOURS * 3600
        end
        @busy = true
        Sketchup.write_default(PREF_KEY, 'last_check', Time.now.to_i)

        @request = Sketchup::Http::Request.new(API_URL, Sketchup::Http::GET)
        @request.headers = {
          'Accept'     => 'application/vnd.github+json',
          'User-Agent' => "SketchUp-#{PLUGIN_ID}-Updater"
        }
        @request.start do |_req, res|
          begin
            handle_response(res, silent)
          ensure
            @busy = false
          end
        end
      rescue StandardError => e
        @busy = false
        UI.messagebox("Không kiểm tra được cập nhật:\n#{e.message}") unless silent
      end

      def self.handle_response(res, silent)
        unless res.status_code == 200
          UI.messagebox("Máy chủ cập nhật trả về lỗi #{res.status_code}.") unless silent
          return
        end
        latest = find_latest(JSON.parse(res.body))

        if latest.nil? || !newer?(latest[:version], CURRENT_VERSION)
          UI.messagebox("#{PLUGIN_NAME} v#{CURRENT_VERSION} đã là bản mới nhất.") unless silent
          return
        end
        if silent && Sketchup.read_default(PREF_KEY, 'skip_version', '') == latest[:version]
          return
        end

        notes = latest[:notes].gsub(/^#+\s*/, '').strip
        notes = notes[0, 600] + '…' if notes.length > 600
        msg = "Đã có #{PLUGIN_NAME} v#{latest[:version]} (bạn đang dùng v#{CURRENT_VERSION}).\n\n" \
              "#{notes}\n\n" \
              "Có  = Cập nhật ngay\nKhông = Nhắc lại sau\nHủy  = Bỏ qua phiên bản này"
        case UI.messagebox(msg, MB_YESNOCANCEL)
        when IDYES    then install(latest)
        when IDCANCEL then Sketchup.write_default(PREF_KEY, 'skip_version', latest[:version])
        end
      rescue StandardError => e
        UI.messagebox("Lỗi đọc thông tin cập nhật:\n#{e.message}") unless silent
      end

      # Tìm release mới nhất có tag dạng "<plugin_id>-vX.Y.Z" và có file .rbz
      def self.find_latest(releases)
        best = nil
        Array(releases).each do |r|
          next if r['draft'] || r['prerelease']
          m = r['tag_name'].to_s.match(TAG_RE)
          next unless m
          asset = Array(r['assets']).find { |a| a['name'].to_s.downcase.end_with?('.rbz') }
          next unless asset
          if best.nil? || newer?(m[1], best[:version])
            best = { version: m[1], notes: r['body'].to_s,
                     url: asset['browser_download_url'], page: r['html_url'] }
          end
        end
        best
      end

      def self.newer?(a, b)
        pa = a.to_s.split('.').map(&:to_i)
        pb = b.to_s.split('.').map(&:to_i)
        n = [pa.size, pb.size].max
        ((pa + [0] * n).first(n) <=> (pb + [0] * n).first(n)) > 0
      end

      def self.install(latest)
        Sketchup.status_text = "Đang tải #{PLUGIN_NAME} v#{latest[:version]}…"
        data = download(latest[:url])
        path = File.join(Dir.tmpdir, "#{PLUGIN_ID}-#{latest[:version]}.rbz")
        File.binwrite(path, data)
        begin
          Sketchup.install_from_archive(path)
          UI.messagebox("Đã cập nhật #{PLUGIN_NAME} lên v#{latest[:version]}.\n" \
                        'Hãy khởi động lại SketchUp để dùng bản mới.')
        rescue Interrupt
          # người dùng bấm Hủy ở hộp thoại cài đặt của SketchUp
        end
      rescue StandardError => e
        if UI.messagebox("Tự cập nhật thất bại:\n#{e.message}\n\nMở trang tải thủ công?", MB_YESNO) == IDYES
          UI.openURL(latest[:page])
        end
      ensure
        Sketchup.status_text = ''
      end

      # Tải file, tự đi theo chuyển hướng (GitHub chuyển link tải sang máy chủ khác)
      def self.download(url, limit = 6)
        raise 'Quá nhiều lần chuyển hướng' if limit <= 0
        uri  = URI.parse(url)
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = (uri.scheme == 'https')
        http.open_timeout = 20
        http.read_timeout = 180
        res = http.request(Net::HTTP::Get.new(uri.request_uri, 'User-Agent' => "SketchUp-#{PLUGIN_ID}-Updater"))
        case res
        when Net::HTTPSuccess     then res.body
        when Net::HTTPRedirection then download(URI.join(url, res['location']).to_s, limit - 1)
        else raise "HTTP #{res.code}"
        end
      end
    end
end
end
