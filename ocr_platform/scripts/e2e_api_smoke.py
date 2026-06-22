#!/usr/bin/env python3
"""Live end-to-end API smoke test against a running server."""

from __future__ import annotations

import json
import os
import sys
import time
import uuid
from dataclasses import dataclass, field

import httpx

BASE = os.environ.get("E2E_API_BASE", "http://127.0.0.1:8003").rstrip("/")
TIMEOUT = float(os.environ.get("E2E_TIMEOUT", "30"))


@dataclass
class Results:
    passed: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)

    def ok(self, name: str) -> None:
        self.passed.append(name)
        print(f"  ✓ {name}")

    def fail(self, name: str, detail: str) -> None:
        self.failed.append(f"{name}: {detail}")
        print(f"  ✗ {name} — {detail}")

    def skip(self, name: str, reason: str) -> None:
        self.skipped.append(f"{name}: {reason}")
        print(f"  ○ {name} (skipped: {reason})")


def main() -> int:
    r = Results()
    email = f"e2e_{uuid.uuid4().hex[:10]}@example.com"
    password = "E2eTestPass123!"
    access_token: str | None = None
    api_key: str | None = None
    doc_id: str | None = None
    job_id: str | None = None

    print(f"\nPlanet OCR E2E smoke test → {BASE}\n")

    with httpx.Client(base_url=BASE, timeout=TIMEOUT) as client:
        # ── Root health ───────────────────────────────────────────────────
        print("Health & status")
        for path in ("/health", "/health/ready"):
            try:
                res = client.get(path)
                if res.status_code == 200 and res.json().get("status"):
                    r.ok(path)
                else:
                    r.fail(path, f"status {res.status_code} {res.text[:120]}")
            except Exception as exc:
                r.fail(path, str(exc))

        try:
            res = client.get("/api/v1/status/")
            if res.status_code == 200 and "version" in res.json():
                r.ok("GET /api/v1/status/")
            else:
                r.fail("GET /api/v1/status/", res.text[:120])
        except Exception as exc:
            r.fail("GET /api/v1/status/", str(exc))

        # ── Auth ──────────────────────────────────────────────────────────
        print("\nAuth")
        try:
            res = client.post(
                "/api/v1/auth/register/",
                json={"email": email, "password": password, "full_name": "E2E Tester"},
            )
            if res.status_code == 201:
                body = res.json()
                access_token = body["access_token"]
                refresh_token = body["refresh_token"]
                r.ok("POST /api/v1/auth/register/")
            else:
                r.fail("POST /api/v1/auth/register/", f"{res.status_code} {res.text[:120]}")
                refresh_token = None
        except Exception as exc:
            r.fail("POST /api/v1/auth/register/", str(exc))
            refresh_token = None

        if access_token:
            try:
                res = client.post("/api/v1/auth/login/", json={"email": email, "password": password})
                if res.status_code == 200:
                    r.ok("POST /api/v1/auth/login/")
                else:
                    r.fail("POST /api/v1/auth/login/", res.text[:120])
            except Exception as exc:
                r.fail("POST /api/v1/auth/login/", str(exc))

            headers = {"Authorization": f"Bearer {access_token}"}
            try:
                res = client.get("/api/v1/auth/me/", headers=headers)
                if res.status_code == 200 and res.json().get("email") == email:
                    r.ok("GET /api/v1/auth/me/")
                else:
                    r.fail("GET /api/v1/auth/me/", res.text[:120])
            except Exception as exc:
                r.fail("GET /api/v1/auth/me/", str(exc))

            if refresh_token:
                try:
                    res = client.post("/api/v1/auth/refresh/", json={"refresh_token": refresh_token})
                    if res.status_code == 200 and res.json().get("access_token"):
                        access_token = res.json()["access_token"]
                        headers = {"Authorization": f"Bearer {access_token}"}
                        r.ok("POST /api/v1/auth/refresh/")
                    else:
                        r.fail("POST /api/v1/auth/refresh/", res.text[:120])
                except Exception as exc:
                    r.fail("POST /api/v1/auth/refresh/", str(exc))

        # ── Dashboard / API key ───────────────────────────────────────────
        print("\nDashboard & API keys")
        if not access_token:
            r.skip("dashboard", "no JWT")
            headers = {}
        else:
            headers = {"Authorization": f"Bearer {access_token}"}
            for path, name in (
                ("/api/v1/dashboard/usage/", "GET /api/v1/dashboard/usage/"),
                ("/api/v1/dashboard/jobs/", "GET /api/v1/dashboard/jobs/"),
                ("/api/v1/dashboard/api-keys/", "GET /api/v1/dashboard/api-keys/"),
            ):
                try:
                    res = client.get(path, headers=headers)
                    if res.status_code == 200:
                        r.ok(name)
                    else:
                        r.fail(name, f"{res.status_code} {res.text[:120]}")
                except Exception as exc:
                    r.fail(name, str(exc))

            try:
                res = client.post("/api/v1/dashboard/api-keys/?name=E2E-Key", headers=headers)
                if res.status_code == 201 and res.json().get("key"):
                    api_key = res.json()["key"]
                    key_id = res.json()["id"]
                    r.ok("POST /api/v1/dashboard/api-keys/")
                else:
                    r.fail("POST /api/v1/dashboard/api-keys/", res.text[:120])
                    key_id = None
            except Exception as exc:
                r.fail("POST /api/v1/dashboard/api-keys/", str(exc))
                key_id = None

        # ── v2 public API (API key) ───────────────────────────────────────
        print("\nv2 API (API key)")
        if not api_key:
            r.skip("v2 API key flows", "no API key created")
            key_headers: dict[str, str] = {}
        else:
            key_headers = {"x-api-key": api_key}

            try:
                res = client.get("/api/v2/models/", headers=key_headers)
                body = res.json()
                if res.status_code == 200 and body.get("object") == "model_catalog":
                    r.ok("GET /api/v2/models/")
                else:
                    r.fail("GET /api/v2/models/", res.text[:120])
            except Exception as exc:
                r.fail("GET /api/v2/models/", str(exc))

            pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\nxref\n0 3\ntrailer<</Root 1 0 R>>\nstartxref\n0\n%%EOF"
            try:
                res = client.post(
                    "/api/v2/documents/",
                    headers=key_headers,
                    files={"file": ("e2e-test.pdf", pdf, "application/pdf")},
                )
                body = res.json()
                if res.status_code == 201 and body.get("id", "").startswith("doc_"):
                    doc_id = body["id"]
                    r.ok("POST /api/v2/documents/")
                else:
                    r.fail("POST /api/v2/documents/", res.text[:200])
            except Exception as exc:
                r.fail("POST /api/v2/documents/", str(exc))

            if doc_id:
                try:
                    res = client.get(f"/api/v2/documents/{doc_id}/", headers=key_headers)
                    if res.status_code == 200 and res.json().get("object") == "document":
                        r.ok("GET /api/v2/documents/{id}/")
                    else:
                        r.fail("GET /api/v2/documents/{id}/", res.text[:120])
                except Exception as exc:
                    r.fail("GET /api/v2/documents/{id}/", str(exc))

                try:
                    res = client.get("/api/v2/documents/?limit=5", headers=key_headers)
                    body = res.json()
                    if res.status_code == 200 and body.get("object") == "document_list":
                        r.ok("GET /api/v2/documents/")
                    else:
                        r.fail("GET /api/v2/documents/", res.text[:120])
                except Exception as exc:
                    r.fail("GET /api/v2/documents/", str(exc))

                try:
                    res = client.post(
                        "/api/v2/ocr/jobs/",
                        headers={**key_headers, "Content-Type": "application/json"},
                        json={"document_id": doc_id, "tier_slug": "basic"},
                    )
                    body = res.json()
                    if res.status_code == 202 and body.get("id", "").startswith("job_"):
                        job_id = body["id"]
                        r.ok("POST /api/v2/ocr/jobs/")
                    else:
                        r.fail("POST /api/v2/ocr/jobs/", res.text[:200])
                except Exception as exc:
                    r.fail("POST /api/v2/ocr/jobs/", str(exc))

            if job_id:
                status = None
                for attempt in range(15):
                    try:
                        res = client.get(f"/api/v2/ocr/jobs/{job_id}/", headers=key_headers)
                        if res.status_code != 200:
                            r.fail("GET /api/v2/ocr/jobs/{id}/", res.text[:120])
                            break
                        status = res.json().get("data", {}).get("status")
                        if status in ("completed", "failed"):
                            break
                        time.sleep(1)
                    except Exception as exc:
                        r.fail("GET /api/v2/ocr/jobs/{id}/", str(exc))
                        break
                else:
                    status = status or "timeout"

                if status == "completed":
                    r.ok(f"GET /api/v2/ocr/jobs/{{id}}/ → completed")
                elif status == "failed":
                    r.fail("OCR job", "job ended with status failed")
                elif status:
                    r.ok(f"GET /api/v2/ocr/jobs/{{id}}/ → {status} (accepted)")

            if key_id and access_token:
                try:
                    res = client.post(
                        f"/api/v1/dashboard/api-keys/{key_id}/revoke/",
                        headers=headers,
                    )
                    if res.status_code == 200:
                        r.ok("POST /api/v1/dashboard/api-keys/{id}/revoke/")
                    else:
                        r.fail("POST revoke API key", res.text[:120])
                except Exception as exc:
                    r.fail("POST revoke API key", str(exc))

        # ── v1 OCR (JWT) ──────────────────────────────────────────────────
        print("\nv1 documents & OCR (JWT)")
        if access_token:
            headers = {"Authorization": f"Bearer {access_token}"}
            v1_doc_id = None
            pdf = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\nxref\n0 3\ntrailer<</Root 1 0 R>>\nstartxref\n0\n%%EOF"
            try:
                res = client.post(
                    "/api/v1/documents/",
                    headers=headers,
                    files={"file": ("v1-e2e.pdf", pdf, "application/pdf")},
                )
                if res.status_code == 201 and res.json().get("id"):
                    v1_doc_id = res.json()["id"]
                    r.ok("POST /api/v1/documents/")
                else:
                    r.fail("POST /api/v1/documents/", res.text[:120])
            except Exception as exc:
                r.fail("POST /api/v1/documents/", str(exc))

            try:
                res = client.get("/api/v1/models/", headers=headers)
                if res.status_code == 200 and "models" in res.json():
                    r.ok("GET /api/v1/models/")
                else:
                    r.fail("GET /api/v1/models/", res.text[:120])
            except Exception as exc:
                r.fail("GET /api/v1/models/", str(exc))

            if v1_doc_id:
                try:
                    res = client.post(
                        "/api/v1/ocr/jobs/",
                        headers={**headers, "Content-Type": "application/json"},
                        json={"document_id": v1_doc_id, "tier_slug": "basic"},
                    )
                    if res.status_code == 202 and res.json().get("id"):
                        r.ok("POST /api/v1/ocr/jobs/")
                    else:
                        r.fail("POST /api/v1/ocr/jobs/", res.text[:120])
                except Exception as exc:
                    r.fail("POST /api/v1/ocr/jobs/", str(exc))

        # ── Advisor (JWT) ─────────────────────────────────────────────────
        print("\nAdvisor")
        if access_token:
            headers = {"Authorization": f"Bearer {access_token}"}
            try:
                res = client.get("/api/v1/advisor/capabilities/", headers=headers)
                if res.status_code == 200:
                    r.ok("GET /api/v1/advisor/capabilities/")
                else:
                    r.fail("GET /api/v1/advisor/capabilities/", res.text[:120])
            except Exception as exc:
                r.fail("GET /api/v1/advisor/capabilities/", str(exc))

            try:
                res = client.post("/api/v1/advisor/session/", headers=headers, json={})
                if res.status_code == 201 and res.json().get("id"):
                    session_id = res.json()["id"]
                    r.ok("POST /api/v1/advisor/session/")
                    res2 = client.get(f"/api/v1/advisor/session/{session_id}/", headers=headers)
                    if res2.status_code == 200:
                        r.ok("GET /api/v1/advisor/session/{id}/")
                    else:
                        r.fail("GET /api/v1/advisor/session/{id}/", res2.text[:120])
                else:
                    r.fail("POST /api/v1/advisor/session/", res.text[:120])
            except Exception as exc:
                r.fail("POST /api/v1/advisor/session/", str(exc))

        # ── OpenAPI ───────────────────────────────────────────────────────
        print("\nOpenAPI")
        try:
            res = client.get("/openapi.json")
            if res.status_code == 200 and "paths" in res.json():
                r.ok("GET /openapi.json")
            else:
                r.fail("GET /openapi.json", res.text[:80])
        except Exception as exc:
            r.fail("GET /openapi.json", str(exc))

    # ── Summary ───────────────────────────────────────────────────────────
    print(f"\n{'=' * 50}")
    print(f"Passed:  {len(r.passed)}")
    print(f"Failed:  {len(r.failed)}")
    print(f"Skipped: {len(r.skipped)}")
    if r.failed:
        print("\nFailures:")
        for f in r.failed:
            print(f"  - {f}")
        return 1
    print("\nAll E2E checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
