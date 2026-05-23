#!/usr/bin/env python3
"""
Usage: python3 save_coin.py <coin-slug>
Copy an image to clipboard first, then run this script.
Image will be saved to public/coins/<coin-slug>.jpg
"""
import sys
import os
import subprocess

if len(sys.argv) < 2:
    print("Usage: python3 save_coin.py <coin-slug>")
    print("Example: python3 save_coin.py liberty-cap-half-cent-type-1")
    sys.exit(1)

slug = sys.argv[1]
out_dir = os.path.join(os.path.dirname(__file__), "public", "coins")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, f"{slug}.jpg")

# Use osascript to save clipboard image
script = f'''
tell application "System Events"
    set imgData to the clipboard as «class PNGf»
    set outFile to open for access POSIX file "{out_path.replace('.jpg', '.png')}" with write permission
    write imgData to outFile
    close access outFile
end tell
'''

result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
png_path = out_path.replace('.jpg', '.png')

if result.returncode != 0 or not os.path.exists(png_path):
    # Try pngpaste as fallback
    r2 = subprocess.run(["pngpaste", png_path], capture_output=True)
    if r2.returncode != 0:
        print(f"Error: Could not read image from clipboard.")
        print("Make sure you've copied an image first (Cmd+C on the PCGS image).")
        sys.exit(1)

# Convert PNG to JPG
subprocess.run(["sips", "-s", "format", "jpeg", png_path, "--out", out_path],
               capture_output=True)
if os.path.exists(png_path) and png_path != out_path:
    os.remove(png_path)

print(f"Saved: public/coins/{slug}.jpg")
