import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeGeometry, sampleLogo, scrollProgress, clamp } from '../assets/particles.mjs';

// Real geometry invariants: bounded scene buffers, deterministic points, correct scroll endpoints.
for (const kind of ['sphere', 'rings', 'wave']) {
  const geometry = makeGeometry(kind, 1800);
  assert.equal(geometry.count, 1800);
  for (const buffer of [geometry.positions, geometry.bursts, geometry.seeds]) {
    assert.equal(buffer.length, geometry.count * 3);
    assert.ok(buffer.every(Number.isFinite));
  }
  assert.deepEqual(geometry.positions, makeGeometry(kind, 1800).positions);
}
const bitmap = new Uint8ClampedArray(36 * 18 * 4);
for (let y = 3; y < 15; y++) for (let x = 3; x < 30; x++) bitmap[(y * 36 + x) * 4 + 3] = 255;
const points = sampleLogo(bitmap, 36, 18, 20);
assert.equal(points.length, 20);
assert.equal(sampleLogo(new Uint8ClampedArray(36 * 18 * 4), 36, 18, 20).length, 0);
assert.ok(new Set(points.map(p => p[2])).size > 1, 'Logo has actual depth, not a flat point mask');
assert.equal(makeGeometry('logo', 0, points).count, 20);
assert.equal(scrollProgress(0, 2300, 1000), 0);
assert.equal(scrollProgress(-650, 2300, 1000), 0.5);
assert.equal(scrollProgress(-1300, 2300, 1000), 1);
assert.equal(scrollProgress(100, 2300, 1000), 0);
assert.equal(scrollProgress(-3000, 2300, 1000), 1);
assert.equal(scrollProgress(0, 500, 1000), 0);
assert.equal(clamp(-1), 0); assert.equal(clamp(2), 1);

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.equal((home.match(/data-particles="/g) || []).length, 5);
assert.ok(home.includes('class="logo-fallback">CPSLAB</h1>'));
assert.ok(home.includes('href="#research"'));
assert.ok(home.includes('class="motion-toggle"'));
console.log('PASS: particle buffers, 3D logo sampling, scroll/reverse endpoints, five homepage scenes, and static fallback.');
