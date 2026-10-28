"""Extract only the two Wine filesystems from the official, pinned web release.

No game data is downloaded/extracted. Python 3.10+; standard library only.
"""
from argparse import ArgumentParser
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile
import os

RELEASE_SHA256 = "ebc634e921f7c65980a7094f3efad84873cede8011eb7dd204446ff1de982945"
FILES = (
    ("SingleThreaded/boxedwine.zip", "Wine6-26R1.zip", "55b26c04b46986c977d6ec18989623d983274e03a72d3dc2fb048fc74d1245f9"),
    ("Wine11/boxedwine.zip", "Wine11-26R1.zip", "5d251b6d53cad1c31de254c5285603d193f91bc3129b9c9ba39c4cc65a24edb3"),
)


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, default=Path("D:/webaoe-work/downloads/Boxedwine26R1Web.zip"))
    parser.add_argument("--output", type=Path, default=Path("D:/webaoe-work/filesystems"))
    args = parser.parse_args()
    with args.archive.open("rb") as stream:
        digest = sha256()
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != RELEASE_SHA256:
        parser.error("Release SHA-256 mismatch; refusing extraction")
    args.output.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.archive) as archive:
        for member, filename, expected in FILES:
            data = archive.read(member)  # Exact known members; no arbitrary paths extracted.
            if sha256(data).hexdigest() != expected:
                parser.error(f"Unexpected filesystem hash: {member}")
            destination = args.output / filename
            temporary = destination.with_suffix(".zip.tmp")
            temporary.write_bytes(data)
            os.replace(temporary, destination)
            print(f"Verified {destination}: {len(data)} bytes; sha256={expected}")


if __name__ == "__main__":
    main()
