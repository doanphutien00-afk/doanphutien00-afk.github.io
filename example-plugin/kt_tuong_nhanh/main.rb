# encoding: UTF-8
require 'sketchup.rb'
require_relative 'updater'

module KTStudio
  module TuongNhanh

    # ---- Chức năng chính của plugin (thay bằng code thật của bạn) ----
    def self.run
      UI.messagebox("#{PLUGIN_NAME} v#{VERSION} đang chạy!")
    end

    unless file_loaded?(__FILE__)
      menu = UI.menu('Extensions').add_submenu(PLUGIN_NAME)
      menu.add_item('Chạy công cụ') { run }
      menu.add_separator
      menu.add_item('Kiểm tra cập nhật…') { Updater.check(silent: false) }

      # Tự kiểm tra ngầm vài giây sau khi mở SketchUp (tối đa 1 lần/ngày)
      UI.start_timer(8, false) { Updater.check(silent: true) }

      file_loaded(__FILE__)
    end

  end
end
