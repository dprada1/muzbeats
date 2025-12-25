#!/usr/bin/env python3
"""
Find near-duplicate images (visually similar but not identical) in an artist folder.
Uses image comparison to identify images that are very similar but may have
different compression, slight edits, or minor differences.
"""

import os
import sys
from pathlib import Path
from collections import defaultdict

try:
    from PIL import Image
except ImportError:
    print("❌ Error: PIL/Pillow is required.")
    print("   Install with: pip3 install pillow")
    sys.exit(1)


def get_image_signature(image_path, size=(16, 16)):
    """
    Create a simple signature for an image by:
    1. Resizing to small size
    2. Converting to grayscale
    3. Quantizing colors
    4. Returning a hash-like string
    """
    try:
        img = Image.open(image_path)
        # Resize to small size for comparison
        img = img.resize(size, Image.Resampling.LANCZOS)
        # Convert to grayscale
        img = img.convert('L')
        # Get pixel values
        pixels = list(img.getdata())
        # Quantize to reduce noise
        quantized = [p // 16 for p in pixels]  # 16 levels
        return tuple(quantized)
    except Exception as e:
        print(f"   ⚠️  Error processing {image_path}: {e}")
        return None


def calculate_similarity(sig1, sig2):
    """
    Calculate similarity between two signatures.
    Returns a value 0-1, where 1 is identical and 0 is completely different.
    """
    if sig1 is None or sig2 is None:
        return 0.0
    
    if len(sig1) != len(sig2):
        return 0.0
    
    # Calculate difference
    diff = sum(abs(a - b) for a, b in zip(sig1, sig2))
    max_diff = len(sig1) * 16  # Maximum possible difference
    
    # Convert to similarity (0-1)
    similarity = 1.0 - (diff / max_diff)
    return similarity


def find_near_duplicates(artist_dir, threshold=0.85):
    """
    Find near-duplicate images in an artist folder.
    threshold: Minimum similarity to consider images similar (0-1)
               0.85 = 85% similar (strict)
               0.80 = 80% similar (moderate)
               0.75 = 75% similar (lenient)
    """
    artist_name = os.path.basename(artist_dir)
    image_files = sorted([f for f in os.listdir(artist_dir) 
                         if f.lower().endswith('.webp')])
    
    if len(image_files) < 2:
        return []
    
    print(f"\n🔍 Scanning {artist_name}/ for near-duplicates...")
    print(f"   Found {len(image_files)} images")
    print(f"   Similarity threshold: {threshold*100:.0f}% (higher = stricter)\n")
    
    # Calculate signatures for all images
    print("   Calculating image signatures...")
    image_signatures = {}
    for i, img_file in enumerate(image_files):
        img_path = os.path.join(artist_dir, img_file)
        sig = get_image_signature(img_path)
        if sig:
            image_signatures[img_file] = sig
        if (i + 1) % 10 == 0:
            print(f"     Processed {i + 1}/{len(image_files)}...")
    
    print(f"   ✅ Processed {len(image_signatures)} images\n")
    
    # Compare all pairs
    print("   Comparing images...")
    similar_groups = []
    processed = set()
    
    for file1, sig1 in image_signatures.items():
        if file1 in processed:
            continue
        
        similar_files = [file1]
        
        for file2, sig2 in image_signatures.items():
            if file1 == file2 or file2 in processed:
                continue
            
            similarity = calculate_similarity(sig1, sig2)
            if similarity >= threshold:
                similar_files.append((file2, similarity))
                processed.add(file2)
        
        if len(similar_files) > 1:
            # Sort by similarity (most similar first)
            similar_files = [file1] + sorted([f for f in similar_files if isinstance(f, tuple)], 
                                           key=lambda x: x[1], reverse=True)
            similar_groups.append(similar_files)
            processed.add(file1)
    
    return similar_groups


def main():
    if len(sys.argv) > 1:
        artist_name = sys.argv[1]
        threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.85
    else:
        artist_name = 'tay-k'
        threshold = 0.85
    
    # Get paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent.parent
    # Use unused_copy for scanning (user is working there)
    unused_dir = project_root / 'server' / 'public' / 'assets' / 'images' / 'covers' / 'unused_copy'
    artist_dir = unused_dir / artist_name
    
    if not artist_dir.exists():
        print(f"❌ Directory not found: {artist_dir}")
        sys.exit(1)
    
    print("=" * 80)
    print("🔍 NEAR-DUPLICATE IMAGE FINDER")
    print("=" * 80)
    print(f"\nArtist folder: {artist_name}/")
    print(f"Similarity threshold: {threshold*100:.0f}%")
    print(f"Path: {artist_dir}\n")
    
    # Find near-duplicates
    similar_groups = find_near_duplicates(str(artist_dir), threshold)
    
    # Report results
    print("\n" + "=" * 80)
    print("📊 NEAR-DUPLICATE REPORT")
    print("=" * 80)
    
    if not similar_groups:
        print(f"\n✅ No near-duplicates found in {artist_name}/")
        print("   All images appear to be unique!")
    else:
        print(f"\n⚠️  Found {len(similar_groups)} groups of similar images:\n")
        
        total_files = sum(len(group) for group in similar_groups)
        total_redundant = total_files - len(similar_groups)  # Can remove all but 1 from each group
        
        for i, group in enumerate(similar_groups, 1):
            print(f"Group {i} ({len(group)} similar images):")
            
            # Show details for each file
            for item in group:
                if isinstance(item, tuple):
                    img_file, similarity = item
                    sim_str = f" ({similarity*100:.1f}% similar)"
                else:
                    img_file = item
                    sim_str = " (reference)"
                
                img_path = os.path.join(artist_dir, img_file)
                try:
                    img = Image.open(img_path)
                    size = os.path.getsize(img_path)
                    print(f"  - {img_file}{sim_str}")
                    print(f"    Size: {img.size[0]}x{img.size[1]} | File size: {size/1024:.1f} KB")
                except Exception as e:
                    print(f"  - {img_file}{sim_str} (error reading: {e})")
            
            print()
        
        print(f"📈 Summary:")
        print(f"   Total similar images: {total_files}")
        print(f"   Unique groups: {len(similar_groups)}")
        print(f"   Can potentially remove: {total_redundant} files")
        print(f"\n💡 Review each group and keep the best quality version!")
        print(f"   Delete the others to reduce folder size.")
    
    print("\n" + "=" * 80)
    print("\n💡 Tip: Adjust threshold with:")
    print(f"   python3 {sys.argv[0]} {artist_name} <threshold>")
    print("   Threshold: 0.85 (strict) to 0.75 (lenient)")
    print("   Higher = stricter (fewer matches), Lower = more lenient (more matches)")


if __name__ == '__main__':
    main()
