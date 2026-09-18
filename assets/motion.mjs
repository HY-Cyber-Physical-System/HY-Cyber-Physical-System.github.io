import { ParticleScene, makeGeometry, sampleLogo, clamp, scrollProgress } from './particles.mjs';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(pointer: coarse)');
const root = document.documentElement;
const control = document.querySelector('.motion-toggle');
let paused = reduced.matches;
try { paused ||= localStorage.getItem('cpslab-motion') === 'off'; } catch { /* Storage is optional. */ }
let frame = 0, previous = 0, elapsed = 0, ready = false;
const scenes = [], effects = [];
const pointer = [0, 0], targetPointer = [0, 0];
const story = document.querySelector('.logo-story');
const stage = document.querySelector('.logo-stage');
let smoothScroll = 0;

function applyPreference() {
  root.classList.toggle('motion-off', paused);
  if (control) {
    control.hidden = false;
    control.textContent = paused ? 'Resume motion' : 'Pause motion';
    control.setAttribute('aria-pressed', String(paused));
  }
  effects.forEach(animation => paused ? animation.finish() : null);
  if (paused) {
    cancelAnimationFrame(frame); frame = 0;
    scenes.forEach(scene => scene.draw({ time: elapsed }));
    if (stage) { stage.style.setProperty('--scatter', '0'); stage.style.setProperty('--assemble', '1'); }
  } else requestFrame();
}
control?.addEventListener('click', () => {
  paused = !paused;
  try { localStorage.setItem('cpslab-motion', paused ? 'off' : 'on'); } catch { /* Storage is optional. */ }
  applyPreference();
});
reduced.addEventListener('change', event => { paused = event.matches; applyPreference(); });
applyPreference();

// Reveal with Web Animations: the HTML is never left hidden if a script fails.
const revealNodes = document.querySelectorAll('.section-head, .intro-inner, .research-card, .news-card, .pub-preview, .faculty, .person, .area, .research-feature, .album-card, .album-photos a, .content-section > h2, .contact-grid, .page-heading .wrap');
const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    revealObserver.unobserve(entry.target);
    if (paused || !entry.target.animate) return;
    const siblings = Array.from(entry.target.parentElement.children);
    const delay = Math.min(siblings.indexOf(entry.target) % 4, 3) * 65;
    const animation = entry.target.animate([
      { opacity: 0, transform: 'translateY(30px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 850, delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    effects.push(animation);
    animation.finished.then(() => { const i = effects.indexOf(animation); if (i >= 0) effects.splice(i, 1); }).catch(() => {});
  });
}, { threshold: 0.08 }) : null;
revealNodes.forEach(node => revealObserver?.observe(node));

document.querySelectorAll('.research-card, .album-card, .hero-photo').forEach(card => {
  card.addEventListener('pointermove', event => {
    if (paused || coarse.matches || event.pointerType !== 'mouse') return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--tilt-x', `${-(event.clientY - r.top - r.height / 2) / r.height * 5}deg`);
    card.style.setProperty('--tilt-y', `${(event.clientX - r.left - r.width / 2) / r.width * 5}deg`);
    card.classList.add('tilting');
  });
  card.addEventListener('pointerleave', () => { card.classList.remove('tilting'); card.style.setProperty('--tilt-x', '0deg'); card.style.setProperty('--tilt-y', '0deg'); });
});
document.querySelectorAll('details').forEach(details => details.addEventListener('toggle', () => {
  if (!details.open || paused) return;
  [...details.children].filter(child => child.tagName !== 'SUMMARY').forEach(child => {
    child.animate?.([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 380, easing: 'ease-out' });
  });
}));

