"""
PEOPLEJURIS LLP — ENTERPRISE BACKEND SERVER & NEWSLETTER MANAGEMENT SYSTEM
Python 3.12+ Native Architecture (Zero External Dependencies Required)

Features:
- Full static file server for public website and assets.
- SQLite3 persistent relational database with automated schema and baseline migration.
- Cryptographically secure PBKDF2-HMAC-SHA256 password hashing (600,000 rounds).
- Single-use hashed backup recovery code architecture for password reset.
- HttpOnly, SameSite=Lax session management with automatic expiration.
- Brute-force login rate limiting (5 attempts per 15 minutes).
- Multipart/form-data upload engine with file type, magic byte, and size enforcement.
- Automated "Latest Addition" mutex and fallback promotion logic.
- RESTful public API for dynamic newsletter consumption.
"""

import os
import sys
import json
import time
import hmac
import hashlib
import secrets
import sqlite3
import mimetypes
import datetime
import urllib.parse
import traceback
from http import HTTPStatus
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

from db_adapter import (
    get_db_adapter,
    DatabaseAdapter,
    DatabaseError,
    D1WorkerError,
    ConfigurationError,
    RecordNotFoundError,
    RECENTLY_EXPIRED_TOKENS,
    record_recently_expired,
    is_recently_expired
)
from github_storage import (
    get_storage_backend,
    StorageBackend,
    GitHubStorageError,
    GitHubConfigError
)

# ------------------------------------------------------------------------------
# CONFIGURATION & CONSTANTS
# ------------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_PDF_DIR = os.path.join(BASE_DIR, "newsletters")
UPLOADS_COVER_DIR = os.path.join(BASE_DIR, "images", "newsletter-covers")
DB_PATH = os.environ.get("PJ_DB_PATH", os.path.join(DATA_DIR, "peoplejuris.db"))

DEFAULT_PORT = 8000
SESSION_COOKIE_NAME = "pj_admin_session"
SESSION_INACTIVITY_TIMEOUT_SECONDS = 15 * 60  # 15 minutes of inactivity (900 seconds)
SESSION_MAX_LIFETIME_SECONDS = 12 * 60 * 60    # 12 hours absolute session lifetime
PBKDF2_ITERATIONS = 600_000
MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024     # 25 MB
MAX_COVER_SIZE_BYTES = 8 * 1024 * 1024    # 8 MB
RATE_LIMIT_MAX_ATTEMPTS = 5
RATE_LIMIT_WINDOW_SECONDS = 15 * 60       # 15 minutes

# Initialize persistent data adapter (SQLite by default, Cloudflare D1 if PJ_DB_BACKEND=d1)
db = get_db_adapter()

def make_session_cookie(token: str, max_age: int = SESSION_INACTIVITY_TIMEOUT_SECONDS) -> str:
    """Generates a cross-site HttpOnly session cookie."""
    return (
        f"{SESSION_COOKIE_NAME}={token}; "
        f"Path=/; Max-Age={max_age}; "
        "HttpOnly; SameSite=None; Secure"
    )


