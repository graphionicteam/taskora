const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIcons() {
  const publicDir = path.join(__dirname, '..', 'public');

  // SVG representation of modern Taskora logo
  const svgLogo = `
  <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#4F46E5" />
        <stop offset="100%" stop-color="#1E1B4B" />
      </linearGradient>
      <linearGradient id="glyph" x1="120" y1="120" x2="380" y2="380" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="100%" stop-color="#E0E7FF" />
      </linearGradient>
      <filter id="shadow" x="0" y="8" width="512" height="512" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <rect width="512" height="512" rx="128" fill="url(#bg)"/>
    <g filter="url(#shadow)">
      <!-- Taskora checkmark + dynamic lightning geometric icon -->
      <path d="M148 266L228 346L368 186" stroke="url(#glyph)" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="372" cy="156" r="20" fill="#38BDF8"/>
    </g>
  </svg>
  `;

  // Badge SVG for Android status bar / lock-screen notification dot (monochrome white on transparent)
  const svgBadge = `
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 38L30 52L56 22" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="56" cy="18" r="4" fill="#FFFFFF"/>
  </svg>
  `;

  const svgBuffer = Buffer.from(svgLogo);
  const badgeBuffer = Buffer.from(svgBadge);

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  await sharp(badgeBuffer).resize(72, 72).png().toFile(path.join(publicDir, 'badge-72.png'));
  console.log('Created badge-72.png');
}

createIcons().catch(console.error);
