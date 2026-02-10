import json
from pathlib import Path
from functools import lru_cache

RESORTS_FILE = Path(__file__).parent.parent.parent / "data" / "resorts.json"

@lru_cache
def load_resorts() -> list[dict]:
    with open(RESORTS_FILE) as f:
        return json.load(f)

def get_resort_by_slug(slug: str) -> dict | None:
    return next((r for r in load_resorts() if r["slug"] == slug), None)

def get_resort_slugs() -> list[str]:
    return [r["slug"] for r in load_resorts()]

def get_restricted_resort_slugs() -> list[str]:
    return [r["slug"] for r in load_resorts() if r["restricted"]]

def get_original_resort_slugs() -> list[str]:
    return [r["slug"] for r in load_resorts() if not r["restricted"]]
