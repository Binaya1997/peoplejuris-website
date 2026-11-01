"""
PEOPLEJURIS LLP — GITHUB NEWSLETTER STORAGE MODULE
Provides persistent, version-controlled storage for newsletter PDFs and cover images
via the GitHub REST Contents API (Python 3.12+ Standard Library Only).

Architecture:
- Metadata is stored in Cloudflare D1 (or local SQLite).
- Binary publication assets (PDFs and cover images) are committed directly to
  the PeopleJuris GitHub repository.
- Prevents file loss on Render Free ephemeral disk reboots.
- Redacts GitHub tokens from all exceptions, error logs, and client responses.
"""

import os
import sys
import json
import base64
import urllib.request
import urllib.error
import urllib.parse
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

# ------------------------------------------------------------------------------
# DEFAULT CONFIGURATION
# ------------------------------------------------------------------------------
DEFAULT_GITHUB_OWNER = "Binaya1997"
DEFAULT_GITHUB_REPO = "peoplejuris-website"
DEFAULT_GITHUB_BRANCH = "feature/fresh-project-update"
DEFAULT_NEWSLETTER_DIR = "newsletters"
DEFAULT_COVER_DIR = "images/newsletter-covers"
DEFAULT_GITHUB_TIMEOUT_SECONDS = 15.0

# ------------------------------------------------------------------------------
# EXCEPTIONS
# ------------------------------------------------------------------------------
class GitHubStorageError(Exception):
    """Base exception for all GitHub storage operations."""
    pass

class GitHubConfigError(GitHubStorageError):
    """Raised when required GitHub storage configuration is missing or invalid."""
    pass

class GitHubAuthError(GitHubStorageError):
    """Raised when GitHub API authentication fails (401/403)."""
    pass

class GitHubRateLimitError(GitHubStorageError):
    """Raised when GitHub API rate limits are exceeded."""
    pass

class GitHubConflictError(GitHubStorageError):
    """Raised when a file already exists at the target path or branch conflict occurs."""
    pass


def sanitize_token(text: str, token: Optional[str]) -> str:
    """Replaces any occurrence of the GitHub token with [REDACTED]."""
    if not token or not text:
        return text
    return text.replace(token, "[REDACTED]")


# ------------------------------------------------------------------------------
# STORAGE BACKEND INTERFACE
# ------------------------------------------------------------------------------
class StorageBackend(ABC):
    """Abstract interface for storing newsletter PDFs and cover images."""

    @abstractmethod
    def save_pdf(self, pdf_bytes: bytes, filename: str) -> Dict[str, str]:
        """Saves a newsletter PDF and returns path/URL info."""
        pass

    @abstractmethod
    def save_cover(self, cover_bytes: bytes, filename: str) -> Dict[str, str]:
        """Saves a newsletter cover image and returns path/URL info."""
        pass

    @abstractmethod
    def delete_file(self, repo_path: str) -> bool:
        """Deletes a stored file. Returns True if deleted or already absent."""
        pass

# ------------------------------------------------------------------------------
# LOCAL DISK STORAGE (Local dev fallback & test double)
# ------------------------------------------------------------------------------
class LocalDiskStorage(StorageBackend):
    """Stores files on the local filesystem relative to workspace root."""

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = base_dir or os.path.dirname(os.path.abspath(__file__))
        self.pdf_dir = os.path.join(self.base_dir, DEFAULT_NEWSLETTER_DIR)
        self.cover_dir = os.path.join(self.base_dir, DEFAULT_COVER_DIR)
        os.makedirs(self.pdf_dir, exist_ok=True)
        os.makedirs(self.cover_dir, exist_ok=True)

    def save_pdf(self, pdf_bytes: bytes, filename: str) -> Dict[str, str]:
        disk_path = os.path.join(self.pdf_dir, filename)
        with open(disk_path, "wb") as f:
            f.write(pdf_bytes)
        relative_path = f"{DEFAULT_NEWSLETTER_DIR}/{filename}"
        return {
            "path": relative_path,
            "url": relative_path,
            "backend": "local"
        }

    def save_cover(self, cover_bytes: bytes, filename: str) -> Dict[str, str]:
        disk_path = os.path.join(self.cover_dir, filename)
        with open(disk_path, "wb") as f:
            f.write(cover_bytes)
        relative_path = f"{DEFAULT_COVER_DIR}/{filename}"
        return {
            "path": relative_path,
            "url": relative_path,
            "backend": "local"
        }

    def delete_file(self, repo_path: str) -> bool:
        """Deletes a local newsletter asset if it exists."""
        clean_path = repo_path.strip().lstrip("/")

        allowed_prefixes = (
            f"{DEFAULT_NEWSLETTER_DIR}/",
            f"{DEFAULT_COVER_DIR}/",
        )

        if not clean_path.startswith(allowed_prefixes) or ".." in clean_path.split("/"):
            raise GitHubStorageError("Invalid newsletter asset path.")

        full_path = os.path.abspath(os.path.join(self.base_dir, clean_path))
        base_path = os.path.abspath(self.base_dir)

        if not full_path.startswith(base_path + os.sep):
            raise GitHubStorageError("Invalid newsletter asset path.")

        if os.path.isfile(full_path):
            os.remove(full_path)

        return True


