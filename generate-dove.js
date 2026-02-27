#!/usr/bin/env node
/**
 * Generate a particle-dot dove SVG matching the Aperant logo shape.
 * The Aperant dove: faces upper-right, 3 flowing wing feathers sweep left,
 * streamlined body, small pointed head/beak.
 */

const fs = require('fs');

let seed = 42;
function sr() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function srr(a, b) { return a + sr() * (b - a); }

function bezier(p0, p1, p2, p3, t) {
  const m = 1 - t;
  return {
    x: m*m*m*p0.x + 3*m*m*t*p1.x + 3*m*t*t*p2.x + t*t*t*p3.x,
    y: m*m*m*p0.y + 3*m*m*t*p1.y + 3*m*t*t*p2.y + t*t*t*p3.y
  };
}

function quadBezier(p0, p1, p2, t) {
  const m = 1 - t;
  return {
    x: m*m*p0.x + 2*m*t*p1.x + t*t*p2.x,
    y: m*m*p0.y + 2*m*t*p1.y + t*t*p2.y
  };
}

// Sample points along a cubic bezier with thickness (ribbon)
function ribbonPoints(p0, p1, p2, p3, count, thickness, scatter = 1.5) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = sr();
    const p = bezier(p0, p1, p2, p3, t);
    // Get tangent for perpendicular offset
    const dt = 0.01;
    const p2t = bezier(p0, p1, p2, p3, Math.min(1, t + dt));
    const dx = p2t.x - p.x, dy = p2t.y - p.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    const nx = -dy/len, ny = dx/len;
    // Thickness varies along curve (thicker at start, thinner at end)
    const tw = thickness * (1 - t * 0.6);
    const offset = srr(-tw/2, tw/2);
    pts.push({
      x: p.x + nx * offset + srr(-scatter, scatter),
      y: p.y + ny * offset + srr(-scatter, scatter)
    });
  }
  return pts;
}

function ellipsePoints(cx, cy, rx, ry, count, rotation = 0) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = sr() * Math.PI * 2;
    const r = Math.sqrt(sr());
    let x = r * rx * Math.cos(a);
    let y = r * ry * Math.sin(a);
    // rotate
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    pts.push({
      x: cx + x * cos - y * sin,
      y: cy + x * sin + y * cos
    });
  }
  return pts;
}

let all = [];

// The Aperant dove shape (in ~350x350 space)
// Dove faces upper-right. The logo has:
// - Head/beak at upper right
// - Body curves from head down-left
// - Three wing feathers sweep from body to the left, each progressively longer

// === HEAD (small, pointed, upper-right) ===
// Head is a small teardrop shape pointing upper-right
all.push(...ellipsePoints(265, 95, 14, 10, 90, -0.7));
// Beak
all.push(...ribbonPoints(
  {x: 275, y: 85}, {x: 290, y: 75}, {x: 298, y: 68}, {x: 305, y: 62},
  40, 6, 1
));

// === BODY (curves from head down through center) ===
// Main body stroke - thick curved line from head area sweeping down
all.push(...ribbonPoints(
  {x: 260, y: 105}, {x: 245, y: 140}, {x: 225, y: 180}, {x: 215, y: 220},
  200, 28, 2
));

// Upper body connecting to head
all.push(...ribbonPoints(
  {x: 270, y: 95}, {x: 260, y: 110}, {x: 250, y: 125}, {x: 245, y: 140},
  80, 22, 1.5
));

// === WING FEATHER 1 (top, shortest, sweeps left from upper body) ===
all.push(...ribbonPoints(
  {x: 255, y: 120}, {x: 220, y: 108}, {x: 180, y: 100}, {x: 145, y: 98},
  150, 18, 2
));
// Taper at tip
all.push(...ribbonPoints(
  {x: 145, y: 98}, {x: 125, y: 97}, {x: 110, y: 98}, {x: 95, y: 100},
  40, 8, 1.5
));

// === WING FEATHER 2 (middle, medium length, sweeps left from mid body) ===
all.push(...ribbonPoints(
  {x: 245, y: 150}, {x: 200, y: 140}, {x: 155, y: 138}, {x: 110, y: 142},
  180, 20, 2
));
// Taper
all.push(...ribbonPoints(
  {x: 110, y: 142}, {x: 85, y: 146}, {x: 65, y: 152}, {x: 48, y: 160},
  50, 8, 1.5
));

