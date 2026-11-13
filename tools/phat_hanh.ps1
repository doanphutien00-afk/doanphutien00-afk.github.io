# =====================================================================
#  ĐÓNG GÓI & PHÁT HÀNH PLUGIN LÊN GITHUB (chạy trên Windows PowerShell)
#
#  Cách dùng (trong thư mục chứa file loader .rb và thư mục con):
#    .\phat_hanh.ps1 -Loader kt_tuong_nhanh.rb -Notes "- Thêm tính năng X`n- Sửa lỗi Y"
#
#  Script sẽ: đọc PLUGIN_ID + VERSION trong file loader -> nén thành .rbz
#  -> (nếu đã cài GitHub CLI "gh") tạo Release tag <id>-v<version> và upload.
# =====================================================================
param(
  [Parameter(Mandatory=$true)][string]$Loader,
  [string]$Notes = "",
  [string]$Repo = "doanphutien00-afk/sketchup-plugins"
)
$ErrorActionPreference = "Stop"

$src = Get-Content $Loader -Raw -Encoding UTF8
$id  = [regex]::Match($src, "PLUGIN_ID\s*=\s*'([^']+)'").Groups[1].Value
$ver = [regex]::Match($src, "VERSION\s*=\s*'([^']+)'").Groups[1].Value
if (-not $id -or -not $ver) { throw "Không tìm thấy PLUGIN_ID / VERSION trong $Loader" }

$folder = [IO.Path]::GetFileNameWithoutExtension($Loader)
$out    = "$id-$ver.rbz"
$zip    = "$id-$ver.zip"
if (Test-Path $zip) { Remove-Item $zip }
if (Test-Path $out) { Remove-Item $out }
Compress-Archive -Path $Loader, $folder -DestinationPath $zip
Rename-Item $zip $out
Write-Host "Đã đóng gói: $out" -ForegroundColor Green

if (Get-Command gh -ErrorAction SilentlyContinue) {
  $tag = "$id-v$ver"
  gh release create $tag $out --repo $Repo --title "$id v$ver" --notes $Notes
  Write-Host "Đã phát hành $tag — website và plugin sẽ tự nhận bản mới." -ForegroundColor Green
} else {
  Write-Host "Chưa cài GitHub CLI. Hãy upload $out thủ công trên GitHub > Releases (tag: $id-v$ver)." -ForegroundColor Yellow
}
