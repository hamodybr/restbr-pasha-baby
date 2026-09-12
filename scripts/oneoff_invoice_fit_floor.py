from pathlib import Path

path = Path('js/admin-orders-customers.js')
text = path.read_text(encoding='utf-8')
old = "          const scale = Math.max(.35, Math.min(1, targetHeight / contentHeight, targetWidth / contentWidth));"
new = "          const rawScale = Math.min(1, targetHeight / contentHeight, targetWidth / contentWidth);\n          const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;"
assert old in text, 'one-page scale anchor missing'
path.write_text(text.replace(old, new, 1), encoding='utf-8')
