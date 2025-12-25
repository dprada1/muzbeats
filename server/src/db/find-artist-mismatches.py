#!/usr/bin/env python3
"""
Find images that are likely not related to the artist by analyzing visual features
and identifying outliers within each artist folder.

This script:
1. Analyzes images in each artist folder
2. Extracts visual features (colors, composition, etc.)
3. Identifies outliers that are significantly different from the majority
4. Reports them for review/deletion
"""

import os
import sys
from pathlib import Path
from collections import defaultdict
import statistics

try:
    from PIL import Image
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    try:
        from PIL import Image
        HAS_NUMPY = False
    except ImportError:
        print("❌ Error: PIL/Pillow is required.")
        print("   Install with: pip3 install pillow")
        sys.exit(1)


def get_dominant_colors(image, num_colors=5):
    """Extract dominant colors from an image."""
    # Resize for faster processing
    img = image.resize((150, 150))
    img = img.convert('RGB')
    
    # Get color data
    if HAS_NUMPY:
        pixels = np.array(img)
        pixels = pixels.reshape(-1, 3)
        pixel_list = [tuple(pixels[i]) for i in range(0, len(pixels), 10)]
    else:
        # Without numpy, sample pixels manually
        pixel_list = []
        width, height = img.size
        for y in range(0, height, 10):
            for x in range(0, width, 10):
                pixel_list.append(img.getpixel((x, y)))
    
    # Count color frequencies
    color_counts = defaultdict(int)
    for color in pixel_list:
        # Quantize colors to reduce noise
        quantized = tuple(c // 32 * 32 for c in color)
        color_counts[quantized] += 1
    
    # Get top colors
    top_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)[:num_colors]
    return [color for color, count in top_colors]


def get_image_features(image_path):
    """Extract features from an image."""
    try:
        img = Image.open(image_path)
        
        features = {
            'width': img.width,
            'height': img.height,
            'aspect_ratio': img.width / img.height if img.height > 0 else 0,
            'size_bytes': os.path.getsize(image_path),
            'mode': img.mode,
        }
        
        # Get dominant colors
        try:
            dominant_colors = get_dominant_colors(img)
            features['dominant_colors'] = dominant_colors
            # Average color
            avg_color = [sum(c[i] for c in dominant_colors) / len(dominant_colors) 
                        for i in range(3)]
            features['avg_color'] = avg_color
        except Exception as e:
            features['dominant_colors'] = []
            features['avg_color'] = [0, 0, 0]
        
        # Brightness estimate
        if img.mode == 'RGB':
            gray = img.convert('L')
            if HAS_NUMPY:
                pixels = np.array(gray)
                features['brightness'] = float(np.mean(pixels))
            else:
                # Calculate average brightness manually
                width, height = gray.size
                total = 0
                count = 0
                for y in range(height):
                    for x in range(width):
                        total += gray.getpixel((x, y))
                        count += 1
                features['brightness'] = total / count if count > 0 else 128.0
        else:
            features['brightness'] = 128.0
        
        return features
    except Exception as e:
        print(f"   ⚠️  Error processing {image_path}: {e}")
        return None


def calculate_similarity(features1, features2):
    """Calculate similarity score between two feature sets (0-1, higher = more similar)."""
    if not features1 or not features2:
        return 0.0
    
    # Aspect ratio similarity
    aspect_diff = abs(features1['aspect_ratio'] - features2['aspect_ratio'])
    aspect_sim = 1.0 / (1.0 + aspect_diff)
    
    # Color similarity (Euclidean distance in RGB space)
    color_diff = sum((a - b) ** 2 for a, b in 
                    zip(features1['avg_color'], features2['avg_color'])) ** 0.5
    color_sim = 1.0 / (1.0 + color_diff / 255.0)
    
    # Brightness similarity
    brightness_diff = abs(features1['brightness'] - features2['brightness'])
    brightness_sim = 1.0 / (1.0 + brightness_diff / 255.0)
    
    # Weighted average
    similarity = (aspect_sim * 0.2 + color_sim * 0.5 + brightness_sim * 0.3)
    return similarity


def find_outliers(features_list, threshold=0.3):
    """Find images that are outliers (low similarity to others)."""
    if len(features_list) < 3:
        return []  # Need at least 3 images to find outliers
    
    # Calculate average similarity for each image
    similarities = []
    for i, feat1 in enumerate(features_list):
        sims = []
        for j, feat2 in enumerate(features_list):
            if i != j:
                sim = calculate_similarity(feat1['features'], feat2['features'])
                sims.append(sim)
        avg_sim = statistics.mean(sims) if sims else 0.0
        similarities.append((i, avg_sim))
    
    # Sort by similarity (lowest = most likely outlier)
    similarities.sort(key=lambda x: x[1])
    
    # Find outliers (images with similarity below threshold)
    outliers = []
    if similarities:
        median_sim = statistics.median([s for _, s in similarities])
        std_sim = statistics.stdev([s for _, s in similarities]) if len(similarities) > 1 else 0
        
        # More aggressive outlier detection: use 1.0 standard deviation instead of 1.5
        outlier_threshold = median_sim - (1.0 * std_sim) if std_sim > 0 else threshold
        
        for idx, sim in similarities:
            # Outlier if similarity is significantly below median OR below absolute threshold
            if sim < outlier_threshold or sim < threshold:
                outliers.append((idx, sim))
    
    return outliers


