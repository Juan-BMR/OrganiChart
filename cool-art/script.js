const canvas = document.getElementById('kaleidoscope');
const ctx = canvas.getContext('2d', { alpha: false });

const symmetryEl = document.getElementById('symmetry');
const speedEl = document.getElementById('speed');
const paletteEl = document.getElementById('palette');
const toggleEl = document.getElementById('toggle');
const snapshotEl = document.getElementById('snapshot');

let isRunning = true;
let lastTime = 0;

const palettes = {
  neon: ['#6cf0ff', '#ff4df0', '#ffe66d', '#a0ff6c'],
  sunset: ['#ff5f6d', '#ffc371', '#ff9966', '#ffd1a9'],
  ocean: ['#00c6ff', '#0072ff', '#00f5d4', '#00bbf9'],
  mono: ['#ffffff', '#c7d2fe', '#94a3b8', '#e2e8f0']
};

function resizeCanvasToDisplaySize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const { clientWidth, clientHeight } = canvas;
  const displayWidth = Math.max(1, clientWidth);
  const displayHeight = Math.max(1, clientHeight);
  const width = Math.floor(displayWidth * dpr);
  const height = Math.floor(displayHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function pick(arr, i) {
  return arr[i % arr.length];
}

function drawKaleidoscope(timeSeconds) {
  resizeCanvasToDisplaySize();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.5;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, width, height);

  const symmetry = Math.max(3, Math.floor(Number(symmetryEl.value)));
  const speed = Number(speedEl.value);
  const colors = palettes[paletteEl.value] || palettes.neon;

  const baseAngle = (timeSeconds * lerp(0.1, 1.5, easeInOutCubic(speed))) % (Math.PI * 2);

  const sliceAngle = (Math.PI * 2) / symmetry;

  // precompute moving control points
  const layers = 6;
  for (let s = 0; s < symmetry; s++) {
    const startAngle = s * sliceAngle + baseAngle;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle);

    for (let l = 0; l < layers; l++) {
      const t = (timeSeconds * 0.2 + l * 0.13) % 1;
      const r0 = lerp(radius * 0.05, radius * 0.95, easeInOutCubic((t + l * 0.07) % 1));
      const r1 = lerp(radius * 0.05, radius * 0.95, easeInOutCubic((t + 0.33 + l * 0.07) % 1));
      const r2 = lerp(radius * 0.05, radius * 0.95, easeInOutCubic((t + 0.66 + l * 0.07) % 1));

      const color = pick(colors, s + l);
      const alpha = 0.75 - l * 0.08;
      ctx.globalAlpha = Math.max(0.12, alpha);

      // mirrored stroke within the slice
      for (let mirror = 0; mirror < 2; mirror++) {
        ctx.save();
        if (mirror === 1) ctx.scale(1, -1);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(sliceAngle * radius * 0.15, r0, sliceAngle * radius * 0.3, r1);
        ctx.quadraticCurveTo(sliceAngle * radius * 0.45, r2, sliceAngle * radius * 0.6, radius);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, radius * 0.003 * (layers - l));
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.closePath();

        ctx.restore();
      }
    }

    ctx.restore();
  }

  // soft glow overlay
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, 'rgba(255,255,255,0.04)');
  grad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function tick(ts) {
  if (!isRunning) return;
  const timeSeconds = ts / 1000;
  drawKaleidoscope(timeSeconds);
  lastTime = ts;
  requestAnimationFrame(tick);
}

// Event wiring
function onResize() {
  resizeCanvasToDisplaySize();
  drawKaleidoscope(lastTime / 1000);
}

window.addEventListener('resize', onResize);

toggleEl.addEventListener('click', () => {
  isRunning = !isRunning;
  toggleEl.textContent = isRunning ? 'Pause' : 'Play';
  if (isRunning) requestAnimationFrame(tick);
});

snapshotEl.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `kaleidoscope-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// Initialize canvas CSS size to fill viewport
function setCanvasSizeToViewport() {
  canvas.style.width = '100vw';
  canvas.style.height = 'calc(100vh - 60px - 42px)';
}

setCanvasSizeToViewport();
resizeCanvasToDisplaySize();
requestAnimationFrame(tick);

