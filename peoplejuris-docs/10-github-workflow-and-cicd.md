# 10 — GitHub Workflow and CI/CD

## Repository

Owner-provided repository URL:

`https://github.com/Binaya1997/peoplejuris-website.git`

The supplied ZIP is a source archive, not a Git clone; it does not provide commit history, branches, PR records, branch protections, GitHub Actions workflows, or deploy integration settings. No `.github/workflows/` directory is present in this ZIP.

## What GitHub does

- Holds PeopleJuris source.
- Owner confirms newsletter PDFs and cover images are stored in repository storage.
- The Python GitHub storage adapter uploads/deletes assets using GitHub Contents API; uploads create commits on configured branch.
- Cloudflare dashboard screenshots show `peoplejuris-website` associated with the GitHub repository. Exact Worker build triggers and branch configuration are not fully visible. Render deployment integration is not verified by the supplied screenshots.

## Basic Git workflow (maintenance reference; not claimed as prior command history)

```bash
git clone https://github.com/Binaya1997/peoplejuris-website.git
cd peoplejuris-website
git status
git pull --ff-only

git switch -c docs/peoplejuris-technical-docs
# Add documentation files after reviewing them.
git add docs/
git commit -m "docs: add PeopleJuris technical documentation"
git push -u origin docs/peoplejuris-technical-docs
```

Open a pull request in GitHub and review before merging. Actual branch conventions and merge requirements need confirmation.

## Rollback

For a documentation-only PR, revert the documentation commit or PR merge. Do not use force push or roll back application deployments as part of documentation delivery.

## CI/CD status

No workflow files were included in this archive. Therefore GitHub Actions, tests, CI jobs, automatic website Worker deploy, automatic Render deploy, deployment gates, and release tags are **unverified**. Do not document them as implemented until workflow or dashboard evidence is available.
