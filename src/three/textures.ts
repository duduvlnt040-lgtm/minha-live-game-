import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createCheckeredFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  const tiles = 4;
  const size = 512 / tiles;

  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const isPink = (x + y) % 2 === 0;
      ctx.fillStyle = isPink ? '#e2aebc' : '#f6ebdf';
      ctx.fillRect(x * size, y * size, size, size);

      // Subtle inner tile bevel highlight for realistic ballroom polish
      ctx.strokeStyle = isPink ? 'rgba(255,235,242,0.35)' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4);

      ctx.strokeStyle = 'rgba(130, 75, 92, 0.16)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * size, y * size, size, size);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createFloorBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#606060';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWallTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#4f0c20');
  grad.addColorStop(0.55, '#6a122b');
  grad.addColorStop(1, '#3d0818');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle vertical damask paneling stripes
  for (let x = 0; x < 512; x += 32) {
    ctx.fillStyle = x % 64 === 0 ? 'rgba(255,210,180,0.04)' : 'rgba(20,0,8,0.08)';
    ctx.fillRect(x, 0, 16, 512);
  }

  // Gold wainscoting molding line
  ctx.fillStyle = '#d4a345';
  ctx.fillRect(0, 390, 512, 8);
  ctx.fillStyle = '#400818';
  ctx.fillRect(0, 398, 512, 114);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCurtainTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  for (let x = 0; x < 256; x += 32) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, '#5a091d');
    g.addColorStop(0.45, '#9d1435');
    g.addColorStop(1, '#470615');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 32, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createMarqueeSignTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(1024, 320);

  // Outer burgundy frame
  ctx.fillStyle = '#4c091a';
  ctx.fillRect(0, 0, 1024, 320);

  // Gold marquee rim
  ctx.strokeStyle = '#f2bd49';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 988, 284);

  ctx.fillStyle = '#650d24';
  ctx.fillRect(30, 30, 964, 260);

  // Warm marquee bulbs along border
  const bulbPositions: Array<[number, number]> = [];
  for (let x = 40; x <= 984; x += 38) {
    bulbPositions.push([x, 30], [x, 290]);
  }
  for (let y = 68; y <= 252; y += 38) {
    bulbPositions.push([30, y], [994, y]);
  }
  for (const [bx, by] of bulbPositions) {
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main marquee title matching the video
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 76px "Fredoka", "Arial Black", sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2e040f';
  ctx.strokeText('CASAMENTO DAS BARATAS', 512, 132);
  ctx.fillStyle = '#ffe28a';
  ctx.fillText('CASAMENTO DAS BARATAS', 512, 132);

  // Subtitle matching the video: ♥ a festa é de todo mundo ♥
  ctx.font = '600 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#ffd4dc';
  ctx.fillText('♥  a festa é de todo mundo  ♥', 512, 222);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWindowSkyTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 384);
  const grad = ctx.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, '#102048');
  grad.addColorStop(0.65, '#284582');
  grad.addColorStop(1, '#5878b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 384);

  // Subtle stars
  ctx.fillStyle = 'rgba(255, 250, 220, 0.85)';
  for (let i = 0; i < 36; i++) {
    const sx = ((i * 73) % 236) + 10;
    const sy = ((i * 53) % 260) + 12;
    ctx.beginPath();
    ctx.arc(sx, sy, (i % 3) * 0.8 + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mullion grid panes
  ctx.strokeStyle = '#f3d49b';
  ctx.lineWidth = 8;
  for (let x = 64; x < 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 384);
    ctx.stroke();
  }
  for (let y = 76; y < 384; y += 76) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(18, 4, 9, 0.52)');
  grad.addColorStop(0.6, 'rgba(18, 4, 9, 0.22)');
  grad.addColorStop(1, 'rgba(18, 4, 9, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const stripeCache = new Map<string, THREE.CanvasTexture>();
export function createStripedShirtTexture(primary: string, secondary: string): THREE.CanvasTexture {
  const key = `${primary}|${secondary}`;
  const cached = stripeCache.get(key);
  if (cached) return cached;

  const [canvas, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = secondary;
  for (let y = 0; y < 128; y += 32) {
    ctx.fillRect(0, y, 128, 13);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  stripeCache.set(key, tex);
  return tex;
}