def make_clear_session_cookie() -> str:
    """Clears the cross-site session cookie."""
    return (
        f"{SESSION_COOKIE_NAME}=; "
        "Path=/; Max-Age=0; "
        "HttpOnly; SameSite=None; Secure; "
        "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    )

# Rate limiting store: {ip_or_user: [timestamps]}
LOGIN_ATTEMPTS = {}

# Ensure required directories exist
for directory in [DATA_DIR, UPLOADS_PDF_DIR, UPLOADS_COVER_DIR]:
    os.makedirs(directory, exist_ok=True)

# ------------------------------------------------------------------------------
# SECURITY & CRYPTOGRAPHY UTILITIES
# ------------------------------------------------------------------------------
def hash_password(password: str, salt: bytes = None) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a cryptographically random salt."""
    if salt is None:
        salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2:sha256:{PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"

def verify_password(password: str, hashed_value: str) -> bool:
    """Verifies a plaintext password against a stored PBKDF2 hash using constant-time comparison."""
    try:
        method, salt_hex, hash_hex = hashed_value.split("$")
        parts = method.split(":")
        iterations = int(parts[2])
        salt = bytes.fromhex(salt_hex)
        expected_dk = bytes.fromhex(hash_hex)
        actual_dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual_dk, expected_dk)
    except Exception:
        return False

def hash_recovery_code(code: str) -> str:
    """Hashes a recovery code for secure database storage."""
    # Normalize by stripping hyphens and whitespace, converting to uppercase
    normalized = code.replace("-", "").strip().upper()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def generate_recovery_code() -> str:
    """Generates a secure 16-character alphanumeric backup recovery code formatted as XXXX-XXXX-XXXX-XXXX."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # omit ambiguous chars (0, O, 1, I)
    raw = "".join(secrets.choice(alphabet) for _ in range(16))
    return f"{raw[0:4]}-{raw[4:8]}-{raw[8:12]}-{raw[12:16]}"

def check_rate_limit(key: str) -> bool:
    """Checks whether an IP address or username has exceeded the allowed login attempts."""
    now = time.time()
    attempts = LOGIN_ATTEMPTS.get(key, [])
    # Keep only attempts inside the active window
    attempts = [t for t in attempts if now - t < RATE_LIMIT_WINDOW_SECONDS]
    LOGIN_ATTEMPTS[key] = attempts
    return len(attempts) < RATE_LIMIT_MAX_ATTEMPTS

def record_failed_attempt(key: str):
    """Records a failed login attempt for rate limiting."""
    LOGIN_ATTEMPTS.setdefault(key, []).append(time.time())

def clear_rate_limit(key: str):
    """Clears rate-limit history upon successful authentication."""
    if key in LOGIN_ATTEMPTS:
        del LOGIN_ATTEMPTS[key]

# ------------------------------------------------------------------------------
# DATABASE & DATA LAYER
# ------------------------------------------------------------------------------
def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_database():
    """Initializes the database schema and baseline data according to the active PJ_DB_BACKEND."""
    db.init_database()

def ensure_latest_addition_mutex(conn: sqlite3.Connection, target_id: int):
    """Enforces that only one published newsletter can be marked as the latest addition."""
    cursor = conn.cursor()
    cursor.execute("UPDATE newsletters SET is_latest = 0 WHERE id != ?", (target_id,))
    cursor.execute("UPDATE newsletters SET is_latest = 1 WHERE id = ? AND status = 'published'", (target_id,))
    conn.commit()

def promote_fallback_latest(conn: sqlite3.Connection):
    """If no published newsletter is marked latest, automatically promotes the newest published issue."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM newsletters WHERE status = 'published' AND is_latest = 1")
    if cursor.fetchone()["cnt"] == 0:
        cursor.execute("SELECT id FROM newsletters WHERE status = 'published' ORDER BY issue_date DESC, id DESC LIMIT 1")
        row = cursor.fetchone()
        if row:
            cursor.execute("UPDATE newsletters SET is_latest = 1 WHERE id = ?", (row["id"],))
            conn.commit()

# ------------------------------------------------------------------------------
# MULTIPART / FORM-DATA PARSER
# ------------------------------------------------------------------------------
def parse_multipart_form(rfile, content_length: int, boundary: bytes):
    """
    Robust, streaming multipart/form-data parser for file uploads and text fields.
    Validates magic bytes for PDFs and images to reject executable / unsafe files.
    """
    fields = {}
    files = {}

    delimiter = b"--" + boundary
    end_delimiter = delimiter + b"--"

    raw_data = rfile.read(content_length)
    parts = raw_data.split(delimiter)

    for part in parts:
        part = part.strip()
        if not part or part == b"--":
            continue

        if b"\r\n\r\n" not in part:
            continue

        headers_raw, body = part.split(b"\r\n\r\n", 1)
        # Strip trailing \r\n if present
        if body.endswith(b"\r\n"):
            body = body[:-2]

        headers_text = headers_raw.decode("utf-8", errors="ignore")
        headers = {}
        for line in headers_text.split("\r\n"):
            if ":" in line:
                k, v = line.split(":", 1)
                headers[k.strip().lower()] = v.strip()

        cd = headers.get("content-disposition", "")
        if not cd.startswith("form-data"):
            continue

        # Extract name and filename attributes
        cd_parts = [p.strip() for p in cd.split(";")]
        field_name = None
        filename = None

        for p in cd_parts:
            if p.startswith("name="):
                field_name = p[5:].strip('"\'')
            elif p.startswith("filename="):
                filename = p[9:].strip('"\'')

        if not field_name:
            continue

        if filename:
            # File field
            files[field_name] = {
                "filename": os.path.basename(filename),
                "content_type": headers.get("content-type", "application/octet-stream"),
                "bytes": body
            }
        else:
            # Plain text field
            fields[field_name] = body.decode("utf-8", errors="replace")

    return fields, files

# ------------------------------------------------------------------------------
# HTTP REQUEST HANDLER
# ------------------------------------------------------------------------------
class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

class PeopleJurisHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self._validated_token = None
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    # --------------------------------------------------------------------------
    # HELPER METHODS
    # --------------------------------------------------------------------------
    def send_json(self, data, status: int = 200, extra_headers: dict = None):
        payload = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, private")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")

        # Handle CORS
        origin = self.headers.get("Origin")
        host = self.headers.get("Host")
        allowed_origins = [o.strip().lower() for o in os.environ.get("PJ_ALLOWED_ORIGINS", "").split(",") if o.strip()]
        if origin and origin != "null":
            parsed = urllib.parse.urlparse(origin)
            is_same_host = host and parsed.netloc.lower() == host.lower()
            is_explicitly_allowed = origin.lower() in allowed_origins or parsed.netloc.lower() in allowed_origins
            is_local = parsed.hostname in ("localhost", "127.0.0.1")
            if is_same_host or is_explicitly_allowed or is_local:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Access-Control-Allow-Credentials", "true")

        headers_to_send = {}
        # Slide session cookie on successful authenticated API calls if not overridden
        if self._validated_token and status < 400:
            headers_to_send["Set-Cookie"] = make_session_cookie(self._validated_token)

        if extra_headers:
            headers_to_send.update(extra_headers)

        for k, v in headers_to_send.items():
            self.send_header(k, v)

        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        """Handles CORS preflight requests."""
        self.send_response(204)
        origin = self.headers.get("Origin", "*")
        self.send_header("Access-Control-Allow-Origin", origin if origin != "null" else "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Max-Age", "86400")
        super().end_headers()

    def end_headers(self):
        if hasattr(self, "path") and (self.path.endswith(".html") or self.path.endswith(".js")):
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, private")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def send_error_json(self, message: str, status: int = 400, extra_headers: dict = None):
        self.send_json({"success": False, "error": message}, status=status, extra_headers=extra_headers)

    def get_client_ip(self) -> str:
        return self.client_address[0] if self.client_address else "127.0.0.1"

    def check_csrf(self) -> bool:
        """Validates that mutating requests originate from the same host or explicitly allowed origins."""
        origin = self.headers.get("Origin")
        host = self.headers.get("Host")
        allowed_origins = [o.strip().lower() for o in os.environ.get("PJ_ALLOWED_ORIGINS", "").split(",") if o.strip()]

        if origin and origin != "null":
            parsed_origin = urllib.parse.urlparse(origin)
            if parsed_origin.netloc and host:
                if parsed_origin.netloc.lower() == host.lower():
                    return True
                if origin.lower() in allowed_origins or parsed_origin.netloc.lower() in allowed_origins:
                    return True
                if parsed_origin.hostname in ("localhost", "127.0.0.1"):
                    return True
                return False
            return True

        referer = self.headers.get("Referer")
        if referer:
            parsed_ref = urllib.parse.urlparse(referer)
            if parsed_ref.netloc and host:
                if parsed_ref.netloc.lower() == host.lower():
                    return True
                if referer.lower() in allowed_origins or parsed_ref.netloc.lower() in allowed_origins:
                    return True
                if parsed_ref.hostname in ("localhost", "127.0.0.1"):
                    return True
                return False
        return True

    def get_session_token(self) -> str:
        cookie_header = self.headers.get("Cookie", "")
        cookies = [c.strip() for c in cookie_header.split(";") if c.strip()]
        for c in cookies:
            if "=" in c:
                name, val = c.split("=", 1)
                if name.strip() == SESSION_COOKIE_NAME:
                    return val.strip()
        return None

    def validate_session(self, update_activity: bool = True):
        """
        Validates session cookie against active sessions in the database.
        Returns:
            (admin_dict, is_expired, token)
        - If valid: (admin_dict, False, token)
        - If expired (inactivity > 15m or lifetime > 12h): (None, True, token)
        - If missing or invalid token: (None, False, None)
        """
        token = self.get_session_token()
        if not token:
            return None, False, None

        try:
            admin_data, is_expired, validated_token = db.validate_session(
                token,
                update_activity=update_activity,
                inactivity_timeout_seconds=SESSION_INACTIVITY_TIMEOUT_SECONDS
            )
            if admin_data:
                self._validated_token = validated_token
            return admin_data, is_expired, validated_token
        except DatabaseError as e:
            print(f"[Database Error] Session validation failed: {e}")
            return None, False, None

    def get_authenticated_admin(self, update_activity: bool = True):
        """Verifies session and returns admin info dict if valid, else None."""
        admin, is_expired, token = self.validate_session(update_activity=update_activity)
        return admin

    # --------------------------------------------------------------------------
    # ROUTING: GET
    # --------------------------------------------------------------------------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. Protected Admin Dashboard Page (Server-Side Authentication Enforcement)
        if path in ("/admin-dashboard.html", "/admin-dashboard"):
            admin, is_expired, token = self.validate_session(update_activity=True)
            if not admin:
                redirect_url = "/admin-login.html?expired=1" if is_expired else "/admin-login.html"
                self.send_response(302)
                self.send_header("Location", redirect_url)
                self.send_header("Set-Cookie", make_clear_session_cookie())
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, private")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
                self.end_headers()
                return

            # Admin is authenticated: serve admin-dashboard.html with sliding cookie & no-cache headers
            file_path = os.path.join(BASE_DIR, "admin-dashboard.html")
            try:
                with open(file_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Set-Cookie", make_session_cookie(token))
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0, private")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
                self.end_headers()
                self.wfile.write(content)
            except Exception as e:
                self.send_error(500, f"Error reading dashboard file: {e}")
            return

        # 2. Public API: Get Published Newsletters
        if path == "/api/newsletters":
            self.handle_public_newsletters()
            return

        # 3. Admin API: Get Current Authenticated Admin Identity
        if path == "/api/admin/me":
            admin, is_expired, token = self.validate_session(update_activity=True)
            if not admin:
                if is_expired:
                    self.send_json(
                        {"success": False, "error": "Administrator session expired after 15 minutes of inactivity. Please sign in again.", "expired": True},
                        status=401,
                        extra_headers={"Set-Cookie": make_clear_session_cookie()}
                    )
                else:
                    self.send_json(
                        {"success": False, "error": "Unauthenticated", "expired": False},
                        status=401,
                        extra_headers={"Set-Cookie": make_clear_session_cookie()}
                    )
                return
            self.send_json({"success": True, "admin": admin})
            return

        # 4. Admin API: List All Newsletters (Published & Drafts)
        if path == "/api/admin/newsletters":
            admin, is_expired, token = self.validate_session(update_activity=True)
            if not admin:
                error_msg = "Administrator session expired after 15 minutes of inactivity." if is_expired else "Unauthorized"
                self.send_json(
                    {"success": False, "error": error_msg, "expired": is_expired},
                    status=401,
                    extra_headers={"Set-Cookie": make_clear_session_cookie()}
                )
                return
            self.handle_admin_newsletters()
            return

        # 5. Standard Static File Serving for Public Pages & Assets
        super().do_GET()

    # --------------------------------------------------------------------------
    # ROUTING: POST
    # --------------------------------------------------------------------------
    def do_POST(self):
        if not self.check_csrf():
            self.send_error_json("Cross-Site Request Forgery (CSRF) validation failed.", status=403)
            return

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. Admin Login
        if path == "/api/admin/login":
            self.handle_login()
            return

        # 2. Admin Logout
        if path == "/api/admin/logout":
            self.handle_logout()
            return

        # 3. Forgot Password / Password Reset via Backup Code
        if path == "/api/admin/forgot-password":
            self.handle_forgot_password()
            return

        # 4. Authenticated Password Change
        if path == "/api/admin/change-password":
            self.handle_change_password()
            return

        # 5. Authenticated Regeneration of Recovery Code
        if path == "/api/admin/regenerate-recovery-code":
            self.handle_regenerate_recovery_code()
            return

        # 6. Admin Create Newsletter (Multipart Upload)
        if path == "/api/admin/newsletters":
            self.handle_create_newsletter()
            return

        self.send_error_json("Endpoint Not Found", status=404)

    # --------------------------------------------------------------------------
    # ROUTING: PUT / DELETE
    # --------------------------------------------------------------------------
    def do_PUT(self):
        if not self.check_csrf():
            self.send_error_json("Cross-Site Request Forgery (CSRF) validation failed.", status=403)
            return

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/admin/newsletters/"):
            newsletter_id_str = path.split("/")[-1]
            try:
                newsletter_id = int(newsletter_id_str)
                self.handle_update_newsletter(newsletter_id)
            except ValueError:
                self.send_error_json("Invalid newsletter ID", status=400)
            return

        self.send_error_json("Endpoint Not Found", status=404)

    def do_DELETE(self):
        if not self.check_csrf():
            self.send_error_json("Cross-Site Request Forgery (CSRF) validation failed.", status=403)
            return

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/admin/newsletters/"):
            newsletter_id_str = path.split("/")[-1]
            try:
                newsletter_id = int(newsletter_id_str)
                self.handle_delete_newsletter(newsletter_id)
            except ValueError:
                self.send_error_json("Invalid newsletter ID", status=400)
            return

        self.send_error_json("Endpoint Not Found", status=404)

    # --------------------------------------------------------------------------
    # HANDLERS: PUBLIC NEWSLETTERS
    # --------------------------------------------------------------------------
    def handle_public_newsletters(self):
        """Returns all published newsletters ordered by latest addition first, then publication date descending."""
        try:
            rows = db.get_public_newsletters()
            self.send_json({"success": True, "newsletters": rows})
        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json("Failed to load newsletters. Please try again later.", status=503)

    # --------------------------------------------------------------------------
    # HANDLERS: AUTHENTICATION & SESSIONS
    # --------------------------------------------------------------------------
    def handle_login(self):
        ip = self.get_client_ip()
        if not check_rate_limit(ip):
            self.send_error_json("Too many failed login attempts. Please wait 15 minutes before trying again.", status=429)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
            username = body.get("username", "").strip()
            password = body.get("password", "")
        except Exception:
            self.send_error_json("Invalid request body", status=400)
            return

        if not username or not password:
            self.send_error_json("Username and password are required", status=400)
            return

        try:
            admin = db.get_admin_by_username(username)
        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json("Authentication service temporarily unavailable.", status=503)
            return

        if not admin or not verify_password(password, admin["password_hash"]):
            record_failed_attempt(ip)
            self.send_error_json("Invalid username or password", status=401)
            return

        # Successful login: clear rate limiting and generate secure session
        clear_rate_limit(ip)
        session_token = secrets.token_hex(32)
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        expires_dt = now_dt + datetime.timedelta(seconds=SESSION_MAX_LIFETIME_SECONDS)
        now_iso = now_dt.isoformat()

        try:
            db.create_session(session_token, admin["id"], expires_dt.isoformat(), now_iso, now_iso)
        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json("Failed to initialize session.", status=503)
            return

        # Set secure HttpOnly cookie with 15-minute inactivity Max-Age
        cookie_header = make_session_cookie(session_token, max_age=SESSION_INACTIVITY_TIMEOUT_SECONDS)
        self.send_json({
            "success": True,
            "message": "Login successful",
            "must_change_password": bool(admin["must_change_password"])
        }, extra_headers={"Set-Cookie": cookie_header})

    def handle_logout(self):
        token = self.get_session_token()
        if token:
            try:
                db.delete_session(token)
            except DatabaseError as e:
                print(f"[Database Error] {e}")

        # Clear cookie
        cookie_header = make_clear_session_cookie()
        self.send_json({"success": True, "message": "Logged out successfully"}, extra_headers={"Set-Cookie": cookie_header})

    # --------------------------------------------------------------------------
    # HANDLERS: FORGOT PASSWORD & RECOVERY CODE
    # --------------------------------------------------------------------------
    def handle_forgot_password(self):
        """Allows an administrator to reset their password using their single-use backup recovery code."""
        ip = self.get_client_ip()
        if not check_rate_limit(f"pwd_reset:{ip}"):
            self.send_error_json("Too many reset attempts. Please wait 15 minutes.", status=429)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
            username = body.get("username", "").strip()
            recovery_code = body.get("recovery_code", "").strip()
            new_password = body.get("new_password", "")
        except Exception:
            self.send_error_json("Invalid request body", status=400)
            return

        if not username or not recovery_code or not new_password:
            self.send_error_json("Username, recovery code, and new password are required.", status=400)
            return

        if len(new_password) < 8:
            self.send_error_json("New password must be at least 8 characters long.", status=400)
            return

        provided_code_hash = hash_recovery_code(recovery_code)

        try:
            admin = db.get_admin_recovery_info(username)
        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json("Database service temporarily unavailable.", status=503)
            return

        if not admin or admin.get("recovery_code_used") or not admin.get("recovery_code_hash"):
            record_failed_attempt(f"pwd_reset:{ip}")
            self.send_error_json("Invalid username or recovery code.", status=400)
            return

        # Constant-time comparison of recovery code hash
        if not hmac.compare_digest(admin["recovery_code_hash"], provided_code_hash):
            record_failed_attempt(f"pwd_reset:{ip}")
            self.send_error_json("Invalid username or recovery code.", status=400)
            return

        # Valid recovery code: update password, mark code used, invalidate active sessions
        new_hash = hash_password(new_password)
        try:
            consumed = db.consume_recovery_code(admin["id"], new_hash)
            if not consumed:
                record_failed_attempt(f"pwd_reset:{ip}")
                self.send_error_json("Recovery code has already been consumed or admin not found.", status=400)
                return
        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json("Failed to reset password. Please try again later.", status=503)
            return

        clear_rate_limit(f"pwd_reset:{ip}")
        self.send_json({
            "success": True,
            "message": "Password successfully reset. You may now log in with your new password. Please regenerate a new backup recovery code upon login."
        }, extra_headers={"Set-Cookie": make_clear_session_cookie()})

    def handle_change_password(self):
        admin, is_expired, token = self.validate_session(update_activity=True)
        if not admin:
            error_msg = "Administrator session expired after 15 minutes of inactivity." if is_expired else "Unauthorized"
            self.send_json(
                {"success": False, "error": error_msg, "expired": is_expired},
                status=401,
                extra_headers={"Set-Cookie": make_clear_session_cookie()}
            )
            return

        content_length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
            current_password = body.get("current_password", "")
            new_password = body.get("new_password", "")
        except Exception:
            self.send_error_json("Invalid request body", status=400)
            return

        if not current_password or not new_password:
            self.send_error_json("Current and new passwords are required.", status=400)
            return

        if len(new_password) < 8:
            self.send_error_json("New password must be at least 8 characters long.", status=400)
            return

        try:
            stored = db.get_admin_by_id(admin["id"])
        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json("Database service temporarily unavailable.", status=503)
            return

        if not stored or not verify_password(current_password, stored["password_hash"]):
            self.send_error_json("Incorrect current password.", status=400)
            return

        new_hash = hash_password(new_password)
        try:
            success = db.update_admin_password(admin["id"], new_hash, keep_session_token=token)
            if not success:
                self.send_error_json("Admin not found.", status=404)
                return
        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json("Failed to update password.", status=503)
            return

        self.send_json({"success": True, "message": "Password updated successfully."})

    def handle_regenerate_recovery_code(self):
        """Generates a fresh single-use backup recovery code for the authenticated administrator."""
        admin = self.get_authenticated_admin()
        if not admin:
            self.send_error_json("Unauthorized", status=401)
            return

        new_code = generate_recovery_code()
        new_hash = hash_recovery_code(new_code)

        try:
            success = db.regenerate_recovery_code(admin["id"], new_hash)
            if not success:
                self.send_error_json("Admin not found.", status=404)
                return
        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json("Failed to update recovery code.", status=503)
            return

        self.send_json({
            "success": True,
            "recovery_code": new_code,
            "message": "New recovery code generated. Store it safely in an offline location. This code will only be shown once."
        })

    # --------------------------------------------------------------------------
    # HANDLERS: ADMIN NEWSLETTER MANAGEMENT
    # --------------------------------------------------------------------------
    def handle_admin_newsletters(self):
        try:
            rows = db.get_all_newsletters()
            self.send_json({"success": True, "newsletters": rows})
        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json("Failed to load newsletters. Please try again later.", status=503)

    def handle_create_newsletter(self):
        admin = self.get_authenticated_admin()
        if not admin:
            self.send_error_json("Unauthorized", status=401)
            return

        content_type = self.headers.get("Content-Type", "")
        if not content_type.startswith("multipart/form-data"):
            self.send_error_json("Request must be multipart/form-data", status=400)
            return

        boundary = content_type.split("boundary=")[-1].strip().encode("utf-8")
        content_length = int(self.headers.get("Content-Length", 0))

        try:
            fields, files = parse_multipart_form(self.rfile, content_length, boundary)
        except Exception as e:
            self.send_error_json(f"Failed to parse form: {e}", status=400)
            return

        title = fields.get("title", "").strip()
        issue_date = fields.get("issue_date", "").strip()
        description = fields.get("description", "").strip()
        category = fields.get("category", "corporate").strip().lower()
        status = fields.get("status", "published").strip().lower()
        is_latest = 1 if fields.get("is_latest") in ("true", "1", "on") else 0

        if not title or not issue_date:
            self.send_error_json("Title and Issue Date are required.", status=400)
            return

        if "pdf_file" not in files:
            self.send_error_json("A newsletter PDF file is required.", status=400)
            return

        # Resolve storage backend (GitHub or Local)
        try:
            storage = get_storage_backend()
        except GitHubConfigError as e:
            self.send_error_json(f"Storage configuration error: {e}", status=500)
            return

        # 1. Validate and save PDF file
        pdf_info = files["pdf_file"]
        pdf_bytes = pdf_info["bytes"]

        if len(pdf_bytes) > MAX_PDF_SIZE_BYTES:
            self.send_error_json("PDF file exceeds maximum allowed size (25MB).", status=400)
            return

        if not pdf_bytes.startswith(b"%PDF-"):
            self.send_error_json("Uploaded file is not a valid PDF document.", status=400)
            return

        safe_stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        rand_token = secrets.token_hex(4)
        pdf_filename = f"newsletter_{safe_stamp}_{rand_token}.pdf"

        try:
            pdf_storage_res = storage.save_pdf(pdf_bytes, pdf_filename)
        except GitHubStorageError as e:
            self.send_error_json(f"Failed to upload PDF to storage: {e}", status=502)
            return
        except Exception as e:
            self.send_error_json(f"Unexpected error storing PDF file: {e}", status=500)
            return

        relative_pdf_path = pdf_storage_res["url"]

        # 2. Validate and save Cover Image (if provided)
        relative_cover_path = "images/newsletter-covers/September-2026.jpeg"  # Fallback default cover
        if "cover_file" in files and len(files["cover_file"]["bytes"]) > 0:
            cover_info = files["cover_file"]
            cover_bytes = cover_info["bytes"]

            if len(cover_bytes) > MAX_COVER_SIZE_BYTES:
                self.send_error_json("Cover image exceeds maximum allowed size (8MB).", status=400)
                return

            # Check magic bytes for JPEG / PNG / WebP
            ext = ".jpeg"
            if cover_bytes.startswith(b"\xFF\xD8\xFF"):
                ext = ".jpeg"
            elif cover_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
                ext = ".png"
            elif cover_bytes.startswith(b"RIFF") and b"WEBP" in cover_bytes[:16]:
                ext = ".webp"
            else:
                self.send_error_json("Invalid cover image format. Allowed formats: JPEG, PNG, WebP.", status=400)
                return

            cover_filename = f"cover_{safe_stamp}_{rand_token}{ext}"
            try:
                cover_storage_res = storage.save_cover(cover_bytes, cover_filename)
                relative_cover_path = cover_storage_res["url"]
            except GitHubStorageError as e:
                print(f"[Storage Partial Failure] PDF saved as '{pdf_storage_res['path']}', but cover failed: {e}")
                self.send_error_json(
                    f"Partial upload failure: PDF committed as '{pdf_storage_res['path']}', but cover image upload failed: {e}",
                    status=502
                )
                return
            except Exception as e:
                print(f"[Storage Partial Failure] PDF saved as '{pdf_storage_res['path']}', but cover failed unexpectedly: {e}")
                self.send_error_json(
                    f"Partial upload failure: PDF committed, but cover image failed: {e}",
                    status=500
                )
                return

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        newsletter_data = {
            "title": title,
            "description": description,
            "category": category,
            "issue_date": issue_date,
            "pdf_path": relative_pdf_path,
            "cover_image_path": relative_cover_path,
            "status": status,
            "is_latest": is_latest,
            "created_at": now
        }
        try:
            new_id = db.create_newsletter(newsletter_data)
        except DatabaseError as e:
            print(f"[Database Error after storage commit] {e}. Committed files: PDF={relative_pdf_path}, Cover={relative_cover_path}")
            self.send_error_json(
                f"Failed to record newsletter in database after files were committed to storage. PDF: {relative_pdf_path}",
                status=503
            )
            return

        self.send_json({
            "success": True,
            "message": "Newsletter created successfully.",
            "newsletter_id": new_id,
            "pdf_path": relative_pdf_path,
            "cover_image_path": relative_cover_path
        }, status=201)

    def handle_update_newsletter(self, newsletter_id: int):
        admin = self.get_authenticated_admin()
        if not admin:
            self.send_error_json("Unauthorized", status=401)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except Exception:
            self.send_error_json("Invalid JSON body", status=400)
            return

        try:
            success = db.update_newsletter(newsletter_id, body)
            if not success:
                self.send_error_json("Newsletter not found", status=404)
                return
        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json("Failed to update newsletter.", status=503)
            return

        self.send_json({"success": True, "message": "Newsletter updated successfully."})


    def handle_delete_newsletter(self, newsletter_id: int):
        admin = self.get_authenticated_admin()
        if not admin:
            self.send_error_json("Unauthorized", status=401)
            return

        try:
            # Read the newsletter before deleting its database record.
            newsletter = db.get_newsletter_by_id(newsletter_id)
            if newsletter is None:
                self.send_error_json("Newsletter not found", status=404)
                return

            storage = get_storage_backend()

            # Collect the newsletter assets that need cleanup.
            paths_to_cleanup = [
                newsletter.get("pdf_path"),
                newsletter.get("cover_image_path"),
            ]

            # Preserve the fallback/default cover.
            default_cover_path = (
                "images/newsletter-covers/September-2026.jpeg"
            )

            for asset_path in paths_to_cleanup:
                if not asset_path:
                    continue
                clean_path = asset_path.strip()

                # Convert a raw GitHub URL to a repository-relative path.
                raw_prefix = (
                    "https://raw.githubusercontent.com/"
                    f"{storage.owner}/{storage.repo}/{storage.branch}/"
                )

                if clean_path.startswith(raw_prefix):
                    clean_path = clean_path[len(raw_prefix):]
                elif clean_path.startswith("https://raw.githubusercontent.com/"):
                    raise ValueError(
                        "Newsletter asset URL belongs to an unexpected "
                        "GitHub repository or branch."
                    )
                else:
                    clean_path = clean_path.lstrip("/")


                # Never delete the shared default cover.
                if clean_path == default_cover_path:
                    continue

                # Only delete assets inside the expected directories.
                if not (
                    clean_path.startswith("newsletters/")
                    or clean_path.startswith("images/newsletter-covers/")
                ):
                    raise ValueError(
                        f"Unexpected newsletter asset path: {clean_path}"
                    )

                storage.delete_file(clean_path)

            # Delete the database record only after asset cleanup succeeds.
            files_to_cleanup = db.delete_newsletter(newsletter_id)

            if files_to_cleanup is None:
                self.send_error_json("Newsletter not found", status=404)
                return

        except DatabaseError as e:
            print(f"[Database Error] {e}")
            self.send_error_json(
                "Failed to delete newsletter.",
                status=503
            )
            return
        except Exception as e:
            print(f"[Newsletter Deletion Error] {e}", flush=True)
            traceback.print_exc()
            self.send_error_json(
                "Failed to delete newsletter assets. The newsletter record was not deleted.",
                status=503
            )
            return

        self.send_json({
            "success": True,
            "message": "Newsletter deleted successfully."
        })


# ------------------------------------------------------------------------------
# SETUP CLI: INITIAL SECURE ADMINISTRATOR CREATION
# ------------------------------------------------------------------------------
def setup_initial_admin():
    """Interactive / CLI setup for the initial administrator account."""
    init_database()
    backend_name = os.environ.get("PJ_DB_BACKEND", "sqlite").upper()
    print("\n" + "="*70)
    print(f" PEOPLEJURIS LLP — SECURE ADMINISTRATOR INITIALIZATION [{backend_name}]")
    print("="*70)

    username = os.environ.get("PJ_ADMIN_USER")
    password = os.environ.get("PJ_ADMIN_PASS")

    if not username:
        username = input("Enter Administrator Username [default: admin]: ").strip() or "admin"

    must_change = False
    if not password:
        prompt_pass = input("Enter Administrator Password (leave blank to generate a temporary password): ").strip()
        if not prompt_pass:
            password = secrets.token_urlsafe(12)
            must_change = True
            print(f"\n[Generated Temporary Password]: {password}")
            print("(!) Administrator will be forced to change this password upon first login.")
        else:
            password = prompt_pass

    recovery_code = generate_recovery_code()
    recovery_hash = hash_recovery_code(recovery_code)
    pass_hash = hash_password(password)

    try:
        res = db.upsert_admin(username, pass_hash, recovery_hash, must_change_password=must_change)
        action = res.get("action", "saved")
        if action == "updated":
            print(f"\n[Success] Existing administrator account '{username}' updated successfully.")
        else:
            print(f"\n[Success] Administrator account '{username}' created successfully.")
    except DatabaseError as e:
        print(f"\n[Error] Failed to initialize administrator: {e}")
        sys.exit(1)

    print("\n" + "-"*70)
    print(" (!) CRITICAL: WRITE DOWN YOUR BACKUP RECOVERY CODE NOW")
    print(f" BACKUP RECOVERY CODE:  {recovery_code}")
    print(" This single-use code is stored only as a cryptographic hash.")
    print(" It will NEVER be shown again and allows recovery if password is lost.")
    print("-" * 70 + "\n")

# ------------------------------------------------------------------------------
# SERVER ENTRY POINT
# ------------------------------------------------------------------------------
def run_server(port: int = None, host: str = None):
    init_database()

    # Automatically check if at least one admin exists; if not, create a default secure setup
    try:
        admin_count = db.get_admin_count()
    except DatabaseError as e:
        print(f"[Database Error] Could not query administrator count: {e}")
        admin_count = -1

    if admin_count == 0:
        print("[Security Notice] No administrator accounts detected. Initializing default admin...")
        temp_pass = "welcome123"
        code = generate_recovery_code()
        code_hash = hash_recovery_code(code)
        p_hash = hash_password(temp_pass)
        try:
            db.upsert_admin("admin", p_hash, code_hash, must_change_password=True)
            print("="*70)
            print(" [AUTOMATIC INITIAL ADMIN SETUP]")
            print(f" Username:      admin")
            print(f" Temp Password: {temp_pass}  (Requires immediate change on first login)")
            print(f" Recovery Code: {code}")
            print("="*70)
        except DatabaseError as e:
            print(f"[Warning] Failed to auto-provision initial admin: {e}")

    if port is None:
        port = int(os.environ.get("PORT", DEFAULT_PORT))

    if host is None:
        # In cloud environments (PORT specified) or containers, listen on 0.0.0.0 so external proxy routes traffic
        # Locally without PORT, default to 127.0.0.1 to avoid dual-stack socket conflicts
        host = os.environ.get("PJ_HOST", "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1")

    server = ThreadedHTTPServer((host, port), PeopleJurisHandler)
    backend_mode = os.environ.get("PJ_DB_BACKEND", "sqlite").lower()
    print(f"\n[PeopleJuris Server Running] Serving on http://{host}:{port}")
    print(f"- Public Website:     http://{host}:{port}/index.html")
    print(f"- Newsletter Page:    http://{host}:{port}/newsletter.html")
    print(f"- Administrator Login: http://{host}:{port}/admin-login.html")
    if backend_mode == "d1":
        worker_target = getattr(db, "worker_url", "Cloudflare Worker")
        print(f"- Database Backend:   Cloudflare D1 via Worker API ({worker_target})\n")
    else:
        print(f"- Database Backend:   SQLite ({getattr(db, 'db_path', DB_PATH)})\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server shutting down gracefully...]")
        server.server_close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--setup-admin":
        setup_initial_admin()
    else:
        port = int(os.environ.get("PORT", DEFAULT_PORT))
        if len(sys.argv) > 1 and sys.argv[1].isdigit():
            port = int(sys.argv[1])
        run_server(port)
