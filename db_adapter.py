"""
PEOPLEJURIS LLP — DATA ACCESS LAYER (DAL)
Supports dual backends:
1. SQLite (default, local file-based relational database)
2. Cloudflare D1 (via dedicated authenticated Cloudflare Worker API)

Zero external pip dependencies required (Python 3.12+ standard library only).
"""

import os
import sys
import json
import time
import datetime
import urllib.parse
import urllib.request
import urllib.error
import sqlite3
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List, Tuple

# ------------------------------------------------------------------------------
# PATH CONSTANTS
# ------------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DEFAULT_DB_PATH = os.path.join(DATA_DIR, "peoplejuris.db")
DEFAULT_INACTIVITY_TIMEOUT_SECONDS = 15 * 60  # 15 minutes
DEFAULT_MAX_LIFETIME_SECONDS = 12 * 60 * 60   # 12 hours
DEFAULT_WORKER_TIMEOUT_SECONDS = 10.0          # 10 seconds

# ------------------------------------------------------------------------------
# EXCEPTIONS
# ------------------------------------------------------------------------------
class DatabaseError(Exception):
    """Base exception for all database and data layer errors."""
    pass

class ConfigurationError(DatabaseError):
    """Raised when database configuration is missing, invalid, or unsupported."""
    pass

class D1WorkerError(DatabaseError):
    """Raised when communication with the Cloudflare Worker D1 API fails."""
    pass

class RecordNotFoundError(DatabaseError):
    """Raised when a requested record does not exist."""
    pass

# ------------------------------------------------------------------------------
# IN-MEMORY SESSION EXPIRATION CACHE
# ------------------------------------------------------------------------------
RECENTLY_EXPIRED_TOKENS: Dict[str, float] = {}

def record_recently_expired(token: str) -> None:
    """Records expired session token to allow graceful ?expired=1 redirection on concurrent requests."""
    if not token:
        return
    now = time.time()
    for t in list(RECENTLY_EXPIRED_TOKENS.keys()):
        if now - RECENTLY_EXPIRED_TOKENS[t] > 120:
            del RECENTLY_EXPIRED_TOKENS[t]
    RECENTLY_EXPIRED_TOKENS[token] = now

def is_recently_expired(token: str) -> bool:
    """Checks whether token was recently invalidated due to expiration."""
    if not token:
        return False
    now = time.time()
    if token in RECENTLY_EXPIRED_TOKENS:
        if now - RECENTLY_EXPIRED_TOKENS[token] <= 120:
            return True
        else:
            del RECENTLY_EXPIRED_TOKENS[token]
    return False

def sanitize_secret(text: str, secret: Optional[str]) -> str:
    """Redacts any appearance of the secret token from strings and error messages."""
    if not text:
        return ""
    if secret and secret in text:
        return text.replace(secret, "[REDACTED]")
    return text

