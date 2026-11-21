#!/bin/bash
# Dựng trang cho Cloudflare Pages (ptplugin.pages.dev): chép toàn bộ trang, bỏ gói .rbz (> 25 MB) và mã máy chủ.
set -e
rm -rf _site && mkdir _site
tar --exclude=./.git --exclude=./_site --exclude=./server --exclude=./functions --exclude='*.rbz' -cf - . | tar -xf - -C _site
echo "Đã dựng _site: $(find _site -type f | wc -l) tệp"