// === WING FEATHER 3 (bottom, longest, sweeps far left and curves down) ===
all.push(...ribbonPoints(
  {x: 235, y: 185}, {x: 185, y: 180}, {x: 130, y: 185}, {x: 80, y: 200},
  200, 22, 2
));
// Extended curve downward
all.push(...ribbonPoints(
  {x: 80, y: 200}, {x: 55, y: 215}, {x: 35, y: 235}, {x: 25, y: 258},
  80, 12, 2
));

// === TAIL (continues body downward, slight fan) ===
all.push(...ribbonPoints(
  {x: 215, y: 220}, {x: 208, y: 255}, {x: 198, y: 285}, {x: 185, y: 315},
  120, 20, 2
));
// Tail tip fans slightly
all.push(...ribbonPoints(
  {x: 185, y: 315}, {x: 178, y: 330}, {x: 168, y: 345}, {x: 155, y: 355},
  50, 14, 2
));

// === GAP FILL between feathers (the dark spaces between feathers in the logo) ===
// We want negative space between feathers, so we DON'T fill these gaps
// But we do want some connecting tissue where feathers meet the body

// Connection zones at body-feather junctions
all.push(...ellipsePoints(250, 130, 15, 10, 50, -0.3));
all.push(...ellipsePoints(240, 165, 15, 10, 50, -0.2));
all.push(...ellipsePoints(225, 200, 15, 10, 50, -0.1));

// === SCATTERED AMBIENT PARTICLES ===
// Trailing particles from wing tips and edges
for (let i = 0; i < 120; i++) {
  const base = all[Math.floor(sr() * all.length)];
  const dist = srr(8, 35);
  const angle = sr() * Math.PI * 2;
  all.push({
    x: base.x + dist * Math.cos(angle),
    y: base.y + dist * Math.sin(angle),
    ambient: true
  });
}

// Extra scatter at wing tips for dissolution effect
const tips = [{x: 95, y: 100}, {x: 48, y: 160}, {x: 25, y: 258}, {x: 155, y: 355}];
for (const tip of tips) {
  for (let i = 0; i < 30; i++) {
    const dist = srr(5, 30);
    const angle = sr() * Math.PI * 2;
    all.push({
      x: tip.x + dist * Math.cos(angle),
      y: tip.y + dist * Math.sin(angle),
      ambient: true
    });
  }
}

// === GENERATE SVG ===
const svgW = 800, svgH = 380;
const scale = 0.9;
const ox = 60, oy = 10;

const colors = ['#C5A94E', '#D4B95D', '#B89A3F', '#DCC76B', '#A88B35', '#E8D88A', '#BFA445'];

let dots = '';
all.forEach((p) => {
  const x = (p.x * scale + ox).toFixed(1);
  const y = (p.y * scale + oy).toFixed(1);
  const r = p.ambient ? srr(0.4, 1.0) : srr(0.8, 2.2);
  const op = p.ambient ? srr(0.12, 0.35) : srr(0.35, 0.9);
  const del = srr(0, 6).toFixed(1);
  const dur = srr(2, 5).toFixed(1);
  const col = colors[Math.floor(sr() * colors.length)];
  const opLo = Math.max(0.08, op - 0.2).toFixed(2);
  const opHi = Math.min(1, op + 0.15).toFixed(2);
  
  dots += `    <circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${col}" opacity="${op.toFixed(2)}"><animate attributeName="opacity" values="${opLo};${opHi};${opLo}" dur="${dur}s" begin="${del}s" repeatCount="indefinite"/></circle>\n`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
  <defs>
    <style>
      .tl { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 200; font-size: 32px; fill: #C5A94E; letter-spacing: 4px; }
      .st { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; font-weight: 200; font-size: 13px; fill: #8A7A3A; letter-spacing: 6px; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#0D1117"/>
  <g>
${dots}  </g>
  <text x="470" y="160" class="tl">AUTONOMOUS</text>
  <text x="470" y="200" class="tl">AI CODING</text>
  <text x="472" y="232" class="st">APERANT.COM</text>
</svg>`;

fs.writeFileSync('/tmp/AndyMik90/dove-banner.svg', svg);
console.log(`Generated ${all.length} dots`);
