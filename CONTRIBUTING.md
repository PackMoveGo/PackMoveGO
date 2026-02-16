# Contributing

Thanks for your interest in contributing to PackMoveGo Desktop.

## Before You Start

- Read `CODE_OF_CONDUCT.md`
- Read `SECURITY.md`
- Check open issues before starting new work

## Development

```bash
npm install
npm run dev
```

## Pull Request Process

1. Create a branch from `main`
2. Keep changes focused and small
3. Explain what changed and why
4. Include screenshots for UI updates when helpful
5. Link related issue(s)

## Security Rules for Contributions

- Never commit secrets, API keys, tokens, passwords, or certificates
- Never upload `.env` files
- Redact sensitive values from logs and screenshots
- Do not post vulnerabilities publicly; follow `SECURITY.md`

## Pre-PR Safety Check

Before opening a pull request, quickly check your branch for accidental secrets:

```bash
git diff -- . ':!package-lock.json'
rg -n "(api[_-]?key|secret|token|password|private[_-]?key|BEGIN PRIVATE)" .
```

## Good First Contributions

- Small bug fixes
- Documentation clarity improvements
- Accessibility and UX polish
- Test coverage improvements

## Talent Scouting

We review public contributions for long-term collaboration opportunities.
Consistent, secure, and well-documented contributions stand out.
