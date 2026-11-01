# 12 — Newsletter Management

## Data and asset separation

- D1 stores newsletter metadata: title, description, category, issue date, PDF path, cover path, status, latest flag, timestamps.
- Owner confirms PDF and cover assets are stored in GitHub repository storage.
- `github_storage.py` uses GitHub Contents API; configured path defaults are `newsletters/` and `images/newsletter-covers/`.
- Local disk storage remains an available adapter mode.

## Upload flow

1. Administrator logs in and opens dashboard.
2. Dashboard submits newsletter metadata and file(s) to `POST /api/admin/newsletters`.
3. Backend validates authentication, multipart data, file requirements, size and content/magic bytes.
4. Backend creates safe generated filenames.
5. Storage backend uploads assets to GitHub or local disk according to environment.
6. Backend stores metadata via active database adapter.
7. Public listing reads published newsletter metadata from `/api/newsletters`.
8. Public UI renders latest and archive entries using returned metadata and asset paths.

The source has a 25 MB PDF limit and 8 MB cover image limit. Validate current frontend behavior and production settings before relying on these as deployed limits.

## Latest edition

The adapter maintains latest selection by clearing other `is_latest` flags and setting the target only if published. If no published record is latest, fallback promotes the newest published issue by issue date and ID.

## Update and deletion

- `PUT /api/admin/newsletters/{id}` updates metadata.
- `DELETE /api/admin/newsletters/{id}` reads the record, validates asset paths, deletes files through the selected storage backend, and then deletes the metadata record.
- The default cover is preserved.
- Path checks restrict deletion to expected newsletter/cover directories.
- File deletion and metadata deletion are separate operations; failures can leave assets or records requiring careful investigation.

## Troubleshooting

- Check API response and Render logs.
- Verify D1 metadata paths match the actual GitHub repository path/branch.
- Verify GitHub token access, branch setting and Contents API response.
- Check publication status and `is_latest`.
- Check case-sensitive filename/path consistency.
- Do not delete assets manually until confirming they are not shared/default assets.
