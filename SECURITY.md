# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | Yes       |

## Reporting a Vulnerability

Report vulnerabilities privately to `security@packmovego.com`.

Do not report security issues in public GitHub issues.
Do not paste secrets or access tokens in issues, pull requests, or discussion threads.

## What to Include

- Issue description
- Reproduction steps
- Impact details
- Suggested fix (optional)

## Contributor Requirements

- Never commit secrets, keys, or credentials
- Validate input and handle errors safely
- Keep dependencies up to date
- Remove debug logs that expose auth/config internals

## Local Security Commands

```bash
npm audit
npm outdated
```

## Responsible Disclosure

Please allow maintainers time to investigate and patch issues before any public disclosure.
