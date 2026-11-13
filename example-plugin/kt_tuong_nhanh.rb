# encoding: UTF-8
# File nạp (loader) của plugin — đặt ngay trong thư mục Plugins của SketchUp.
# Mỗi lần phát hành bản mới: CHỈ cần tăng VERSION ở đây.

require 'sketchup.rb'
require 'extensions.rb'

module KTStudio
  module TuongNhanh
    PLUGIN_ID   = 'tuong_nhanh'.freeze # phải trùng "id" trong plugins.json và tag GitHub
    PLUGIN_NAME = 'Tường Nhanh'.freeze
    VERSION     = '1.0.0'.freeze

    unless file_loaded?(__FILE__)
      ex = SketchupExtension.new(PLUGIN_NAME, File.join(__dir__, 'kt_tuong_nhanh', 'main'))
      ex.version     = VERSION
      ex.creator     = 'KT Studio'
      ex.copyright   = "© #{Time.now.year} KT Studio"
      ex.description = 'Dựng tường nhanh từ đường line.'
      Sketchup.register_extension(ex, true)
      file_loaded(__FILE__)
    end
  end
end