# ------------------------------------------------------------------------------
# GITHUB REST STORAGE (Contents API)
# ------------------------------------------------------------------------------
class GitHubStorage(StorageBackend):
    """
    Uploads and commits publication assets directly to the PeopleJuris GitHub repository.
    Uses the GitHub Contents API: PUT /repos/{owner}/{repo}/contents/{path}
    """

    def __init__(
        self,
        token: str,
        owner: str = DEFAULT_GITHUB_OWNER,
        repo: str = DEFAULT_GITHUB_REPO,
        branch: str = DEFAULT_GITHUB_BRANCH,
        newsletter_dir: str = DEFAULT_NEWSLETTER_DIR,
        cover_dir: str = DEFAULT_COVER_DIR,
        url_strategy: str = "relative",
        timeout: float = DEFAULT_GITHUB_TIMEOUT_SECONDS,
        api_base_url: str = "https://api.github.com"
    ):
        if not token or not token.strip():
            raise GitHubConfigError("GitHub token must not be empty.")
        self.token = token.strip()
        self.owner = owner.strip()
        self.repo = repo.strip()
        self.branch = branch.strip()
        self.newsletter_dir = newsletter_dir.strip().strip("/")
        self.cover_dir = cover_dir.strip().strip("/")
        self.url_strategy = url_strategy.strip().lower()  # "relative", "raw_github", or "cdn"
        self.timeout = timeout
        self.api_base_url = api_base_url.rstrip("/")

    def _request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Executes an authenticated HTTP request to the GitHub API."""
        url = f"{self.api_base_url}/{path.lstrip('/')}"
        data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None

        req = urllib.request.Request(url, data=data_bytes, method=method)
        req.add_header("Authorization", f"Bearer {self.token}")
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("User-Agent", "PeopleJuris-Python-Backend/1.0")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        if payload is not None:
            req.add_header("Content-Type", "application/json")

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                resp_bytes = resp.read()
                return json.loads(resp_bytes.decode("utf-8")) if resp_bytes else {}
        except urllib.error.HTTPError as e:
            status = e.code
            try:
                err_body = e.read().decode("utf-8", errors="replace")
                err_json = json.loads(err_body)
                err_msg = err_json.get("message", err_body)
            except Exception:
                err_msg = str(e.reason)

            sanitized_msg = sanitize_token(err_msg, self.token)

            if status in (401, 403) and ("bad credentials" in sanitized_msg.lower() or "requires authentication" in sanitized_msg.lower()):
                raise GitHubAuthError(f"GitHub API authentication rejected: {sanitized_msg}") from e
            if status in (403, 429) and "rate limit" in sanitized_msg.lower():
                raise GitHubRateLimitError(f"GitHub API rate limit exceeded: {sanitized_msg}") from e
            if status == 422:
                raise GitHubConflictError(f"GitHub resource conflict at path (status 422): {sanitized_msg}") from e
            raise GitHubStorageError(f"GitHub API returned HTTP {status}: {sanitized_msg}") from e
        except urllib.error.URLError as e:
            sanitized_reason = sanitize_token(str(e.reason), self.token)
            raise GitHubStorageError(f"Failed to connect to GitHub API: {sanitized_reason}") from e
        except Exception as e:
            sanitized_e = sanitize_token(str(e), self.token)
            raise GitHubStorageError(f"Unexpected GitHub storage error: {sanitized_e}") from e

    def resolve_url(self, repo_path: str) -> str:
        """
        Resolves the appropriate URL or path to be stored in the database.
        - 'relative': returns relative path ('newsletters/file.pdf') for site-relative links.
        - 'raw_github': returns direct raw.githubusercontent.com CDN link.
        """
        if self.url_strategy == "raw_github":
            return f"https://raw.githubusercontent.com/{self.owner}/{self.repo}/{self.branch}/{repo_path}"
        # Default: relative path matching existing repository layout
        return repo_path

    def upload_file(self, content_bytes: bytes, repo_path: str, commit_message: str) -> Dict[str, str]:
        """
        Uploads and commits a binary file to GitHub using base64 encoding.
        Path: /repos/{owner}/{repo}/contents/{repo_path}
        """
        # Clean path: strip leading slashes and prevent directory traversal
        clean_path = repo_path.strip().lstrip("/")
        if ".." in clean_path:
            raise GitHubStorageError(f"Path traversal characters not allowed in file path: '{clean_path}'")

        b64_content = base64.b64encode(content_bytes).decode("ascii")

        payload = {
            "message": commit_message,
            "content": b64_content,
            "branch": self.branch
        }

        api_endpoint = f"repos/{self.owner}/{self.repo}/contents/{clean_path}"
        res = self._request("PUT", api_endpoint, payload=payload)

        content_meta = res.get("content", {})
        download_url = content_meta.get("download_url") or ""
        commit_meta = res.get("commit", {})
        commit_sha = commit_meta.get("sha") or ""

        return {
            "path": clean_path,
            "download_url": download_url,
            "resolved_url": self.resolve_url(clean_path),
            "commit_sha": commit_sha,
            "backend": "github"
        }

    def save_pdf(self, pdf_bytes: bytes, filename: str) -> Dict[str, str]:
        """Commits a newsletter PDF file to the configured newsletter directory."""
        repo_path = f"{self.newsletter_dir}/{filename}"
        commit_msg = f"Upload newsletter publication: {filename} [skip ci]"
        res = self.upload_file(pdf_bytes, repo_path, commit_msg)
        return {
            "path": res["path"],
            "url": res["resolved_url"],
            "download_url": res["download_url"],
            "backend": "github"
        }

    def save_cover(self, cover_bytes: bytes, filename: str) -> Dict[str, str]:
        """Commits a newsletter cover image to the configured cover directory."""
        repo_path = f"{self.cover_dir}/{filename}"
        commit_msg = f"Upload newsletter cover image: {filename} [skip ci]"
        res = self.upload_file(cover_bytes, repo_path, commit_msg)
        return {
            "path": res["path"],
            "url": res["resolved_url"],
            "download_url": res["download_url"],
            "backend": "github"
        }

    def delete_file(self, repo_path: str) -> bool:
        """Deletes a newsletter asset from GitHub using the Contents API."""

        clean_path = repo_path.strip().lstrip("/")

        allowed_prefixes = (
            f"{self.newsletter_dir}/",
            f"{self.cover_dir}/",
        )

        if (
            not clean_path.startswith(allowed_prefixes)
            or ".." in clean_path.split("/")
        ):
            raise GitHubStorageError("Invalid newsletter asset path.")

        api_endpoint = (
            f"repos/{self.owner}/{self.repo}/contents/{clean_path}"
        )

        # Retrieve the current file SHA required by GitHub's DELETE API.
        file_meta = self._request(
            "GET",
            f"{api_endpoint}?ref={self.branch}"
        )

        file_sha = file_meta.get("sha")

        if not file_sha:
            raise GitHubStorageError(
                f"GitHub did not return a SHA for '{clean_path}'."
            )

        payload = {
            "message": f"Delete newsletter asset: {clean_path} [skip ci]",
            "sha": file_sha,
            "branch": self.branch,
        }

        self._request(
            "DELETE",
            api_endpoint,
            payload=payload
        )

        return True

# ------------------------------------------------------------------------------
# FACTORY & CONFIGURATION
# ------------------------------------------------------------------------------
_storage_instance: Optional[StorageBackend] = None

def get_storage_backend(reload: bool = False) -> StorageBackend:
    """
    Factory resolving the active storage backend from environment variables.
    - PJ_STORAGE_BACKEND='github': strictly requires PJ_GITHUB_TOKEN, commits to GitHub.
    - PJ_STORAGE_BACKEND='local': writes to local filesystem.
    - When unset: uses 'github' if PJ_GITHUB_TOKEN is configured; otherwise 'local'.
    """
    global _storage_instance
    if _storage_instance is not None and not reload:
        return _storage_instance

    backend = (os.environ.get("PJ_STORAGE_BACKEND") or "").strip().lower()
    token = os.environ.get("PJ_GITHUB_TOKEN")

    if backend == "github" or (not backend and token):
        if not token or not token.strip():
            raise GitHubConfigError(
                "PJ_STORAGE_BACKEND is set to 'github' but PJ_GITHUB_TOKEN is missing or empty. "
                "Set PJ_GITHUB_TOKEN with repository write permissions."
            )

        owner = os.environ.get("PJ_GITHUB_OWNER", DEFAULT_GITHUB_OWNER)
        repo = os.environ.get("PJ_GITHUB_REPO", DEFAULT_GITHUB_REPO)
        branch = os.environ.get("PJ_GITHUB_BRANCH", DEFAULT_GITHUB_BRANCH)
        newsletter_dir = os.environ.get("PJ_GITHUB_NEWSLETTER_PATH", DEFAULT_NEWSLETTER_DIR)
        cover_dir = os.environ.get("PJ_GITHUB_COVER_PATH", DEFAULT_COVER_DIR)
        url_strategy = os.environ.get("PJ_FILE_URL_STRATEGY", "relative")
        timeout = float(os.environ.get("PJ_GITHUB_TIMEOUT_SECONDS", DEFAULT_GITHUB_TIMEOUT_SECONDS))

        _storage_instance = GitHubStorage(
            token=token,
            owner=owner,
            repo=repo,
            branch=branch,
            newsletter_dir=newsletter_dir,
            cover_dir=cover_dir,
            url_strategy=url_strategy,
            timeout=timeout
        )
        return _storage_instance

    elif backend == "local" or not backend:
        _storage_instance = LocalDiskStorage()
        return _storage_instance

    else:
        raise GitHubConfigError(
            f"Unsupported PJ_STORAGE_BACKEND: '{backend}'. Allowed values are 'github' or 'local'."
        )
