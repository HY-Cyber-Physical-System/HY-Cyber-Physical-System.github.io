/* Local WebGL 1 point-cloud renderer. No library, CDN, or network dependency. */
export const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
export function scrollProgress(top, height, viewport) {
  return clamp(-top / Math.max(1, height - viewport));
}
export function seededRandom(seed = 19) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export function sampleLogo(pixels, width, height, limit) {
  const random = seededRandom(1119), samples = [];
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      if (pixels[(y * width + x) * 4 + 3] > 110) samples.push([x, y]);
    }
  }
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }
  return samples.slice(0, limit).map(([x, y]) => [
    (x / width - 0.5) * 9.4,
    (0.5 - y / height) * (height / width) * 9.4,
    (random() - 0.5) * 0.78,
  ]);
}

export function makeGeometry(kind, count = 1600, logo = []) {
  const random = seededRandom(41), vertices = [], seeds = [], bursts = [];
  const total = kind === 'logo' ? logo.length : count;
  for (let i = 0; i < total; i++) {
    const t = i / Math.max(1, total - 1), phi = i * 2.39996323;
    let x, y, z;
    if (kind === 'logo') [x, y, z] = logo[i];
    else if (kind === 'sphere') {
      y = 1 - 2 * t;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      x = Math.cos(phi) * radius; z = Math.sin(phi) * radius;
      x *= 2.1; y *= 2.1; z *= 2.1;
    } else if (kind === 'rings') {
      const angle = t * Math.PI * 28, ring = i % 3;
      const radius = 1.6 + (random() - 0.5) * 0.3;
      x = Math.cos(angle) * radius; y = Math.sin(angle) * radius; z = (random() - 0.5) * 0.18;
      if (ring === 1) [y, z] = [z, y];
      if (ring === 2) [x, z] = [z, x];
    } else {
      const side = Math.ceil(Math.sqrt(total));
      x = ((i % side) / side - 0.5) * 5.4;
      z = (Math.floor(i / side) / side - 0.5) * 4;
      y = Math.sin(x * 1.7 + z) * 0.36;
    }
    vertices.push(x, y, z);
    const azimuth = random() * Math.PI * 2;
    const polar = Math.acos(random() * 2 - 1);
    const distance = 4 + random() * 14;
    bursts.push(Math.sin(polar) * Math.cos(azimuth) * distance,
      Math.sin(polar) * Math.sin(azimuth) * distance, (random() - 0.5) * 10);
    seeds.push(random(), random(), random());
  }
  return { positions: new Float32Array(vertices), bursts: new Float32Array(bursts), seeds: new Float32Array(seeds), count: total };
}

export const vertexShader = `
precision highp float;
attribute vec3 aPosition;
attribute vec3 aBurst;
attribute vec3 aSeed;
uniform float uTime;
uniform float uScatter;
uniform float uAspect;
uniform float uDpr;
uniform float uLogo;
uniform float uWave;
uniform float uIntro;
uniform vec2 uPointer;
varying mediump float vAlpha;
varying mediump float vShade;
void main() {
  float spread = smoothstep(0.02, 0.88, uScatter);
  vec3 p = aPosition;
  float drift = sin(uTime * 0.85 + aSeed.x * 6.2831);
  p.y += drift * mix(0.13, 0.055, uLogo);
  // Keep the wordmark alive at rest: a traveling depth wave and loose edge dust.
  p.z += uLogo * sin(p.x * 1.7 - uTime * 1.4) * 0.16;
  p.y += uWave * sin(p.x * 1.5 + p.z * 1.3 + uTime * 0.7) * 0.35;
  float idleDust = uLogo * smoothstep(0.90, 0.97, aSeed.z)
    * (0.025 + 0.10 * (0.5 + 0.5 * sin(uTime * 1.15 + aSeed.x * 6.2831)));
  float localSpread = clamp(spread * (0.7 + aSeed.y * 0.65) + idleDust * (1.0 - spread), 0.0, 1.25);
  p += aBurst * localSpread;
  float swirl = localSpread * (1.0 + aSeed.z) * 1.3;
  p.xy = mat2(cos(swirl), -sin(swirl), sin(swirl), cos(swirl)) * p.xy;
  float ry = mix(uTime * 0.20, 0.12 + sin(uTime * 0.70) * 0.32, uLogo) + uPointer.x * 0.15;
  float rx = mix(0.34, -0.06 + sin(uTime * 0.90) * 0.14, uLogo) + uPointer.y * 0.08;
  p.xz = mat2(cos(ry), -sin(ry), sin(ry), cos(ry)) * p.xz;
  p.yz = mat2(cos(rx), -sin(rx), sin(rx), cos(rx)) * p.yz;
  p *= 1.0 + uLogo * sin(uTime * 1.05) * 0.035;
  p.x += uLogo * sin(uTime * 0.65) * 0.10;
  p.y += uLogo * sin(uTime * 1.05) * 0.22;
  p *= mix(min(1.0, uAspect * 0.95), min(1.15, uAspect * 0.64), uLogo);
  float depth = max(0.8, 8.0 - p.z);
  gl_Position = vec4(p.x * 2.5 / uAspect, p.y * 2.5, depth - 0.1, depth);
  gl_PointSize = clamp((1.4 + aSeed.x * 1.7) * uDpr * 7.0 / depth, 1.0, 12.0);
  vAlpha = (0.48 + aSeed.y * 0.52) * (1.0 - smoothstep(0.78, 1.0, uScatter)) * uIntro;
  vShade = 0.78 + aSeed.z * 0.22;
}`;
export const fragmentShader = `
precision mediump float;
varying mediump float vAlpha;
varying mediump float vShade;
void main() {
  float radius = length(gl_PointCoord - vec2(0.5));
  float glow = 1.0 - smoothstep(0.1, 0.5, radius);
  gl_FragColor = vec4(vec3(vShade), glow * vAlpha);
}`;

