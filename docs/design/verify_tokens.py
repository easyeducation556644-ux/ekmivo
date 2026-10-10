"""Verify the specified solid-color pairs; this is not a rendered UI audit.

Run: python docs/design/verify_tokens.py
Writes CONTRAST-REPORT.md beside this script.
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
css = (ROOT / "tokens.css").read_text(encoding="utf-8")


def parse(block):
    return dict(re.findall(r"--color-([a-z-]+): (#[A-Fa-f0-9]{6});", block))


light = parse(css.split("@media")[0])
dark = parse(css.split(':root[data-theme="dark"] {')[1].split("}")[0])
system_dark = parse(css.split('@media (prefers-color-scheme: dark) {')[1].split("}")[0])
assert dark == system_dark, "Explicit and system dark palettes differ"
assert light.keys() == dark.keys(), "Theme color keys differ"


def luminance(color):
    channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels]
    return sum(v * weight for v, weight in zip(linear, (.2126, .7152, .0722)))


def contrast(fg, bg):
    lower, upper = sorted((luminance(fg), luminance(bg)))
    return (upper + .05) / (lower + .05)


checks = []
surfaces = ("canvas", "surface", "surface-subtle", "surface-raised", "hover", "primary-soft")
for fg in ("text", "text-secondary", "text-muted", "primary"):
    checks.extend((fg, bg, 4.5) for bg in surfaces)
checks.extend(("on-primary", bg, 4.5) for bg in ("primary", "primary-hover"))
checks.extend((s, s + "-bg", 4.5) for s in ("success", "warning", "danger", "info"))
checks.extend(("focus", bg, 3.0) for bg in surfaces)
checks.extend(("control-border", bg, 3.0) for bg in ("canvas", "surface", "surface-subtle", "surface-raised", "hover"))
rows = []
for theme, palette in (("Light", light), ("Dark", dark)):
    for fg, bg, minimum in checks:
        value = contrast(palette[fg], palette[bg])
        assert value >= minimum, f"{theme}: {fg}/{bg} = {value:.4f}, requires {minimum}"
        rows.append((theme, fg, bg, value, minimum))

report = [
    "# Design token contrast report", "",
    "Generated from `tokens.css` by `python docs/design/verify_tokens.py`.", "",
    f"All {len(rows)} specified solid-color pairs pass. Explicit/System dark tokens match; theme keys match.", "",
    "Thresholds: normal text 4.5:1; essential control boundaries/focus 3:1. Assertions use unrounded values. Decorative separator tokens are not essential control borders.", "",
    "This verifies palette pairs only. It does not verify rendered components, alpha compositing, font legibility, focus clipping, keyboard behavior, translations, native apps or overall WCAG conformance.", "",
    "| Theme | Foreground | Background | Ratio | Minimum |",
    "|---|---|---|---:|---:|",
]
report.extend(f"| {t} | `{f}` | `{b}` | {v:.2f}:1 | {m:.1f}:1 |" for t, f, b, v, m in rows)
(ROOT / "CONTRAST-REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")
print(f"PASS: {len(rows)} contrast pairs and theme consistency. Report: docs/design/CONTRAST-REPORT.md")