function requestFrame() {
  if (ready && !paused && !document.hidden && !frame && scenes.some(scene => scene.visible && !scene.lost)) {
    previous = performance.now(); frame = requestAnimationFrame(render);
  }
}
function render(now) {
  frame = 0;
  if (paused || document.hidden) return;
  const dt = Math.min((now - previous) / 1000, 0.05); previous = now; elapsed += dt;
  pointer[0] += (targetPointer[0] - pointer[0]) * Math.min(1, dt * 5);
  pointer[1] += (targetPointer[1] - pointer[1]) * Math.min(1, dt * 5);
  let target = 0;
  if (story && stage) {
    const r = story.getBoundingClientRect();
    target = scrollProgress(r.top - 76, r.height, stage.clientHeight);
    smoothScroll += (target - smoothScroll) * Math.min(1, dt * 9);
    stage.style.setProperty('--scatter', String(smoothScroll));
    stage.style.setProperty('--assemble', String(1 - clamp(smoothScroll * 2.6)));
  }
  scenes.forEach(scene => {
    if (!scene.visible) return;
    scene.draw({ time: elapsed, scatter: scene.kind === 'logo' ? smoothScroll : 0, pointer, intro: clamp(elapsed / 1.2) });
  });
  if (scenes.some(scene => scene.visible && !scene.lost)) frame = requestAnimationFrame(render);
}
window.addEventListener('pointermove', event => {
  if (coarse.matches || event.pointerType !== 'mouse') return;
  targetPointer[0] = event.clientX / window.innerWidth * 2 - 1;
  targetPointer[1] = event.clientY / window.innerHeight * 2 - 1;
}, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else requestFrame();
});
window.addEventListener('pageshow', requestFrame);

async function initialize() {
  // Use the same locally hosted typeface for the solid fallback and particle logo.
  await Promise.race([document.fonts.load('800 260px Manrope'), new Promise(resolve => setTimeout(resolve, 1600))]);
  let logo = [];
  if (story) {
    const bitmap = document.createElement('canvas'); bitmap.width = 1800; bitmap.height = 440;
    const context = bitmap.getContext('2d', { willReadFrequently: true });
    if (context) {
      context.font = '800 330px Manrope, Arial, sans-serif'; context.fillStyle = '#fff';
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillText('CPSLAB', 900, 225);
      logo = sampleLogo(context.getImageData(0, 0, bitmap.width, bitmap.height).data, bitmap.width, bitmap.height, coarse.matches ? 7500 : 15000);
    }
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const scene = scenes.find(item => item.host === entry.target);
      if (scene) { scene.visible = entry.isIntersecting; if (paused && scene.visible) scene.draw({ time: elapsed }); }
    });
    requestFrame();
  }, { rootMargin: '80px' }) : null;
  for (const host of document.querySelectorAll('[data-particles]')) {
    try {
      const kind = host.dataset.particles;
      if (kind === 'logo' && !logo.length) continue;
      const scene = new ParticleScene(host, kind, makeGeometry(kind, coarse.matches ? 900 : 1800, logo));
      scenes.push(scene); observer?.observe(host);
      if (!observer) scene.visible = true;
      scene.draw({ intro: paused ? 1 : 0 });
      host.querySelector('canvas').addEventListener('webglcontextlost', () => { if (kind === 'logo') root.classList.remove('logo-webgl'); });
      host.querySelector('canvas').addEventListener('webglcontextrestored', () => { if (kind === 'logo') root.classList.add('logo-webgl'); requestFrame(); });
    } catch (error) { console.info('CPSLAB: showing static artwork.', error.message); }
  }
  const resize = () => {
    scenes.forEach(scene => { scene.resize(); if (paused) scene.draw({ time: elapsed }); });
    requestFrame();
  };
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(resize); scenes.forEach(scene => observer.observe(scene.host));
  } else window.addEventListener('resize', resize, { passive: true });
  ready = true; root.classList.toggle('logo-webgl', scenes.some(scene => scene.kind === 'logo')); root.classList.add('motion-ready'); applyPreference(); requestFrame();
}
initialize().catch(error => console.info('CPSLAB: motion unavailable; content remains accessible.', error.message));