export class ParticleScene {
  constructor(host, kind, geometry) {
    this.host = host; this.kind = kind; this.geometry = geometry;
    this.visible = false; this.lost = false; this.time = 0;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'particle-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.prepend(this.canvas);
    this.gl = this.canvas.getContext('webgl', {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: 'low-power',
    });
    if (!this.gl) { this.canvas.remove(); throw new Error('WebGL is unavailable'); }
    try { this.initialize(); } catch (error) {
      this.canvas.remove(); this.gl.getExtension('WEBGL_lose_context')?.loseContext(); throw error;
    }
    host.dataset.renderer = 'webgl';
    this.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.lost = true; host.classList.remove('webgl-ready');
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      try { this.initialize(); this.lost = false; this.resize(); this.draw(this.lastFrame || {}); }
      catch { this.lost = true; host.classList.remove('webgl-ready'); }
    });
    this.resize();
  }
  initialize() {
    const gl = this.gl;
    const compile = (type, source) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      return shader;
    };
    const vert = compile(gl.VERTEX_SHADER, vertexShader), frag = compile(gl.FRAGMENT_SHADER, fragmentShader);
    const program = gl.createProgram(); gl.attachShader(program, vert); gl.attachShader(program, frag); gl.linkProgram(program);
    const ok = gl.getProgramParameter(program, gl.LINK_STATUS);
    const message = ok ? '' : gl.getProgramInfoLog(program);
    gl.deleteShader(vert); gl.deleteShader(frag);
    if (!ok) { gl.deleteProgram(program); this.canvas.remove(); throw new Error(message); }
    this.program = program; gl.useProgram(program);
    this.buffers = [];
    for (const [name, data] of [['aPosition', this.geometry.positions], ['aBurst', this.geometry.bursts], ['aSeed', this.geometry.seeds]]) {
      const buffer = gl.createBuffer(); this.buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    }
    this.uniforms = Object.fromEntries(['uTime', 'uScatter', 'uAspect', 'uDpr', 'uLogo', 'uWave', 'uIntro', 'uPointer'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
  }
  resize() {
    const rect = this.host.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(max-width: 780px)').matches ? 1.5 : 2);
    this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
    const width = Math.round(this.width * this.dpr), height = Math.round(this.height * this.dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width; this.canvas.height = height;
    }
    if (!this.lost) this.gl.viewport(0, 0, width, height);
  }
  draw({ time = 0, scatter = 0, pointer = [0, 0], intro = 1 } = {}) {
    if (this.lost) return;
    this.lastFrame = { time, scatter, pointer, intro };
    const gl = this.gl, u = this.uniforms;
    gl.useProgram(this.program); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.uTime, time); gl.uniform1f(u.uScatter, scatter);
    gl.uniform1f(u.uAspect, this.width / this.height); gl.uniform1f(u.uDpr, this.dpr);
    gl.uniform1f(u.uLogo, this.kind === 'logo' ? 1 : 0); gl.uniform1f(u.uWave, this.kind === 'wave' ? 1 : 0);
    gl.uniform1f(u.uIntro, intro); gl.uniform2f(u.uPointer, pointer[0], pointer[1]);
    gl.drawArrays(gl.POINTS, 0, this.geometry.count);
    this.host.classList.add('webgl-ready');
  }
}

