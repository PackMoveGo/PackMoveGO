# Deployment Workflow Notes

This repository currently does not include active GitHub Actions deployment workflow files.

If deployment workflows are added later:

- Store credentials only in GitHub repository/environment secrets
- Never commit tokens, keys, or `.env` files
- Restrict deployment permissions to trusted maintainers
- Review all workflow changes in pull requests before merge

For vulnerability reporting, see `SECURITY.md`.