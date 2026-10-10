# Design token contrast report

Generated from `tokens.css` by the same palette logic as `python docs/design/verify_tokens.py`.

All 82 specified solid-color pairs pass. Explicit/System dark tokens match; theme keys match.

Thresholds: normal text 4.5:1; essential control boundaries/focus 3:1. Assertions use unrounded values. Decorative separator tokens are not essential control borders.

This verifies palette pairs only. It does not verify rendered components, alpha compositing, font legibility, focus clipping, keyboard behavior, translations, native apps or overall WCAG conformance.

| Theme | Foreground | Background | Ratio | Minimum |
|---|---|---|---:|---:|
| Light | `text` | `canvas` | 14.63:1 | 4.5:1 |
| Light | `text` | `surface` | 15.67:1 | 4.5:1 |
| Light | `text` | `surface-subtle` | 13.81:1 | 4.5:1 |
| Light | `text` | `surface-raised` | 15.67:1 | 4.5:1 |
| Light | `text` | `hover` | 13.29:1 | 4.5:1 |
| Light | `text` | `primary-soft` | 13.89:1 | 4.5:1 |
| Light | `text-secondary` | `canvas` | 7.38:1 | 4.5:1 |
| Light | `text-secondary` | `surface` | 7.91:1 | 4.5:1 |
| Light | `text-secondary` | `surface-subtle` | 6.97:1 | 4.5:1 |
| Light | `text-secondary` | `surface-raised` | 7.91:1 | 4.5:1 |
| Light | `text-secondary` | `hover` | 6.71:1 | 4.5:1 |
| Light | `text-secondary` | `primary-soft` | 7.01:1 | 4.5:1 |
| Light | `text-muted` | `canvas` | 5.47:1 | 4.5:1 |
| Light | `text-muted` | `surface` | 5.86:1 | 4.5:1 |
| Light | `text-muted` | `surface-subtle` | 5.17:1 | 4.5:1 |
| Light | `text-muted` | `surface-raised` | 5.86:1 | 4.5:1 |
| Light | `text-muted` | `hover` | 4.97:1 | 4.5:1 |
| Light | `text-muted` | `primary-soft` | 5.20:1 | 4.5:1 |
| Light | `primary` | `canvas` | 5.58:1 | 4.5:1 |
| Light | `primary` | `surface` | 5.98:1 | 4.5:1 |
| Light | `primary` | `surface-subtle` | 5.27:1 | 4.5:1 |
| Light | `primary` | `surface-raised` | 5.98:1 | 4.5:1 |
| Light | `primary` | `hover` | 5.07:1 | 4.5:1 |
| Light | `primary` | `primary-soft` | 5.30:1 | 4.5:1 |
| Light | `on-primary` | `primary` | 5.98:1 | 4.5:1 |
| Light | `on-primary` | `primary-hover` | 8.11:1 | 4.5:1 |
| Light | `success` | `success-bg` | 5.58:1 | 4.5:1 |
| Light | `warning` | `warning-bg` | 6.47:1 | 4.5:1 |
| Light | `danger` | `danger-bg` | 6.06:1 | 4.5:1 |
| Light | `info` | `info-bg` | 6.11:1 | 4.5:1 |
| Light | `focus` | `canvas` | 5.58:1 | 3.0:1 |
| Light | `focus` | `surface` | 5.98:1 | 3.0:1 |
| Light | `focus` | `surface-subtle` | 5.27:1 | 3.0:1 |
| Light | `focus` | `surface-raised` | 5.98:1 | 3.0:1 |
| Light | `focus` | `hover` | 5.07:1 | 3.0:1 |
| Light | `focus` | `primary-soft` | 5.30:1 | 3.0:1 |
| Light | `control-border` | `canvas` | 3.96:1 | 3.0:1 |
| Light | `control-border` | `surface` | 4.24:1 | 3.0:1 |
| Light | `control-border` | `surface-subtle` | 3.73:1 | 3.0:1 |
| Light | `control-border` | `surface-raised` | 4.24:1 | 3.0:1 |
| Light | `control-border` | `hover` | 3.59:1 | 3.0:1 |
| Dark | `text` | `canvas` | 16.91:1 | 4.5:1 |
| Dark | `text` | `surface` | 14.05:1 | 4.5:1 |
| Dark | `text` | `surface-subtle` | 11.33:1 | 4.5:1 |
| Dark | `text` | `surface-raised` | 11.33:1 | 4.5:1 |
| Dark | `text` | `hover` | 8.97:1 | 4.5:1 |
| Dark | `text` | `primary-soft` | 10.00:1 | 4.5:1 |
| Dark | `text-secondary` | `canvas` | 11.36:1 | 4.5:1 |
| Dark | `text-secondary` | `surface` | 9.44:1 | 4.5:1 |
| Dark | `text-secondary` | `surface-subtle` | 7.61:1 | 4.5:1 |
| Dark | `text-secondary` | `surface-raised` | 7.61:1 | 4.5:1 |
| Dark | `text-secondary` | `hover` | 6.02:1 | 4.5:1 |
| Dark | `text-secondary` | `primary-soft` | 6.72:1 | 4.5:1 |
| Dark | `text-muted` | `canvas` | 9.58:1 | 4.5:1 |
| Dark | `text-muted` | `surface` | 7.96:1 | 4.5:1 |
| Dark | `text-muted` | `surface-subtle` | 6.42:1 | 4.5:1 |
| Dark | `text-muted` | `surface-raised` | 6.42:1 | 4.5:1 |
| Dark | `text-muted` | `hover` | 5.08:1 | 4.5:1 |
| Dark | `text-muted` | `primary-soft` | 5.66:1 | 4.5:1 |
| Dark | `primary` | `canvas` | 13.88:1 | 4.5:1 |
| Dark | `primary` | `surface` | 11.53:1 | 4.5:1 |
| Dark | `primary` | `surface-subtle` | 9.30:1 | 4.5:1 |
| Dark | `primary` | `surface-raised` | 9.30:1 | 4.5:1 |
| Dark | `primary` | `hover` | 7.36:1 | 4.5:1 |
| Dark | `primary` | `primary-soft` | 8.21:1 | 4.5:1 |
| Dark | `on-primary` | `primary` | 10.83:1 | 4.5:1 |
| Dark | `on-primary` | `primary-hover` | 12.36:1 | 4.5:1 |
| Dark | `success` | `success-bg` | 8.27:1 | 4.5:1 |
| Dark | `warning` | `warning-bg` | 7.57:1 | 4.5:1 |
| Dark | `danger` | `danger-bg` | 6.96:1 | 4.5:1 |
| Dark | `info` | `info-bg` | 8.21:1 | 4.5:1 |
| Dark | `focus` | `canvas` | 13.88:1 | 3.0:1 |
| Dark | `focus` | `surface` | 11.53:1 | 3.0:1 |
| Dark | `focus` | `surface-subtle` | 9.30:1 | 3.0:1 |
| Dark | `focus` | `surface-raised` | 9.30:1 | 3.0:1 |
| Dark | `focus` | `hover` | 7.36:1 | 3.0:1 |
| Dark | `focus` | `primary-soft` | 8.21:1 | 3.0:1 |
| Dark | `control-border` | `canvas` | 8.30:1 | 3.0:1 |
| Dark | `control-border` | `surface` | 6.90:1 | 3.0:1 |
| Dark | `control-border` | `surface-subtle` | 5.56:1 | 3.0:1 |
| Dark | `control-border` | `surface-raised` | 5.56:1 | 3.0:1 |
| Dark | `control-border` | `hover` | 4.40:1 | 3.0:1 |
