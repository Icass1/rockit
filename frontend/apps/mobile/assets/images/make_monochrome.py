#!/usr/bin/env python3
"""
Converts a PNG with a transparent background into a monochrome silhouette.
All opaque/semi-transparent pixels become a single solid color; the
transparent areas remain transparent.

Usage:
    python make_monochrome.py input.png [output.png] [--color #FFFFFF]
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    sys.exit("Missing dependencies. Run: pip install Pillow numpy")


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    r, g, b = (int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    return r, g, b


def make_monochrome(input_path: str, output_path: str, color: str = "#FFFFFF") -> None:
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)

    r, g, b = hex_to_rgb(color)

    # Replace RGB of every pixel with the target color; keep alpha channel intact
    data[..., 0] = r
    data[..., 1] = g
    data[..., 2] = b

    result = Image.fromarray(data, "RGBA")
    result.save(output_path)
    print(f"Saved: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert a PNG to a monochrome silhouette.")
    parser.add_argument("input", help="Input PNG file (must have transparent background)")
    parser.add_argument("output", nargs="?", help="Output PNG file (defaults to <input>_mono.png)")
    parser.add_argument("--color", default="#FFFFFF", help="Fill color in hex (default: #FFFFFF)")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        sys.exit(f"File not found: {input_path}")

    output_path = args.output or input_path.with_stem(input_path.stem + "_mono")

    make_monochrome(str(input_path), str(output_path), args.color)


if __name__ == "__main__":
    main()