# ------------------------------------------------------------------------------
# ABSTRACT BASE ADAPTER
# ------------------------------------------------------------------------------
class DatabaseAdapter(ABC):
    """Abstract interface defining all PeopleJuris data-access operations."""

    @abstractmethod
    def init_database(self) -> None:
        """Initializes tables, schema migrations, and baseline data or verifies remote connectivity."""
        pass

    @abstractmethod
    def get_admin_count(self) -> int:
        """Returns total count of registered administrators."""
        pass

    @abstractmethod
    def get_admin_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Retrieves administrator credentials and metadata by username."""
        pass

    @abstractmethod
    def get_admin_by_id(self, admin_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves administrator credentials and metadata by primary key ID."""
        pass

    @abstractmethod
    def get_admin_recovery_info(self, username: str) -> Optional[Dict[str, Any]]:
        """Retrieves recovery code hash and consumption status for password reset."""
        pass

    @abstractmethod
    def consume_recovery_code(self, admin_id: int, new_password_hash: str, updated_at: Optional[str] = None) -> bool:
        """Atomically consumes a single-use backup recovery code and revokes all active sessions."""
        pass

    @abstractmethod
    def update_admin_password(self, admin_id: int, new_password_hash: str,
                              keep_session_token: Optional[str] = None, updated_at: Optional[str] = None) -> bool:
        """Updates admin password and invalidates other active sessions."""
        pass

    @abstractmethod
    def regenerate_recovery_code(self, admin_id: int, recovery_code_hash: str, updated_at: Optional[str] = None) -> bool:
        """Stores a fresh backup recovery code hash and resets used flag to 0."""
        pass

    @abstractmethod
    def upsert_admin(self, username: str, password_hash: str, recovery_code_hash: str,
                     must_change_password: bool = False, timestamp: Optional[str] = None) -> Dict[str, Any]:
        """Provisions a new administrator or updates existing admin credentials."""
        pass

    @abstractmethod
    def create_session(self, token: str, admin_id: int, expires_at: str, created_at: str,
                       last_activity_at: Optional[str] = None) -> bool:
        """Stores a new authenticated session token."""
        pass

    @abstractmethod
    def validate_session(self, token: str, update_activity: bool = True,
                         current_time: Optional[str] = None,
                         inactivity_timeout_seconds: int = DEFAULT_INACTIVITY_TIMEOUT_SECONDS) -> Tuple[Optional[Dict[str, Any]], bool, Optional[str]]:
        """
        Validates session against 12-hour lifetime and sliding inactivity timeout.
        Returns: (admin_dict_or_None, is_expired, validated_token_or_None)
        """
        pass

    @abstractmethod
    def delete_session(self, token: str) -> bool:
        """Deletes session token on logout."""
        pass

    @abstractmethod
    def cleanup_expired_sessions(self, current_time: Optional[str] = None,
                                 inactivity_timeout_seconds: int = DEFAULT_INACTIVITY_TIMEOUT_SECONDS) -> int:
        """Prunes expired and inactive sessions."""
        pass

    @abstractmethod
    def get_public_newsletters(self) -> List[Dict[str, Any]]:
        """Returns published newsletters ordered by latest edition first, then date descending."""
        pass

    @abstractmethod
    def get_all_newsletters(self) -> List[Dict[str, Any]]:
        """Returns all newsletters (published and drafts) for admin console."""
        pass

    @abstractmethod
    def get_newsletter_by_id(self, newsletter_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a single newsletter record by ID."""
        pass

    @abstractmethod
    def create_newsletter(self, data: Dict[str, Any]) -> int:
        """Inserts a new newsletter and atomically balances latest addition mutex. Returns new ID."""
        pass

    @abstractmethod
    def update_newsletter(self, newsletter_id: int, data: Dict[str, Any]) -> bool:
        """Updates newsletter fields and atomically balances latest addition mutex."""
        pass

    @abstractmethod
    def delete_newsletter(self, newsletter_id: int) -> Optional[Dict[str, Any]]:
        """Deletes newsletter, promotes fallback latest issue, and returns file paths for host cleanup."""
        pass

# ------------------------------------------------------------------------------
# SQLITE BACKEND ADAPTER
# ------------------------------------------------------------------------------
class SQLiteAdapter(DatabaseAdapter):
    """Local SQLite persistent database adapter preserving existing behavior."""

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path

    def get_connection(self) -> sqlite3.Connection:
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            return conn
        except sqlite3.Error as e:
            raise DatabaseError(f"Failed to connect to SQLite database at '{self.db_path}': {e}") from e

    def _ensure_latest_addition_mutex(self, conn: sqlite3.Connection, target_id: int):
        cursor = conn.cursor()
        cursor.execute("UPDATE newsletters SET is_latest = 0 WHERE id != ?", (target_id,))
        cursor.execute("UPDATE newsletters SET is_latest = 1 WHERE id = ? AND status = 'published'", (target_id,))

    def _promote_fallback_latest(self, conn: sqlite3.Connection):
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM newsletters WHERE status = 'published' AND is_latest = 1")
        if cursor.fetchone()["cnt"] == 0:
            cursor.execute("SELECT id FROM newsletters WHERE status = 'published' ORDER BY issue_date DESC, id DESC LIMIT 1")
            row = cursor.fetchone()
            if row:
                cursor.execute("UPDATE newsletters SET is_latest = 1 WHERE id = ?", (row["id"],))

    def init_database(self) -> None:
        db_dir = os.path.dirname(self.db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Admins Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS admins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    recovery_code_hash TEXT,
                    recovery_code_used INTEGER DEFAULT 0,
                    must_change_password INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            # 2. Sessions Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    admin_id INTEGER NOT NULL,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    last_activity_at TEXT NOT NULL,
                    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
                )
            """)

            # Ensure last_activity_at column exists
            cursor.execute("PRAGMA table_info(sessions)")
            existing_cols = [row[1] for row in cursor.fetchall()]
            if "last_activity_at" not in existing_cols:
                cursor.execute("ALTER TABLE sessions ADD COLUMN last_activity_at TEXT")
                cursor.execute("UPDATE sessions SET last_activity_at = created_at WHERE last_activity_at IS NULL")
                conn.commit()

            # Startup Cleanup
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            now_iso = now_utc.isoformat()
            inactivity_cutoff = (now_utc - datetime.timedelta(seconds=DEFAULT_INACTIVITY_TIMEOUT_SECONDS)).isoformat()
            cursor.execute("""
                DELETE FROM sessions
                WHERE expires_at <= ? OR last_activity_at <= ?
            """, (now_iso, inactivity_cutoff))
            conn.commit()

            # 3. Newsletters Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS newsletters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    category TEXT,
                    issue_date TEXT NOT NULL,
                    pdf_path TEXT NOT NULL,
                    cover_image_path TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'published',
                    is_latest INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            # 4. Migrate baseline newsletter entries if empty
            cursor.execute("SELECT COUNT(*) as cnt FROM newsletters")
            if cursor.fetchone()["cnt"] == 0:
                print("[Database] Seeding existing verified PeopleJuris publications...")
                now = datetime.datetime.now(datetime.timezone.utc).isoformat()
                baseline_entries = [
                    (
                        "PeopleJuris Newsletter – September 2026",
                        "IP & Trademark Law",
                        "consumer corporate ip",
                        "2026-09-01",
                        "newsletters/sept-2026.pdf",
                        "images/newsletter-covers/September-2026.jpeg",
                        "published",
                        1,
                        now,
                        now
                    ),
                    (
                        "PeopleJuris Newsletter – August 2026",
                        "CORPORATE GOVERNANCE",
                        "corporate civil",
                        "2026-08-01",
                        "newsletters/Aug-2026.pdf",
                        "images/newsletter-covers/aug-2026.jpeg",
                        "published",
                        0,
                        now,
                        now
                    ),
                    (
                        "PeopleJuris Newsletter – July 2026",
                        "Data Governance and Digital Regulatory Compliance",
                        "corporate property",
                        "2026-07-01",
                        "newsletters/june-2026.pdf",
                        "images/newsletter-covers/july.jpeg",
                        "published",
                        0,
                        now,
                        now
                    )
                ]
                cursor.executemany("""
                    INSERT INTO newsletters (
                        title, description, category, issue_date, pdf_path,
                        cover_image_path, status, is_latest, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, baseline_entries)
                conn.commit()
                print("[Database] 3 baseline publications seeded successfully.")

    def get_admin_count(self) -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as cnt FROM admins")
            return cursor.fetchone()["cnt"]

    def get_admin_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, username, password_hash, must_change_password FROM admins WHERE username = ?", (username.strip(),))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "username": row["username"],
                "password_hash": row["password_hash"],
                "must_change_password": row["must_change_password"]
            }

    def get_admin_by_id(self, admin_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, username, password_hash, must_change_password FROM admins WHERE id = ?", (admin_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "username": row["username"],
                "password_hash": row["password_hash"],
                "must_change_password": row["must_change_password"]
            }

    def get_admin_recovery_info(self, username: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, recovery_code_hash, recovery_code_used FROM admins WHERE username = ?", (username.strip(),))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "recovery_code_hash": row["recovery_code_hash"],
                "recovery_code_used": row["recovery_code_used"]
            }

    def consume_recovery_code(self, admin_id: int, new_password_hash: str, updated_at: Optional[str] = None) -> bool:
        now = updated_at or datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Atomically update ONLY IF recovery_code_used is 0
            cursor.execute("""
                UPDATE admins
                SET password_hash = ?, recovery_code_used = 1, must_change_password = 0, updated_at = ?
                WHERE id = ? AND recovery_code_used = 0
            """, (new_password_hash, now, admin_id))
            if cursor.rowcount == 0:
                return False
            cursor.execute("DELETE FROM sessions WHERE admin_id = ?", (admin_id,))
            conn.commit()
            return True

    def update_admin_password(self, admin_id: int, new_password_hash: str,
                              keep_session_token: Optional[str] = None, updated_at: Optional[str] = None) -> bool:
        now = updated_at or datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE admins
                SET password_hash = ?, must_change_password = 0, updated_at = ?
                WHERE id = ?
            """, (new_password_hash, now, admin_id))
            if cursor.rowcount == 0:
                return False

            if keep_session_token:
                cursor.execute("DELETE FROM sessions WHERE admin_id = ? AND id != ?", (admin_id, keep_session_token))
            else:
                cursor.execute("DELETE FROM sessions WHERE admin_id = ?", (admin_id,))
            conn.commit()
            return True

    def regenerate_recovery_code(self, admin_id: int, recovery_code_hash: str, updated_at: Optional[str] = None) -> bool:
        now = updated_at or datetime.datetime.now(datetime.timezone.utc).isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE admins
                SET recovery_code_hash = ?, recovery_code_used = 0, updated_at = ?
                WHERE id = ?
            """, (recovery_code_hash, now, admin_id))
            if cursor.rowcount == 0:
                return False
            conn.commit()
            return True

    def upsert_admin(self, username: str, password_hash: str, recovery_code_hash: str,
                     must_change_password: bool = False, timestamp: Optional[str] = None) -> Dict[str, Any]:
        now = timestamp or datetime.datetime.now(datetime.timezone.utc).isoformat()
        must_change_int = 1 if must_change_password else 0
        username = username.strip()

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM admins WHERE username = ?", (username,))
            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                    UPDATE admins
                    SET password_hash = ?, recovery_code_hash = ?, recovery_code_used = 0,
                        must_change_password = ?, updated_at = ?
                    WHERE id = ?
                """, (password_hash, recovery_code_hash, must_change_int, now, existing["id"]))
                cursor.execute("DELETE FROM sessions WHERE admin_id = ?", (existing["id"],))
                conn.commit()
                return {"admin_id": existing["id"], "action": "updated"}
            else:
                cursor.execute("""
                    INSERT INTO admins (
                        username, password_hash, recovery_code_hash, recovery_code_used,
                        must_change_password, created_at, updated_at
                    ) VALUES (?, ?, ?, 0, ?, ?, ?)
                """, (username, password_hash, recovery_code_hash, must_change_int, now, now))
                new_id = cursor.lastrowid
                conn.commit()
                return {"admin_id": new_id, "action": "created"}

    def create_session(self, token: str, admin_id: int, expires_at: str, created_at: str,
                       last_activity_at: Optional[str] = None) -> bool:
        last_act = last_activity_at or created_at
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sessions (id, admin_id, expires_at, created_at, last_activity_at)
                VALUES (?, ?, ?, ?, ?)
            """, (token, admin_id, expires_at, created_at, last_act))
            conn.commit()
            return True

    def validate_session(self, token: str, update_activity: bool = True,
                         current_time: Optional[str] = None,
                         inactivity_timeout_seconds: int = DEFAULT_INACTIVITY_TIMEOUT_SECONDS) -> Tuple[Optional[Dict[str, Any]], bool, Optional[str]]:
        if not token:
            return None, False, None

        if is_recently_expired(token):
            return None, True, token

        if current_time:
            now = datetime.datetime.fromisoformat(current_time)
            if now.tzinfo is None:
                now = now.replace(tzinfo=datetime.timezone.utc)
        else:
            now = datetime.datetime.now(datetime.timezone.utc)
        now_iso = now.isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s.id, s.admin_id, s.expires_at, s.created_at, s.last_activity_at,
                       a.username, a.must_change_password
                FROM sessions s
                JOIN admins a ON s.admin_id = a.id
                WHERE s.id = ?
            """, (token,))
            row = cursor.fetchone()
            if not row:
                return None, False, None

            # 1. Check absolute session expiration (12-hour max lifetime)
            try:
                expires_dt = datetime.datetime.fromisoformat(row["expires_at"])
                if expires_dt.tzinfo is None:
                    expires_dt = expires_dt.replace(tzinfo=datetime.timezone.utc)
            except Exception:
                expires_dt = now

            if now >= expires_dt:
                record_recently_expired(token)
                cursor.execute("DELETE FROM sessions WHERE id = ?", (token,))
                conn.commit()
                return None, True, token

            # 2. Check inactivity expiration (15 minutes)
            last_act_raw = row["last_activity_at"] or row["created_at"]
            try:
                last_act_dt = datetime.datetime.fromisoformat(last_act_raw)
                if last_act_dt.tzinfo is None:
                    last_act_dt = last_act_dt.replace(tzinfo=datetime.timezone.utc)
            except Exception:
                last_act_dt = now - datetime.timedelta(seconds=inactivity_timeout_seconds + 1)

            idle_seconds = (now - last_act_dt).total_seconds()
            if idle_seconds >= inactivity_timeout_seconds:
                record_recently_expired(token)
                cursor.execute("DELETE FROM sessions WHERE id = ?", (token,))
                conn.commit()
                return None, True, token

            # Active and valid
            if update_activity:
                cursor.execute("UPDATE sessions SET last_activity_at = ? WHERE id = ?", (now_iso, token))
                conn.commit()

            admin_data = {
                "id": row["admin_id"],
                "username": row["username"],
                "must_change_password": bool(row["must_change_password"])
            }
            return admin_data, False, token

    def delete_session(self, token: str) -> bool:
        if not token:
            return False
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE id = ?", (token,))
            conn.commit()
            return True

    def cleanup_expired_sessions(self, current_time: Optional[str] = None,
                                 inactivity_timeout_seconds: int = DEFAULT_INACTIVITY_TIMEOUT_SECONDS) -> int:
        if current_time:
            now_utc = datetime.datetime.fromisoformat(current_time)
            if now_utc.tzinfo is None:
                now_utc = now_utc.replace(tzinfo=datetime.timezone.utc)
        else:
            now_utc = datetime.datetime.now(datetime.timezone.utc)
        now_iso = now_utc.isoformat()
        inactivity_cutoff = (now_utc - datetime.timedelta(seconds=inactivity_timeout_seconds)).isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM sessions
                WHERE expires_at <= ? OR last_activity_at <= ?
            """, (now_iso, inactivity_cutoff))
            conn.commit()
            return cursor.rowcount

    def get_public_newsletters(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, title, description, category, issue_date, pdf_path,
                       cover_image_path, is_latest, created_at
                FROM newsletters
                WHERE status = 'published'
                ORDER BY is_latest DESC, issue_date DESC, id DESC
            """)
            return [dict(r) for r in cursor.fetchall()]

    def get_all_newsletters(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, title, description, category, issue_date, pdf_path,
                       cover_image_path, status, is_latest, created_at, updated_at
                FROM newsletters
                ORDER BY is_latest DESC, issue_date DESC, id DESC
            """)
            return [dict(r) for r in cursor.fetchall()]

    def get_newsletter_by_id(self, newsletter_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM newsletters WHERE id = ?", (newsletter_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def create_newsletter(self, data: Dict[str, Any]) -> int:
        title = data.get("title", "").strip()
        description = data.get("description", "").strip() if data.get("description") else None
        category = (data.get("category") or "corporate").strip().lower()
        issue_date = data.get("issue_date", "").strip()
        pdf_path = data.get("pdf_path", "").strip()
        cover_image_path = data.get("cover_image_path", "").strip()
        status = (data.get("status") or "published").strip().lower()

        is_latest = 1 if data.get("is_latest") in (1, "1", True) else 0
        if status != "published":
            is_latest = 0

        now = data.get("created_at") or datetime.datetime.now(datetime.timezone.utc).isoformat()

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO newsletters (
                    title, description, category, issue_date, pdf_path,
                    cover_image_path, status, is_latest, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (title, description, category, issue_date, pdf_path,
                  cover_image_path, status, is_latest, now, now))
            new_id = cursor.lastrowid

            if is_latest and status == "published":
                self._ensure_latest_addition_mutex(conn, new_id)
            elif status == "published":
                self._promote_fallback_latest(conn)

            conn.commit()
            return new_id

    def update_newsletter(self, newsletter_id: int, data: Dict[str, Any]) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM newsletters WHERE id = ?", (newsletter_id,))
            current = cursor.fetchone()
            if not current:
                return False

            title = data.get("title", current["title"]).strip()
            description = data.get("description", current["description"])
            if description is not None:
                description = description.strip()
            category = (data.get("category") or current["category"]).strip().lower()
            issue_date = (data.get("issue_date") or current["issue_date"]).strip()
            status = (data.get("status") or current["status"]).strip().lower()
            pdf_path = (data.get("pdf_path") or current["pdf_path"]).strip()
            cover_image_path = (data.get("cover_image_path") or current["cover_image_path"]).strip()

            if "is_latest" in data:
                is_latest = 1 if data["is_latest"] in (1, "1", True) else 0
            else:
                is_latest = current["is_latest"]

            if status != "published":
                is_latest = 0

            now = data.get("updated_at") or datetime.datetime.now(datetime.timezone.utc).isoformat()

            cursor.execute("""
                UPDATE newsletters
                SET title = ?, description = ?, category = ?, issue_date = ?,
                    pdf_path = ?, cover_image_path = ?, status = ?, is_latest = ?, updated_at = ?
                WHERE id = ?
            """, (title, description, category, issue_date, pdf_path, cover_image_path, status, is_latest, now, newsletter_id))

            if is_latest and status == "published":
                self._ensure_latest_addition_mutex(conn, newsletter_id)
            else:
                self._promote_fallback_latest(conn)

            conn.commit()
            return True

    def delete_newsletter(self, newsletter_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT pdf_path, cover_image_path FROM newsletters WHERE id = ?", (newsletter_id,))
            item = cursor.fetchone()
            if not item:
                return None

            cursor.execute("DELETE FROM newsletters WHERE id = ?", (newsletter_id,))
            self._promote_fallback_latest(conn)
            conn.commit()
            return {
                "pdf_path": item["pdf_path"],
                "cover_image_path": item["cover_image_path"]
            }

# ------------------------------------------------------------------------------
# CLOUDFLARE D1 / WORKER API BACKEND ADAPTER
# ------------------------------------------------------------------------------
class D1WorkerAdapter(DatabaseAdapter):
    """
    Cloudflare D1 adapter communicating with the dedicated worker-d1-api over HTTPS.
    Uses Python standard-library urllib.request (zero external pip packages).
    """

    def __init__(self, worker_url: str, worker_secret: str, timeout: float = DEFAULT_WORKER_TIMEOUT_SECONDS):
        if not worker_url or not isinstance(worker_url, str):
            raise ConfigurationError("worker_url must be a non-empty string.")
        if not (worker_url.startswith("http://") or worker_url.startswith("https://")):
            raise ConfigurationError(f"Invalid worker_url '{worker_url}'. URL must begin with http:// or https://")
        if not worker_secret or not isinstance(worker_secret, str) or not worker_secret.strip():
            raise ConfigurationError("worker_secret must be a non-empty string.")

        self.worker_url = worker_url.rstrip("/")
        self.worker_secret = worker_secret.strip()
        self.timeout = timeout

    def _request(self, endpoint: str, method: str = "GET", payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executes an authenticated HTTP request to the Cloudflare Worker API.
        Enforces timeout, JSON encoding/decoding, and sanitized exception handling.
        """
        if not endpoint.startswith("/"):
            endpoint = "/" + endpoint
        url = f"{self.worker_url}{endpoint}"

        headers = {
            "Authorization": f"Bearer {self.worker_secret}",
            "User-Agent": "PeopleJuris-Python-Backend/1.0",
            "Accept": "application/json"
        }

        data_bytes = None
        if payload is not None:
            headers["Content-Type"] = "application/json; charset=utf-8"
            data_bytes = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                body = response.read().decode("utf-8")
                return json.loads(body)
        except urllib.error.HTTPError as e:
            raw_body = e.read().decode("utf-8", errors="ignore")
            parsed_body = None
            try:
                parsed_body = json.loads(raw_body)
            except Exception:
                pass

            err_detail = parsed_body.get("error", e.reason) if parsed_body else e.reason
            sanitized_detail = sanitize_secret(str(err_detail), self.worker_secret)

            if e.code == 404:
                raise RecordNotFoundError(f"Record not found: {sanitized_detail}")
            elif e.code == 409:
                # Conflict (e.g. recovery code already consumed or mutex collision)
                return {"success": False, "conflict": True, "error": sanitized_detail}
            elif e.code in (401, 403):
                raise D1WorkerError(f"Worker API authentication rejected (HTTP {e.code})")
            elif e.code >= 500:
                raise D1WorkerError(f"Worker API internal service error: HTTP {e.code}")
            else:
                raise D1WorkerError(f"Worker API returned HTTP {e.code}: {sanitized_detail}")
        except urllib.error.URLError as e:
            reason = str(e.reason).lower()
            if "timed out" in reason or isinstance(e.reason, TimeoutError):
                raise D1WorkerError("Worker API request timed out")
            sanitized_reason = sanitize_secret(str(e.reason), self.worker_secret)
            raise D1WorkerError(f"Worker API connection failed: {sanitized_reason}")
        except json.JSONDecodeError as e:
            raise D1WorkerError(f"Worker API returned malformed JSON response: {e}")
        except Exception as e:
            if isinstance(e, DatabaseError):
                raise
            sanitized_err = sanitize_secret(str(e), self.worker_secret)
            raise D1WorkerError(f"Unexpected Worker API error: {sanitized_err}")

    def init_database(self) -> None:
        """Verifies Worker and D1 health status and clears expired sessions."""
        try:
            health = self._request("/api/v1/health", method="GET")
        except DatabaseError as e:
            raise D1WorkerError(f"Cloudflare D1 Worker health check failed during initialization: {e}") from e

        if not health.get("success") or health.get("status") != "healthy":
            err_msg = health.get("error", "Worker reported unhealthy status")
            raise D1WorkerError(f"Cloudflare D1 Worker health check failed: {err_msg}")

        # Purge expired sessions on startup
        try:
            self.cleanup_expired_sessions()
        except Exception:
            pass

        print(f"[Database] Connected to Cloudflare D1 via Worker API at: {self.worker_url}")

    def get_admin_count(self) -> int:
        res = self._request("/api/v1/admins/count", method="GET")
        return int(res.get("count", 0))

    def get_admin_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        res = self._request("/api/v1/admins/get-by-username", method="POST", payload={"username": username.strip()})
        return res.get("admin")

    def get_admin_by_id(self, admin_id: int) -> Optional[Dict[str, Any]]:
        res = self._request("/api/v1/admins/get-by-id", method="POST", payload={"admin_id": admin_id})
        return res.get("admin")

    def get_admin_recovery_info(self, username: str) -> Optional[Dict[str, Any]]:
        res = self._request("/api/v1/admins/get-recovery-info", method="POST", payload={"username": username.strip()})
        return res.get("admin")

    def consume_recovery_code(self, admin_id: int, new_password_hash: str, updated_at: Optional[str] = None) -> bool:
        payload = {
            "admin_id": admin_id,
            "new_password_hash": new_password_hash
        }
        if updated_at:
            payload["updated_at"] = updated_at

        res = self._request("/api/v1/admins/consume-recovery-code", method="POST", payload=payload)
        if res.get("conflict"):
            return False
        return bool(res.get("success"))

    def update_admin_password(self, admin_id: int, new_password_hash: str,
                              keep_session_token: Optional[str] = None, updated_at: Optional[str] = None) -> bool:
        payload = {
            "admin_id": admin_id,
            "new_password_hash": new_password_hash
        }
        if keep_session_token:
            payload["keep_session_token"] = keep_session_token
        if updated_at:
            payload["updated_at"] = updated_at

        try:
            res = self._request("/api/v1/admins/update-password", method="POST", payload=payload)
            return bool(res.get("success"))
        except RecordNotFoundError:
            return False

    def regenerate_recovery_code(self, admin_id: int, recovery_code_hash: str, updated_at: Optional[str] = None) -> bool:
        payload = {
            "admin_id": admin_id,
            "recovery_code_hash": recovery_code_hash
        }
        if updated_at:
            payload["updated_at"] = updated_at

        try:
            res = self._request("/api/v1/admins/regenerate-recovery-code", method="POST", payload=payload)
            return bool(res.get("success"))
        except RecordNotFoundError:
            return False

    def upsert_admin(self, username: str, password_hash: str, recovery_code_hash: str,
                     must_change_password: bool = False, timestamp: Optional[str] = None) -> Dict[str, Any]:
        payload = {
            "username": username.strip(),
            "password_hash": password_hash,
            "recovery_code_hash": recovery_code_hash,
            "must_change_password": 1 if must_change_password else 0
        }
        if timestamp:
            payload["timestamp"] = timestamp

        res = self._request("/api/v1/admins/upsert-admin", method="POST", payload=payload)
        return {
            "admin_id": res.get("admin_id"),
            "action": res.get("action", "saved"),
            "message": res.get("message", "")
        }

    def create_session(self, token: str, admin_id: int, expires_at: str, created_at: str,
                       last_activity_at: Optional[str] = None) -> bool:
        payload = {
            "id": token,
            "admin_id": admin_id,
            "expires_at": expires_at,
            "created_at": created_at,
            "last_activity_at": last_activity_at or created_at
        }
        res = self._request("/api/v1/sessions/create", method="POST", payload=payload)
        return bool(res.get("success"))

    def validate_session(self, token: str, update_activity: bool = True,
                         current_time: Optional[str] = None,
                         inactivity_timeout_seconds: int = DEFAULT_INACTIVITY_TIMEOUT_SECONDS) -> Tuple[Optional[Dict[str, Any]], bool, Optional[str]]:
        if not token:
            return None, False, None

        if is_recently_expired(token):
            return None, True, token

        payload = {
            "token": token,
            "update_activity": update_activity,
            "inactivity_timeout_seconds": inactivity_timeout_seconds
        }
        if current_time:
            payload["current_time"] = current_time

        res = self._request("/api/v1/sessions/validate", method="POST", payload=payload)

        if res.get("valid"):
            admin_data = res.get("admin")
            return admin_data, False, token
        elif res.get("expired"):
            record_recently_expired(token)
            return None, True, token
        else:
            return None, False, None

    def delete_session(self, token: str) -> bool:
        if not token:
            return False
        res = self._request("/api/v1/sessions/delete", method="POST", payload={"token": token})
        return bool(res.get("success"))

    def cleanup_expired_sessions(self, current_time: Optional[str] = None,
                                 inactivity_timeout_seconds: int = DEFAULT_INACTIVITY_TIMEOUT_SECONDS) -> int:
        if current_time:
            now_utc = datetime.datetime.fromisoformat(current_time)
            if now_utc.tzinfo is None:
                now_utc = now_utc.replace(tzinfo=datetime.timezone.utc)
        else:
            now_utc = datetime.datetime.now(datetime.timezone.utc)
        now_iso = now_utc.isoformat()
        inactivity_cutoff_iso = (now_utc - datetime.timedelta(seconds=inactivity_timeout_seconds)).isoformat()

        payload = {
            "now_iso": now_iso,
            "inactivity_cutoff_iso": inactivity_cutoff_iso
        }

        res = self._request("/api/v1/sessions/cleanup-expired", method="POST", payload=payload)
        return int(res.get("deleted_count", 0))

    def get_public_newsletters(self) -> List[Dict[str, Any]]:
        res = self._request("/api/v1/newsletters/public", method="GET")
        return res.get("newsletters", [])

    def get_all_newsletters(self) -> List[Dict[str, Any]]:
        res = self._request("/api/v1/newsletters/all", method="GET")
        return res.get("newsletters", [])

    def get_newsletter_by_id(self, newsletter_id: int) -> Optional[Dict[str, Any]]:
        try:
            res = self._request(f"/api/v1/newsletters/{newsletter_id}", method="GET")
            return res.get("newsletter")
        except RecordNotFoundError:
            return None

    def create_newsletter(self, data: Dict[str, Any]) -> int:
        payload = {
            "title": data.get("title", "").strip(),
            "description": data.get("description", "").strip() if data.get("description") else None,
            "category": (data.get("category") or "corporate").strip().lower(),
            "issue_date": data.get("issue_date", "").strip(),
            "pdf_path": data.get("pdf_path", "").strip(),
            "cover_image_path": data.get("cover_image_path", "").strip(),
            "status": (data.get("status") or "published").strip().lower(),
            "is_latest": 1 if data.get("is_latest") in (1, "1", True) else 0
        }
        if data.get("created_at"):
            payload["created_at"] = data["created_at"]

        res = self._request("/api/v1/newsletters", method="POST", payload=payload)
        return int(res.get("newsletter_id", 0))

    def update_newsletter(self, newsletter_id: int, data: Dict[str, Any]) -> bool:
        payload = {}
        if "title" in data and data["title"] is not None:
            payload["title"] = data["title"].strip()
        if "description" in data:
            payload["description"] = data["description"].strip() if data["description"] else None
        if "category" in data and data["category"] is not None:
            payload["category"] = data["category"].strip().lower()
        if "issue_date" in data and data["issue_date"] is not None:
            payload["issue_date"] = data["issue_date"].strip()
        if "pdf_path" in data and data["pdf_path"] is not None:
            payload["pdf_path"] = data["pdf_path"].strip()
        if "cover_image_path" in data and data["cover_image_path"] is not None:
            payload["cover_image_path"] = data["cover_image_path"].strip()
        if "status" in data and data["status"] is not None:
            payload["status"] = data["status"].strip().lower()
        if "is_latest" in data:
            payload["is_latest"] = 1 if data["is_latest"] in (1, "1", True) else 0
        if "updated_at" in data:
            payload["updated_at"] = data["updated_at"]

        try:
            res = self._request(f"/api/v1/newsletters/{newsletter_id}", method="PUT", payload=payload)
            return bool(res.get("success"))
        except RecordNotFoundError:
            return False

    def delete_newsletter(self, newsletter_id: int) -> Optional[Dict[str, Any]]:
        try:
            res = self._request(f"/api/v1/newsletters/{newsletter_id}", method="DELETE")
            return res.get("files_to_cleanup")
        except RecordNotFoundError:
            return None

# ------------------------------------------------------------------------------
# FACTORY FUNCTION
# ------------------------------------------------------------------------------
_adapter_instance: Optional[DatabaseAdapter] = None

def get_db_adapter(reload: bool = False) -> DatabaseAdapter:
    """
    Factory function returning the active DatabaseAdapter based on PJ_DB_BACKEND.
    - Default: 'sqlite'
    - Supported: 'sqlite', 'd1'
    Fails fast with ConfigurationError if configuration is missing or invalid.
    """
    global _adapter_instance
    if _adapter_instance is not None and not reload:
        return _adapter_instance

    backend = os.environ.get("PJ_DB_BACKEND", "sqlite").strip().lower()

    if backend == "sqlite":
        db_path = os.environ.get("PJ_DB_PATH", DEFAULT_DB_PATH)
        _adapter_instance = SQLiteAdapter(db_path=db_path)
        return _adapter_instance

    elif backend == "d1":
        worker_url = os.environ.get("PJ_WORKER_API_URL") or os.environ.get("PJ_D1_WORKER_URL")
        worker_secret = os.environ.get("PJ_WORKER_API_SECRET") or os.environ.get("PJ_D1_WORKER_KEY")

        missing = []
        if not worker_url or not worker_url.strip():
            missing.append("PJ_WORKER_API_URL")
        if not worker_secret or not worker_secret.strip():
            missing.append("PJ_WORKER_API_SECRET")

        if missing:
            raise ConfigurationError(
                f"Missing required configuration for PJ_DB_BACKEND=d1: {', '.join(missing)}. "
                "Set PJ_WORKER_API_URL and PJ_WORKER_API_SECRET in your environment."
            )

        worker_url = worker_url.strip()
        worker_secret = worker_secret.strip()

        parsed = urllib.parse.urlparse(worker_url)
        scheme = (parsed.scheme or "").lower()
        hostname = (parsed.hostname or "").lower()

        if not scheme or not parsed.netloc:
            raise ConfigurationError(
                f"Invalid PJ_WORKER_API_URL: '{worker_url}'. URL must be a valid absolute URL with scheme and host."
            )

        if scheme not in ("http", "https"):
            raise ConfigurationError(
                f"Invalid PJ_WORKER_API_URL scheme: '{scheme}'. URL scheme must be http or https."
            )

        if scheme == "http" and hostname not in ("localhost", "127.0.0.1"):
            raise ConfigurationError(
                f"Insecure PJ_WORKER_API_URL: '{worker_url}'. Remote Worker hosts must use https://. "
                "Plain HTTP is only permitted for localhost or 127.0.0.1."
            )

        timeout = float(os.environ.get("PJ_WORKER_TIMEOUT_SECONDS", DEFAULT_WORKER_TIMEOUT_SECONDS))
        _adapter_instance = D1WorkerAdapter(worker_url=worker_url, worker_secret=worker_secret, timeout=timeout)
        return _adapter_instance

    else:
        raise ConfigurationError(
            f"Unsupported PJ_DB_BACKEND: '{backend}'. Allowed values are 'sqlite' or 'd1'."
        )
