from __future__ import annotations

import html
import json
import os
import re
import ssl
import unicodedata
from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data" / "veille-breaches.json"
SEED_PATH = ROOT / "data" / "veille-breaches-seed.json"
LOCK_PATH = ROOT / "data" / ".veille-refresh.lock"

USER_AGENT = "JasirPortfolioVeilleBot/1.0 (+https://portfolio.jasir.fr/)"
MAX_ITEMS = 24
MAX_LATEST = 8
LATEST_WINDOW_DAYS = 90
ARCHIVE_RETENTION_DAYS = 365 * 3
REFRESH_MAX_AGE_SECONDS = int(os.environ.get("VEILLE_REFRESH_MAX_AGE_SECONDS", str(60 * 60 * 6)))

SOURCES = [
    {
        "id": "bleepingcomputer",
        "label": "BleepingComputer",
        "kind": "Media",
        "site_url": "https://www.bleepingcomputer.com/",
        "feed_url": "https://www.bleepingcomputer.com/feed/",
        "description": "Média cyber international très suivi pour les fuites de données, ransomwares et compromissions majeures.",
    },
    {
        "id": "zataz-data-breach",
        "label": "ZATAZ",
        "kind": "Media",
        "site_url": "https://www.zataz.com/",
        "feed_url": "https://www.zataz.com/feed/",
        "description": "Média francophone spécialisé cybersécurité, filtré ici pour ne retenir que les cas de fuite et d'exfiltration.",
    },
    {
        "id": "the-record",
        "label": "The Record",
        "kind": "Media",
        "site_url": "https://therecord.media/",
        "feed_url": "https://therecord.media/feed",
        "description": "Média cyber de référence sur les incidents, l'extorsion de données et les impacts géopolitiques des compromissions.",
    },
    {
        "id": "security-affairs",
        "label": "Security Affairs",
        "kind": "Media",
        "site_url": "https://securityaffairs.com/",
        "feed_url": "https://securityaffairs.com/feed",
        "description": "Source reconnue pour le suivi des campagnes malveillantes, des ransomwares et des breaches déclarés.",
    },
]

CORE_KEYWORDS = [
    "data breach",
    "breach",
    "database breach",
    "database leak",
    "leak",
    "leaked",
    "stolen data",
    "exposed data",
    "data exposure",
    "data leak",
    "credential leak",
    "stolen credentials",
    "exfiltration",
    "ransomware leak",
    "fuite",
    "fuite de donnees",
    "fuite de données",
    "donnees personnelles",
    "données personnelles",
    "violation de donnees",
    "violation de données",
    "base compromisee",
    "base compromise",
    "base de donnees",
    "base de données",
    "vol de donnees",
    "vol de données",
    "piratage",
    "compromission",
    "extraction de donnees",
    "extraction de données",
]

CONTEXT_KEYWORDS = [
    "france travail",
    "crous",
    "caf",
    "cpam",
    "ameli",
    "free",
]

SUMMARY_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


def normalize_text(value: str) -> str:
    value = html.unescape(value or "")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return value.lower()


def clean_summary(value: str, limit: int = 260) -> str:
    text = html.unescape(value or "")
    text = SUMMARY_RE.sub(" ", text)
    text = SPACE_RE.sub(" ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rsplit(" ", 1)[0] + "…"


def local_name(tag: str) -> str:
    if "}" in tag:
        return tag.split("}", 1)[1]
    if ":" in tag:
        return tag.split(":", 1)[1]
    return tag


def find_child_text(element: ET.Element, names: set[str]) -> str:
    for child in list(element):
        if local_name(child.tag) in names:
            text = "".join(child.itertext()).strip()
            if text:
                return text
    return ""


def find_link(element: ET.Element) -> str:
    for child in list(element):
        if local_name(child.tag) != "link":
            continue
        href = child.attrib.get("href")
        if href:
            return href.strip()
        text = "".join(child.itertext()).strip()
        if text:
            return text
    guid = find_child_text(element, {"guid", "id"})
    return guid.strip()


def parse_date(value: str) -> datetime | None:
    raw = (value or "").strip()
    if not raw:
        return None
    try:
        parsed = parsedate_to_datetime(raw)
        return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except Exception:
        pass
    iso_value = raw.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(iso_value)
        return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    except Exception:
        return None


def canonicalize_link(value: str) -> str:
    if not value:
        return ""
    parts = urlsplit(value.strip())
    return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))


