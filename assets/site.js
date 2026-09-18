'use strict';
document.documentElement.classList.add('js');
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.main-nav');
if (toggle && nav) {
  const close = () => { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); toggle.textContent = 'Menu'; };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    toggle.textContent = open ? 'Close' : 'Menu';
  });
  nav.addEventListener('click', (event) => { if (event.target.closest('a')) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && nav.classList.contains('open')) { close(); toggle.focus(); } });
}
const filters = document.querySelectorAll('[data-album-filter]');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  let count = 0;
  document.querySelectorAll('[data-album-category]').forEach(card => {
    card.hidden = button.dataset.albumFilter !== 'all' && card.dataset.albumCategory !== button.dataset.albumFilter;
    if (!card.hidden) count++;
  });
  const status = document.getElementById('album-status');
  if (status) status.textContent = `${count} albums`;
}));
const filterBar = document.getElementById('album-filters');
if (filterBar) filterBar.hidden = false;