// Software projection of the same 3D point clouds when a mobile WebView denies WebGL.
export class CanvasParticleScene {
  constructor(host, kind, geometry) {
    this.host = host; this.kind = kind; this.geometry = geometry;
    this.visible = false; this.lost = false;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'particle-canvas'; this.canvas.setAttribute('aria-hidden', 'true');
    this.context = this.canvas.getContext('2d', { alpha: true });
    if (!this.context) throw new Error('Canvas rendering is unavailable');
    host.prepend(this.canvas); host.dataset.renderer = 'canvas2d';
    this.stride = Math.max(1, Math.ceil(geometry.count / (kind === 'logo' ? 2800 : 700)));
    this.resize();
  }
  resize() {
    const rect = this.host.getBoundingClientRect();
    this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
  }
  draw({ time = 0, scatter = 0, pointer = [0, 0], intro = 1 } = {}) {
    const ctx = this.context, g = this.geometry, logo = this.kind === 'logo';
    const aspect = this.width / this.height;
    const scale = logo ? Math.min(1.15, aspect * 0.64) : Math.min(1, aspect * 0.95);
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    const spread = smooth(0.02, 0.88, scatter), alpha = (1 - smooth(0.78, 1, scatter)) * intro;
    const ry = (logo ? 0.12 + Math.sin(time * 0.70) * 0.32 : time * 0.20) + pointer[0] * 0.15;
    const rx = (logo ? -0.06 + Math.sin(time * 0.90) * 0.14 : 0.34) + pointer[1] * 0.08;
    const breathe = logo ? 1 + Math.sin(time * 1.05) * 0.035 : 1;
    const floatX = logo ? Math.sin(time * 0.65) * 0.10 : 0;
    const floatY = logo ? Math.sin(time * 1.05) * 0.22 : 0;
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#fff';
    for (let n = 0; n < g.count; n += this.stride) {
      const i = n * 3, seed = g.seeds[i], second = g.seeds[i + 1], third = g.seeds[i + 2];
      let x = g.positions[i], y = g.positions[i + 1], z = g.positions[i + 2];
      y += Math.sin(time * 0.85 + seed * Math.PI * 2) * (logo ? 0.055 : 0.13);
      if (logo) z += Math.sin(x * 1.7 - time * 1.4) * 0.16;
      if (this.kind === 'wave') y += Math.sin(x * 1.5 + z * 1.3 + time * 0.7) * 0.35;
      const idleDust = logo ? smooth(0.90, 0.97, third)
        * (0.025 + 0.10 * (0.5 + 0.5 * Math.sin(time * 1.15 + seed * Math.PI * 2))) : 0;
      const amount = clamp(spread * (0.7 + second * 0.65) + idleDust * (1 - spread), 0, 1.25);
      x += g.bursts[i] * amount; y += g.bursts[i + 1] * amount; z += g.bursts[i + 2] * amount;
      const swirl = amount * (1 + third) * 1.3, cs = Math.cos(swirl), ss = Math.sin(swirl);
      [x, y] = [cs * x + ss * y, -ss * x + cs * y];
      [x, z] = [cy * x + sy * z, -sy * x + cy * z];
      [y, z] = [cx * y + sx * z, -sx * y + cx * z];
      x = (x * breathe + floatX) * scale;
      y = (y * breathe + floatY) * scale;
      z *= breathe * scale;
      const depth = Math.max(0.8, 8 - z);
      const px = this.width * 0.5 + x * 2.5 / aspect / depth * this.width * 0.5;
      const py = this.height * 0.5 - y * 2.5 / depth * this.height * 0.5;
      const size = clamp((1.4 + seed * 1.7) * 7 / depth, 0.7, 8);
      if (px < -size || px > this.width + size || py < -size || py > this.height + size) continue;
      ctx.globalAlpha = (0.48 + second * 0.52) * alpha;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }
    ctx.globalAlpha = 1; this.host.classList.add('webgl-ready');
  }
}