def load_seed_archive() -> tuple[list[dict[str, Any]], datetime | None]:
    if not SEED_PATH.exists():
        return [], None

    raw = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        seed_items = raw
        tracked_since = None
    else:
        seed_items = raw.get("items", [])
        tracked_since = parse_date(raw.get("tracked_since_iso", ""))

    normalized_items: list[dict[str, Any]] = []
    for item in seed_items:
        title = str(item.get("title", "")).strip()
        summary = clean_summary(str(item.get("summary", "")).strip(), limit=280)
        link = canonicalize_link(str(item.get("link", "")).strip())
        published_at = parse_date(str(item.get("published_at_iso", "")).strip())
        if not title or not link or published_at is None:
            continue

        source_label = str(item.get("source_label", "")).strip() or "Archive consolidée"
        source_kind = str(item.get("source_kind", "")).strip() or "Media"
        source_id = str(item.get("source_id", "")).strip() or normalize_text(source_label).replace(" ", "-")
        matched_keywords = item.get("matched_keywords")
        if not isinstance(matched_keywords, list) or not matched_keywords:
            matched_keywords = select_keywords(title, summary)

        normalized_items.append(
            {
                "title": title,
                "summary": summary,
                "link": link,
                "source_id": source_id,
                "source_label": source_label,
                "source_kind": source_kind,
                "published_at": published_at,
                "published_at_iso": published_at.isoformat(),
                "matched_keywords": [str(keyword) for keyword in matched_keywords][:5],
                "origin": "seed",
                "source_site_url": str(item.get("source_site_url", "")).strip() or link,
                "source_feed_url": str(item.get("source_feed_url", "")).strip(),
                "source_description": str(item.get("source_description", "")).strip(),
                "source_status": str(item.get("source_status", "")).strip() or "manual",
            }
        )

    return normalized_items, tracked_since


def fetch_xml(url: str) -> ET.Element:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"})
    try:
        with urlopen(request, timeout=25) as response:
            payload = response.read()
    except Exception as exc:
        ssl_error = isinstance(exc, ssl.SSLCertVerificationError)
        if isinstance(exc, URLError):
            ssl_error = ssl_error or isinstance(exc.reason, ssl.SSLCertVerificationError)
        if not ssl_error:
            raise
        # Some public institutional feeds expose incomplete certificate chains.
        # For this use case, falling back to an unverified TLS context is preferable
        # to silently losing the source from the watch pipeline.
        insecure_context = ssl._create_unverified_context()
        with urlopen(request, timeout=25, context=insecure_context) as response:
            payload = response.read()
    return ET.fromstring(payload)


def parse_feed(source: dict[str, Any]) -> tuple[list[dict[str, Any]], str | None]:
    root = fetch_xml(source["feed_url"])
    root_name = local_name(root.tag)
    items: list[dict[str, Any]] = []

    if root_name == "rss":
        channel = root.find("channel")
        if channel is None:
            return [], "Flux RSS sans canal détecté"
        for node in channel.findall("item"):
            title = find_child_text(node, {"title"})
            summary = find_child_text(node, {"description", "summary", "encoded", "content"})
            link = find_link(node)
            date_value = find_child_text(node, {"pubDate", "published", "updated", "date"})
            items.append(
                {
                    "title": title,
                    "summary": clean_summary(summary),
                    "link": canonicalize_link(link),
                    "published_at": parse_date(date_value),
                }
            )
    elif root_name == "feed":
        for node in root.findall("{*}entry"):
            title = find_child_text(node, {"title"})
            summary = find_child_text(node, {"summary", "content", "encoded"})
            link = find_link(node)
            date_value = find_child_text(node, {"updated", "published", "pubDate", "date"})
            items.append(
                {
                    "title": title,
                    "summary": clean_summary(summary),
                    "link": canonicalize_link(link),
                    "published_at": parse_date(date_value),
                }
            )
    else:
        return [], f"Format XML non géré: {root_name}"

    return items, None


