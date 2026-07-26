const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

function generateIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });

  // Gradient colors (Blue to Green)
  const c1 = { r: 26, g: 115, b: 232 }; // #1a73e8
  const c2 = { r: 52, g: 168, b: 83 };  // #34a853
  const bgDark = { r: 15, g: 12, b: 41 }; // #0f0c29

  const radius = isMaskable ? size / 2 : size * 0.22;
  const center = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Squircle / Rounded corner check
      let inShape = true;
      if (!isMaskable) {
        let dx = 0, dy = 0;
        if (x < radius) dx = radius - x;
        else if (x > size - radius) dx = x - (size - radius);

        if (y < radius) dy = radius - y;
        else if (y > size - radius) dy = y - (size - radius);

        if (dx > 0 && dy > 0) {
          inShape = (dx * dx + dy * dy) <= radius * radius;
        }
      }

      if (inShape) {
        // Gradient interpolation
        const t = (x + y) / (2 * size);
        const r = Math.round(c1.r + t * (c2.r - c1.r));
        const g = Math.round(c1.g + t * (c2.g - c1.g));
        const b = Math.round(c1.b + t * (c2.b - c1.b));

        // Draw a central Emblem / Curry Bowl & Coin motif
        const distToCenter = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
        const relR = distToCenter / (size / 2);

        if (relR < 0.45 && relR > 0.40) {
          // Ring highlight
          png.data[idx] = 255;
          png.data[idx + 1] = 255;
          png.data[idx + 2] = 255;
          png.data[idx + 3] = 230;
        } else if (relR <= 0.40) {
          // Inner bowl/coin accent
          png.data[idx] = 255;
          png.data[idx + 1] = 255;
          png.data[idx + 2] = 255;
          png.data[idx + 3] = 255;
        } else {
          png.data[idx] = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = 255;
        }
      } else {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0; // Transparent
      }
    }
  }

  return png;
}

// Generate 192x192, 512x512, and 512x512 maskable icons
[
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-512.png', size: 512, maskable: true }
].forEach(({ name, size, maskable }) => {
  const png = generateIcon(size, maskable);
  const buffer = PNG.sync.write(png);
  const filePath = path.join(iconsDir, name);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated PWA Icon: ${name} (${size}x${size}, ${buffer.length} bytes)`);
});
