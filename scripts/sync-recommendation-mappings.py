"""Generate the frontend catalog from the backend's versioned source of truth."""

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "backend/app/scoring/mappings"
TARGET = ROOT / "frontend/lib/mappings"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the generated copies are stale")
    args = parser.parse_args()
    for source in sorted(SOURCE.glob("v*.json")):
        target = TARGET / source.name
        if args.check:
            if not target.exists() or target.read_bytes() != source.read_bytes():
                raise SystemExit(f"Run python scripts/sync-recommendation-mappings.py: {target.name} is stale")
        else:
            TARGET.mkdir(parents=True, exist_ok=True)
            target.write_bytes(source.read_bytes())


if __name__ == "__main__":
    main()
