#!/usr/bin/env python3
"""Generate mobile image variants from the imported, local images (Pillow)."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
for path in (ROOT/'assets/media').glob('*.webp'):
 if '-' in path.stem:continue
 with Image.open(path) as image:
  # Keep text-only email images untouched; photos and diagrams get variants.
  if image.width/image.height > 4:continue
  for width in (400,800):
   if image.width<=width:continue
   target=path.with_name(path.stem+f'-{width}.webp')
   resized=image.copy();resized.thumbnail((width,10000))
   resized.save(target,'WEBP',quality=82)
print('Responsive image variants ready.')
