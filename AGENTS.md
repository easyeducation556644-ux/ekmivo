# Ekmivo agent entry point

## Canonical plan

**Use `docs/DUAL-SAAS-MVP-PLAN.bn.md` as the main implementation plan.** Do not create a competing plan or infer scope from a previous chat summary when these documents contain a newer explicit correction.

Read in this order before implementation:

1. `docs/DUAL-SAAS-MVP-PLAN.bn.md` — product, architecture, payment behavior, delivery gates.
2. `docs/MVP-FEATURE-SCOPE.md` — complete first-release capability inventory and acceptance.
3. `docs/DESIGN-SYSTEM.md` — required visual system, responsive patterns, light/dark and EN/BN behavior.
4. `docs/design/tokens.css` — exact semantic design tokens.
5. `docs/IMPLEMENTATION-BACKLOG.md` — dependency-ordered work and required evidence.

## Fixed user decisions

- All listed features belong in the first full public MVP. Do not silently move them to a later release. Internal build milestones can be partial.
- Payment verification is automatic using transaction time, actual sender number, amount, receiving account and method. A valid unique match automatically verifies/confirms and dispatches the merchant webhook.
- Do not introduce customer TrxID entry, screenshot submission, routine merchant approval or an auto-verification opt-in into the normal payment flow. Receipt IDs may be extracted internally for deduplication. Additional gateway integrations are not prerequisites for the phone verification path.
- Follow the selected minimal neutral/forest-green design. Both light/dark modes and a complete EN/BN switcher are first-release features.
- Build the design foundation before product page styling. Preserve feature coverage; minimal visuals do not mean fewer features.
- Selected core: Go, PostgreSQL and Next.js/TypeScript. Single implementation collaborator is Codex; account/business actions belong to the user.

## Document ownership and work evidence

The user's latest explicit instruction takes precedence. Within the documents, the master plan owns architecture; the feature inventory owns feature completeness; the design guide owns UI behavior; token CSS owns exact values; the backlog owns sequencing. Resolve discrepancies by updating the affected documents together without undoing the user's decisions.

Take the next dependency-ready work item. Record the item and scope IDs, concrete changes, relevant checks and unresolved dependencies. Planned work, mock provider output and sample screens are not evidence of a live integration. Do not mark incomplete tasks done or claim an untested capability.

Current repository status: implementation started. The web introduction and repository skeleton are early foundation work, not the complete MVP. The first UI milestone is D01/D02 in the backlog: semantic tokens/components, application shell, theme behavior and complete locale infrastructure. Treat unfinished parts of those milestones as open.
