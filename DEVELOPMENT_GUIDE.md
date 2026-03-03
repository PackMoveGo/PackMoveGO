# Development Guide

## Setup

```bash
npm install
npm run dev
```

## Runtime Commands

```bash
npm run dev
npm start
```

## Dependency Safety

- Add dependencies only when needed
- Prefer actively maintained packages
- Check license and security before adoption
- Test changes in a feature branch first

Useful checks:

```bash
npm outdated
npm audit
```

## New Contributor Onboarding

- Open a GitHub issue describing the bug/feature first
- Fork and submit a focused pull request
- Keep changes small and include screenshots/logs when useful
- Never include secrets, tokens, or local environment files
- Redact all credentials from screenshots, logs, and error traces before posting
- Follow `CONTRIBUTING.md` for the full pull request process

## Public Repo Safety Checklist

- No secrets in source control
- No `.env*.local` files committed
- Security reports handled privately (see `SECURITY.md`)
- Keep dependencies updated
