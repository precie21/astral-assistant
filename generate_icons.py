#!/usr/bin/env python3
"""
Generate all required icon sizes for Tauri from a source PNG image.
"""
from PIL import Image
import os

def generate_icons(source_path, output_dir):
    """Generate all required icon sizes from source image."""
    # Open source image
    img = Image.open(source_path)
    
    # Ensure RGBA mode
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Define required sizes
    sizes = [
        (32, 32, '32x32.png'),
        (128, 128, '128x128.png'),
        (256, 256, '128x128@2x.png'),  # 2x version
    ]
    
    # Generate PNG icons
    for width, height, filename in sizes:
        resized = img.resize((width, height), Image.Resampling.LANCZOS)
        output_path = os.path.join(output_dir, filename)
        resized.save(output_path, 'PNG')
        print(f"Generated: {filename}")
    
    # Generate ICO file (Windows icon with multiple sizes)
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_images = []
    for size in ico_sizes:
        resized = img.resize(size, Image.Resampling.LANCZOS)
        ico_images.append(resized)
    
    ico_path = os.path.join(output_dir, 'icon.ico')
    ico_images[0].save(ico_path, format='ICO', sizes=ico_sizes)
    print(f"Generated: icon.ico")
    
    # For macOS .icns, we'll skip it for now as it requires additional tools
    # The build will work without it on Windows
    print("\nNote: icon.icns not generated (requires macOS or additional tools)")
    print("This is fine for Windows development.")

if __name__ == '__main__':
    source = 'src-tauri/icons/icon.png'
    output = 'src-tauri/icons'
    
    if not os.path.exists(source):
        print(f"Error: Source image not found: {source}")
        exit(1)
    
    print(f"Generating icons from: {source}")
    print(f"Output directory: {output}")
    print()
    
    try:
        generate_icons(source, output)
        print("\n✓ Icon generation complete!")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        exit(1)
