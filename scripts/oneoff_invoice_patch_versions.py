from pathlib import Path

replacements = {
    'js/supabase-config.js': [
        ('js/pasha-arabic-only.js?v=1.4', 'js/pasha-arabic-only.js?v=1.5'),
    ],
    'scripts/predeploy-check.mjs': [
        ('js/pasha-arabic-only.js?v=1.4', 'js/pasha-arabic-only.js?v=1.5'),
    ],
}

for name, reps in replacements.items():
    path = Path(name)
    text = path.read_text(encoding='utf-8')
    for old, new in reps:
        assert old in text, f'{name}: missing {old}'
        text = text.replace(old, new)
    path.write_text(text, encoding='utf-8')