def analyze_artist_folder(artist_dir):
    """Analyze images in an artist folder and find outliers."""
    artist_name = os.path.basename(artist_dir)
    image_files = sorted([f for f in os.listdir(artist_dir) 
                         if f.lower().endswith('.webp')])
    
    if len(image_files) < 3:
        return []  # Need at least 3 images to find outliers
    
    print(f"\n   Analyzing {artist_name}/ ({len(image_files)} images)...")
    
    # Extract features for all images
    features_list = []
    for img_file in image_files:
        img_path = os.path.join(artist_dir, img_file)
        features = get_image_features(img_path)
        if features:
            features_list.append({
                'file': img_file,
                'path': img_path,
                'features': features
            })
    
    if len(features_list) < 3:
        return []
    
    # Find outliers
    outliers = find_outliers(features_list, threshold=0.25)
    
    # Return outlier file names
    result = []
    for idx, sim_score in outliers:
        result.append({
            'file': features_list[idx]['file'],
            'path': features_list[idx]['path'],
            'similarity': sim_score,
            'features': features_list[idx]['features']
        })
    
    return result


def main():
    # Get paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent.parent
    unused_dir = project_root / 'server' / 'public' / 'assets' / 'images' / 'covers' / 'unused'
    
    if not unused_dir.exists():
        print(f"❌ Directory not found: {unused_dir}")
        sys.exit(1)
    
    print("🔍 Finding artist-mismatched images...")
    print(f"   Scanning: {unused_dir}\n")
    
    all_outliers = []
    
    # Process each artist folder
    artist_folders = sorted([d for d in os.listdir(unused_dir) 
                            if os.path.isdir(os.path.join(unused_dir, d))])
    
    for artist_folder in artist_folders:
        artist_dir = os.path.join(unused_dir, artist_folder)
        outliers = analyze_artist_folder(artist_dir)
        
        if outliers:
            print(f"     ⚠️  Found {len(outliers)} potential outliers:")
            for outlier in outliers:
                print(f"        - {outlier['file']} (similarity: {outlier['similarity']:.3f})")
                all_outliers.append({
                    'artist': artist_folder,
                    **outlier
                })
        else:
            print(f"     ✅ No obvious outliers found")
    
    # Generate report
    print("\n" + "=" * 80)
    print("📊 OUTLIER ANALYSIS REPORT")
    print("=" * 80)
    
    if not all_outliers:
        print("\n✅ No obvious outliers found in any artist folder!")
        print("   All images appear visually consistent within their folders.")
    else:
        print(f"\n⚠️  Found {len(all_outliers)} potential mismatched images:\n")
        
        # Group by artist
        by_artist = defaultdict(list)
        for outlier in all_outliers:
            by_artist[outlier['artist']].append(outlier)
        
        for artist, outliers in sorted(by_artist.items()):
            print(f"\n{artist}/ ({len(outliers)} outliers):")
            for outlier in sorted(outliers, key=lambda x: x['similarity']):
                rel_path = outlier['path'].replace(str(project_root) + '/', '')
                print(f"  - {outlier['file']}")
                print(f"    Path: {rel_path}")
                print(f"    Similarity: {outlier['similarity']:.3f}")
                print(f"    Size: {outlier['features']['width']}x{outlier['features']['height']}")
                print()
        
        print("\n💡 Recommendation:")
        print("   Review these images manually. If they don't match the artist,")
        print("   they can be removed to reduce folder size.")
        print("\n   To delete outliers, run:")
        print("   python3 server/src/db/find-artist-mismatches.py --delete")
    
    print("\n" + "=" * 80)


if __name__ == '__main__':
    delete_mode = '--delete' in sys.argv or '-d' in sys.argv
    
    if delete_mode:
        print("⚠️  DELETE MODE: This will remove identified outliers!")
        response = input("   Are you sure? Type 'yes' to continue: ")
        if response.lower() != 'yes':
            print("   Cancelled.")
            sys.exit(0)
        
        # Re-run analysis and delete
        # (Implementation would go here - for safety, we'll just report for now)
        print("   Delete mode not yet implemented. Please review and delete manually.")
        sys.exit(0)
    
    main()

