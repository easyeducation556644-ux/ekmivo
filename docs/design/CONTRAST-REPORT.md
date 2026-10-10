# Design token contrast report

Ink & Bone · Option F · Light/Dark/System

Generated from `tokens.css`; reproduces `python docs/design/verify_tokens.py` palette assertions.

All 82 specified solid-color pairs pass. Explicit/System dark tokens match; theme keys match.

Thresholds: text 4.5:1; essential control boundaries and keyboard focus 3:1. Assertions use unrounded values.

This validates selected solid semantic token pairs only. CSS compositing, image contrast, rendered state colors, typography, keyboard interactions and WCAG conformance still require browser audits.

| Theme | Foreground | Background | Contrast | Minimum |
|---|---|---|---:|---:|
| Light | `text` | `canvas` | 15.22:1 | 4.5:1 |
| Light | `text` | `surface` | 15.91:1 | 4.5:1 |
| Light | `text` | `surface-subtle` | 14.18:1 | 4.5:1 |
| Light | `text` | `surface-raised` | 15.91:1 | 4.5:1 |
| Light | `text` | `hover` | 13.43:1 | 4.5:1 |
| Light | `text` | `primary-soft` | 13.45:1 | 4.5:1 |
| Light | `text-secondary` | `canvas` | 7.07:1 | 4.5:1 |
| Light | `text-secondary` | `surface` | 7.39:1 | 4.5:1 |
| Light | `text-secondary` | `surface-subtle` | 6.59:1 | 4.5:1 |
| Light | `text-secondary` | `surface-raised` | 7.39:1 | 4.5:1 |
| Light | `text-secondary` | `hover` | 6.24:1 | 4.5:1 |
| Light | `text-secondary` | `primary-soft` | 6.25:1 | 4.5:1 |
| Light | `text-muted` | `canvas` | 5.27:1 | 4.5:1 |
| Light | `text-muted` | `surface` | 5.51:1 | 4.5:1 |
| Light | `text-muted` | `surface-subtle` | 4.91:1 | 4.5:1 |
| Light | `text-muted` | `surface-raised` | 5.51:1 | 4.5:1 |
| Light | `text-muted` | `hover` | 4.65:1 | 4.5:1 |
| Light | `text-muted` | `primary-soft` | 4.66:1 | 4.5:1 |
| Light | `primary` | `canvas` | 14.48:1 | 4.5:1 |
| Light | `primary` | `surface` | 15.13:1 | 4.5:1 |
| Light | `primary` | `surface-subtle` | 13.49:1 | 4.5:1 |
| Light | `primary` | `surface-raised` | 15.13:1 | 4.5:1 |
| Light | `primary` | `hover` | 12.78:1 | 4.5:1 |
| Light | `primary` | `primary-soft` | 12.79:1 | 4.5:1 |
| Light | `on-primary` | `primary` | 15.13:1 | 4.5:1 |
| Light | `on-primary` | `primary-hover` | 10.05:1 | 4.5:1 |
| Light | `success` | `success-bg` | 6.57:1 | 4.5:1 |
| Light | `warning` | `warning-bg` | 6.24:1 | 4.5:1 |
| Light | `danger` | `danger-bg` | 6.17:1 | 4.5:1 |
| Light | `info` | `info-bg` | 6.41:1 | 4.5:1 |
| Light | `focus` | `canvas` | 11.60:1 | 3.0:1 |
| Light | `focus` | `surface` | 12.12:1 | 3.0:1 |
| Light | `focus` | `surface-subtle` | 10.81:1 | 3.0:1 |
| Light | `focus` | `surface-raised` | 12.12:1 | 3.0:1 |
| Light | `focus` | `hover` | 10.23:1 | 3.0:1 |
| Light | `focus` | `primary-soft` | 10.25:1 | 3.0:1 |
| Light | `control-border` | `canvas` | 4.37:1 | 3.0:1 |
| Light | `control-border` | `surface` | 4.56:1 | 3.0:1 |
| Light | `control-border` | `surface-subtle` | 4.07:1 | 3.0:1 |
| Light | `control-border` | `surface-raised` | 4.56:1 | 3.0:1 |
| Light | `control-border` | `hover` | 3.85:1 | 3.0:1 |
| Dark | `text` | `canvas` | 16.86:1 | 4.5:1 |
| Dark | `text` | `surface` | 14.20:1 | 4.5:1 |
| Dark | `text` | `surface-subtle` | 12.63:1 | 4.5:1 |
| Dark | `text` | `surface-raised` | 12.11:1 | 4.5:1 |
| Dark | `text` | `hover` | 10.60:1 | 4.5:1 |
| Dark | `text` | `primary-soft` | 11.27:1 | 4.5:1 |
| Dark | `text-secondary` | `canvas` | 11.09:1 | 4.5:1 |
| Dark | `text-secondary` | `surface` | 9.35:1 | 4.5:1 |
| Dark | `text-secondary` | `surface-subtle` | 8.31:1 | 4.5:1 |
| Dark | `text-secondary` | `surface-raised` | 7.97:1 | 4.5:1 |
| Dark | `text-secondary` | `hover` | 6.98:1 | 4.5:1 |
| Dark | `text-secondary` | `primary-soft` | 7.42:1 | 4.5:1 |
| Dark | `text-muted` | `canvas` | 9.16:1 | 4.5:1 |
| Dark | `text-muted` | `surface` | 7.72:1 | 4.5:1 |
| Dark | `text-muted` | `surface-subtle` | 6.86:1 | 4.5:1 |
| Dark | `text-muted` | `surface-raised` | 6.59:1 | 4.5:1 |
| Dark | `text-muted` | `hover` | 5.76:1 | 4.5:1 |
| Dark | `text-muted` | `primary-soft` | 6.13:1 | 4.5:1 |
| Dark | `primary` | `canvas` | 16.23:1 | 4.5:1 |
| Dark | `primary` | `surface` | 13.67:1 | 4.5:1 |
| Dark | `primary` | `surface-subtle` | 12.16:1 | 4.5:1 |
| Dark | `primary` | `surface-raised` | 11.66:1 | 4.5:1 |
| Dark | `primary` | `hover` | 10.21:1 | 4.5:1 |
| Dark | `primary` | `primary-soft` | 10.85:1 | 4.5:1 |
| Dark | `on-primary` | `primary` | 14.02:1 | 4.5:1 |
| Dark | `on-primary` | `primary-hover` | 15.91:1 | 4.5:1 |
| Dark | `success` | `success-bg` | 8.21:1 | 4.5:1 |
| Dark | `warning` | `warning-bg` | 7.97:1 | 4.5:1 |
| Dark | `danger` | `danger-bg` | 7.55:1 | 4.5:1 |
| Dark | `info` | `info-bg` | 7.72:1 | 4.5:1 |
| Dark | `focus` | `canvas` | 14.43:1 | 3.0:1 |
| Dark | `focus` | `surface` | 12.16:1 | 3.0:1 |
| Dark | `focus` | `surface-subtle` | 10.81:1 | 3.0:1 |
| Dark | `focus` | `surface-raised` | 10.37:1 | 3.0:1 |
| Dark | `focus` | `hover` | 9.08:1 | 3.0:1 |
| Dark | `focus` | `primary-soft` | 9.65:1 | 3.0:1 |
| Dark | `control-border` | `canvas` | 7.21:1 | 3.0:1 |
| Dark | `control-border` | `surface` | 6.08:1 | 3.0:1 |
| Dark | `control-border` | `surface-subtle` | 5.40:1 | 3.0:1 |
| Dark | `control-border` | `surface-raised` | 5.18:1 | 3.0:1 |
| Dark | `control-border` | `hover` | 4.54:1 | 3.0:1 |
