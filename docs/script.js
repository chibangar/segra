const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
 navigation.classList.remove('is-open');
 menu.setAttribute('aria-expanded', 'false');
 menu.setAttribute('aria-label', 'Abrir menu');
}
menu.addEventListener('click', () => {
 const open = navigation.classList.toggle('is-open');
 menu.setAttribute('aria-expanded', String(open));
 menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
});
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
 if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
});
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
const player = document.querySelector('#clip-player');
const status = document.querySelector('#player-status');
const cards = [...document.querySelectorAll('[data-clip]')];
let clips;
let selection = 0;
async function loadClips() {
 if (clips) return clips;
 const response = await fetch('clips.json');
 if (!response.ok) throw new Error('Seleção indisponível.');
 clips = await response.json();
 return clips;
}
cards.forEach(card => card.addEventListener('click', async () => {
 const request = ++selection;
 status.textContent = 'A carregar o clipe…';
 try {
  const list = await loadClips();
  if (request !== selection) return;
  const index = list.findIndex(clip => clip.id === card.dataset.clip);
  if (index < 0) throw new Error('Clipe indisponível.');
  const clip = list[index];
  player.pause(); player.poster = clip.poster; player.src = clip.video;
  player.setAttribute('aria-label', clip.title);
  document.querySelector('#clip-title').textContent = clip.title;
  document.querySelector('#clip-map').textContent = `${clip.map} / ${clip.weapon}`;
  document.querySelector('#clip-description').textContent = clip.description;
  document.querySelector('#clip-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
  document.querySelector('#clip-download').href = clip.video;
  cards.forEach(item => {
   const active = item === card;
   item.classList.toggle('is-active', active); item.setAttribute('aria-pressed', String(active));
   const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
   item.querySelector('.clip-action').replaceChildren(document.createTextNode(active ? 'A VER AGORA ' : 'VER CLIPE '), arrow);
  });
  player.load();
  try { await player.play(); if (request === selection) status.textContent = ''; }
  catch { if (request === selection) status.textContent = 'Clipe selecionado. Carrega no play para assistir.'; }
 } catch { if (request === selection) status.textContent = 'Não foi possível carregar este clipe. Tenta novamente.'; }
}));
player.addEventListener('error', () => { status.textContent = 'Não foi possível reproduzir o vídeo. Podes descarregá-lo através da seta abaixo.'; });
player.addEventListener('playing', () => { status.textContent = ''; });
