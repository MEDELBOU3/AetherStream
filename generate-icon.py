#!/usr/bin/env python3
# Simple script to generate an icon from SVG
# This creates a 256x256 PNG icon

import subprocess
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
assets_dir = os.path.join(script_dir, 'assets')

# Try to convert SVG to PNG using ImageMagick
try:
    subprocess.run([
        'convert', '-background', 'none', '-density', '72',
        os.path.join(assets_dir, 'icon.svg'),
        '-resize', '256x256',
        os.path.join(assets_dir, 'aetherStream.png')
    ], check=True)
    print("Icon generated successfully!")
except subprocess.CalledProcessError as e:
    print(f"Error generating icon: {e}")
except FileNotFoundError:
    print("ImageMagick not found. Please install it or use an online converter.")
