#!/bin/bash
# 林美園藝官網 → GitHub Pages 預覽站
#
# 為什麼需要這支腳本：
# 原始碼裡的連結一律寫成 /works/、/assets/site.css 這種根目錄絕對路徑，
# 因為將來綁上 linmei.com.tw 時那才是正確寫法。
# 但 GitHub Pages 的預覽網址多了一層 /linmei-website/，直接推上去所有連結會 404。
# 所以這裡複製一份、把絕對路徑補上前綴、再推到 gh-pages 分支。原始碼保持乾淨。
#
# 用法：./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

BASE="/linmei-website"
OUT="_build"

rm -rf "$OUT"
mkdir -p "$OUT"
rsync -a --exclude '.git' --exclude "$OUT" --exclude 'deploy.sh' --exclude '*.md' ./ "$OUT/"

# 1) 內部絕對路徑補上 Pages 的子目錄前綴（外部 https:// 連結不受影響）
find "$OUT" -name '*.html' -print0 | xargs -0 sed -i '' -E \
  -e "s#(href|src)=\"/#\1=\"$BASE/#g"

# 2) 這還是 demo：擋掉搜尋引擎，避免示意數字被收錄、也不跟日後正式站搶排名
find "$OUT" -name '*.html' -print0 | xargs -0 sed -i '' \
  -e 's|<meta charset="utf-8">|<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">|'

cat > "$OUT/robots.txt" <<'EOF'
# 預覽站，尚未上線。正式站上線後這裡會改回允許收錄。
User-agent: *
Disallow: /
EOF

# 3) 推上 gh-pages
cd "$OUT"
git init -q
git checkout -qb gh-pages
git add -A
git -c user.email=ted4684549@gmail.com -c user.name=Ted commit -qm "deploy $(date '+%Y-%m-%d %H:%M')"
git remote add origin "$(cd .. && git remote get-url origin)"
git push -qf origin gh-pages
cd ..
rm -rf "$OUT"

echo "✅ 已部署 → https://qingpu28565675.github.io$BASE/"