def select_keywords(title: str, summary: str) -> list[str]:
    haystack = normalize_text(f"{title} {summary}")
    core_matches = [keyword for keyword in CORE_KEYWORDS if normalize_text(keyword) in haystack]
    if not core_matches:
        return []
    context_matches = [keyword for keyword in CONTEXT_KEYWORDS if normalize_text(keyword) in haystack]
    return (core_matches + context_matches)[:8]


def build_dataset() -> dict[str, Any]:
    now = datetime.now(UTC)
    selected_items: list[dict[str, Any]] = []
    source_results: list[dict[str, Any]] = []
    seen: set[str] = set()
    seeded_items, tracked_since = load_seed_archive()

    for source in SOURCES:
        try:
            feed_items, error = parse_feed(source)
        except Exception as exc:
            source_results.append(
                {
                    "id": source["id"],
                    "label": source["label"],
                    "kind": source["kind"],
                    "site_url": source["site_url"],
                    "feed_url": source["feed_url"],
                    "description": source["description"],
                    "status": "error",
                    "selected_count": 0,
                    "error": str(exc),
                }
            )
            continue

        source_count = 0
        for item in feed_items:
            title = (item.get("title") or "").strip()
            summary = (item.get("summary") or "").strip()
            link = (item.get("link") or "").strip()
            if not title or not link:
                continue
            matches = select_keywords(title, summary)
            if not matches:
                continue
            dedupe_key = canonicalize_link(link) or normalize_text(title)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            published_at = item.get("published_at") or now
            if tracked_since and published_at < tracked_since:
                continue
            if published_at < now - timedelta(days=ARCHIVE_RETENTION_DAYS):
                continue
            selected_items.append(
                {
                    "title": title,
                    "summary": summary,
                    "link": link,
                    "source_id": source["id"],
                    "source_label": source["label"],
                    "source_kind": source["kind"],
                    "published_at": published_at,
                    "published_at_iso": published_at.isoformat(),
                    "matched_keywords": matches[:5],
                    "origin": "rss",
                }
            )
            source_count += 1

        source_results.append(
            {
                "id": source["id"],
                "label": source["label"],
                "kind": source["kind"],
                "site_url": source["site_url"],
                "feed_url": source["feed_url"],
                "description": source["description"],
                "status": "ok" if not error else "warning",
                "selected_count": source_count,
                "error": error,
            }
        )

    for item in seeded_items:
        dedupe_key = canonicalize_link(item["link"]) or normalize_text(item["title"])
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        if tracked_since and item["published_at"] < tracked_since:
            continue
        selected_items.append(item)

    source_count_map: dict[str, int] = {}
    for item in selected_items:
        source_count_map[item["source_id"]] = source_count_map.get(item["source_id"], 0) + 1

    for source in source_results:
        source["selected_count"] = source_count_map.get(source["id"], 0)

    known_source_ids = {source["id"] for source in source_results}
    manual_sources: dict[str, dict[str, Any]] = {}
    for item in seeded_items:
        source_id = item["source_id"]
        if source_id in known_source_ids:
            continue
        current = manual_sources.get(source_id)
        if current is None:
            manual_sources[source_id] = {
                "id": source_id,
                "label": item["source_label"],
                "kind": item["source_kind"],
                "site_url": item.get("source_site_url") or item["link"],
                "feed_url": item.get("source_feed_url") or "",
                "description": item.get("source_description") or "Source officielle consolidée manuellement pour compléter les cas français significatifs.",
                "status": item.get("source_status") or "manual",
                "selected_count": source_count_map.get(source_id, 0),
                "error": None,
            }
    source_results.extend(manual_sources.values())

    selected_items.sort(key=lambda item: item["published_at"], reverse=True)
    selected_items = selected_items[:MAX_ITEMS]
    displayed_seed_count = sum(1 for item in selected_items if item.get("origin") == "seed")
    displayed_rss_count = sum(1 for item in selected_items if item.get("origin") == "rss")

    latest_cutoff = now - timedelta(days=LATEST_WINDOW_DAYS)
    latest_items = [item for item in selected_items if item["published_at"] >= latest_cutoff][:MAX_LATEST]
    if len(latest_items) < min(4, len(selected_items)):
        latest_items = selected_items[: min(MAX_LATEST, len(selected_items))]

    latest_links = {item["link"] for item in latest_items}
    archive_items = [item for item in selected_items if item["link"] not in latest_links]

    def serialize(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        payload: list[dict[str, Any]] = []
        for item in items:
            payload.append(
                {
                    "title": item["title"],
                    "summary": item["summary"],
                    "link": item["link"],
                    "source_id": item["source_id"],
                    "source_label": item["source_label"],
                    "source_kind": item["source_kind"],
                    "published_at_iso": item["published_at_iso"],
                    "matched_keywords": item["matched_keywords"],
                    "origin": item.get("origin", "rss"),
                }
            )
        return payload

    history_note = (
        f"Historique consolidé manuellement à partir du {tracked_since.astimezone(UTC).strftime('%d/%m/%Y')}, puis enrichi automatiquement via les flux RSS."
        if tracked_since
        else "Collecte RSS automatisée avec conservation d'un historique filtré."
    )

    return {
        "topic": "Cybersécurité : fuites de données personnelles et bases compromises",
        "focus": "Suivi des data breaches, compromissions et expositions de données via historique consolidé puis veille RSS automatisée.",
        "generated_at_iso": now.isoformat(),
        "tracked_since_iso": tracked_since.isoformat() if tracked_since else None,
        "history_note": history_note,
        "latest_window_days": LATEST_WINDOW_DAYS,
        "keywords": CORE_KEYWORDS + CONTEXT_KEYWORDS,
        "stats": {
            "source_count": len(source_results),
            "selected_items": len(selected_items),
            "latest_items": len(latest_items),
            "archive_items": len(archive_items),
            "seeded_items": displayed_seed_count,
            "rss_items": displayed_rss_count,
        },
        "sources": source_results,
        "latest_items": serialize(latest_items),
        "archive_items": serialize(archive_items),
    }


def write_dataset(dataset: dict[str, Any]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(dataset, indent=2, ensure_ascii=False), encoding="utf-8")


def dataset_age_seconds() -> float | None:
    if not OUTPUT_PATH.exists():
        return None
    return max(0.0, datetime.now(UTC).timestamp() - OUTPUT_PATH.stat().st_mtime)


def refresh_if_stale(force: bool = False) -> dict[str, Any]:
    age = dataset_age_seconds()
    if not force and age is not None and age < REFRESH_MAX_AGE_SECONDS:
        return {
            "status": "fresh",
            "updated": False,
            "age_seconds": round(age, 2),
            "max_age_seconds": REFRESH_MAX_AGE_SECONDS,
            "output_path": str(OUTPUT_PATH),
        }

    lock_fd: int | None = None
    try:
        LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
        lock_fd = os.open(str(LOCK_PATH), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(lock_fd, str(os.getpid()).encode("utf-8"))
    except FileExistsError:
        return {
            "status": "busy",
            "updated": False,
            "age_seconds": None if age is None else round(age, 2),
            "max_age_seconds": REFRESH_MAX_AGE_SECONDS,
            "output_path": str(OUTPUT_PATH),
        }

    try:
        dataset = build_dataset()
        write_dataset(dataset)
        return {
            "status": "updated",
            "updated": True,
            "generated_at_iso": dataset["generated_at_iso"],
            "item_count": dataset["stats"]["selected_items"],
            "latest_count": dataset["stats"]["latest_items"],
            "archive_count": dataset["stats"]["archive_items"],
            "source_count": dataset["stats"]["source_count"],
            "max_age_seconds": REFRESH_MAX_AGE_SECONDS,
            "output_path": str(OUTPUT_PATH),
        }
    finally:
        if lock_fd is not None:
            os.close(lock_fd)
        if LOCK_PATH.exists():
            LOCK_PATH.unlink(missing_ok=True)


def main() -> None:
    dataset = build_dataset()
    write_dataset(dataset)
    print(f"Veille RSS générée: {OUTPUT_PATH}")
    print(json.dumps(dataset["stats"], ensure_ascii=False))


if __name__ == "__main__":
    main()
