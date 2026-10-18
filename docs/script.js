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

const feedbackForm = document.querySelector('#feedback-form');
if (feedbackForm) {
 const api = 'https://segra-community-feedback.chibangarx.chatgpt.site/api/feedback';
 const submit = document.querySelector('#feedback-submit');
 const formStatus = document.querySelector('#feedback-status');
 const feedStatus = document.querySelector('#feedback-feed-status');
 const messages = document.querySelector('#feedback-messages');
 const refresh = document.querySelector('#feedback-refresh');
 const categories = {review:'OPINIÃO',bug:'PROBLEMA / ERRO',idea:'SUGESTÃO',fivem:'FIVEM / GTA RP'};
 let feedbackToken = null;
 let preparing = false;
 function feedbackStatus(message, error = false) { formStatus.textContent=message;formStatus.dataset.error=String(error); }
 async function prepareFeedback() {
  if (preparing) return;
  preparing=true;submit.disabled=true;
  try {
   const response=await fetch(api+'/token',{cache:'no-store',credentials:'omit'});
   const result=await response.json();
   if(!response.ok||!result.token)throw new Error(result.error||'Formulário indisponível.');
   feedbackToken=result.token;
   await new Promise(resolve=>setTimeout(resolve,2200));
   submit.disabled=false;feedbackStatus('Pronto para receber a tua mensagem.');
  }catch{feedbackToken=null;feedbackStatus('Não foi possível preparar o formulário. Carrega em Atualizar para tentar novamente.',true);}
  finally{preparing=false;}
 }
 async function loadFeedback() {
  refresh.disabled=true;
  try {
   const response=await fetch(api,{cache:'no-store',credentials:'omit'});
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.items))throw new Error('Mural indisponível.');
   const fragment=document.createDocumentFragment();
   for(const item of result.items){
    const article=document.createElement('article');article.className='feedback-message';
    const header=document.createElement('div');header.className='feedback-message-header';
    const name=document.createElement('strong');name.textContent=item.author;
    const time=document.createElement('time');const date=new Date(item.createdAt);time.dateTime=date.toISOString();time.textContent=new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',year:'numeric'}).format(date);
    header.append(name,time);
    const category=document.createElement('span');category.className='feedback-category';category.textContent=categories[item.category]||'FEEDBACK';
    const message=document.createElement('p');message.textContent=item.message;
    article.append(header,category,message);fragment.append(article);
   }
   messages.replaceChildren(fragment);
   feedStatus.textContent=result.items.length?'Mensagens mais recentes da comunidade.':'Ainda não há mensagens. A tua pode ser a primeira.';
  }catch{feedStatus.textContent='Não foi possível carregar o mural. Carrega em Atualizar para tentar novamente.';}
  finally{refresh.disabled=false;}
 }
 refresh.addEventListener('click',()=>{loadFeedback();prepareFeedback();});
 feedbackForm.addEventListener('submit',async event=>{
  event.preventDefault();if(!feedbackForm.reportValidity()||!feedbackToken)return;
  const fields=new FormData(feedbackForm);submit.disabled=true;feedbackStatus('A publicar a tua mensagem…');
  try{
   const response=await fetch(api,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({author:fields.get('author'),category:fields.get('category'),message:fields.get('message'),website:fields.get('website'),token:feedbackToken})});
   const result=await response.json();if(!response.ok){if(result.code==='token_invalid')feedbackToken=null;throw new Error(result.error||'Não foi possível guardar a mensagem.');}
   feedbackForm.reset();feedbackToken=null;feedbackStatus('Mensagem publicada. Obrigado pelo teu feedback!');await loadFeedback();
   await prepareFeedback();feedbackStatus('Mensagem publicada. Obrigado pelo teu feedback!');
  }catch(error){feedbackStatus(error.message||'Não foi possível publicar. O texto continua no formulário.',true);if(!feedbackToken){await prepareFeedback();if(feedbackToken)feedbackStatus('Sessão renovada. O texto continua no formulário; podes voltar a publicar.');}else{submit.disabled=false;}}
 });
 loadFeedback();prepareFeedback();
}

for (const media of document.querySelectorAll('.demo-media')) {
 const video = media.querySelector('video');
 const button = media.querySelector('.demo-start');
 const sound = document.createElement('button');
 sound.type = 'button'; sound.className = 'demo-sound';
 media.append(sound);
 video.volume = 0.15;
 video.loop = true;
 video.preload = 'metadata';
 // Only the presentation attempts audible autoplay; other previews stay silent.
 video.muted = media !== document.querySelector('.demo-media');
 let inView = false;
 let userPaused = false;
 let automaticPause = false;
 let starting = false;
 const syncSound = () => {
  const silent = video.muted || video.volume === 0;
  if (!silent) document.querySelectorAll('.demo-media video').forEach(other => {
   if (other !== video && !other.muted) other.muted = true;
  });
  sound.textContent = silent ? 'Ativar som (baixo)' : 'Silenciar';
  sound.title = silent ? 'Som desligado' : `Volume: ${Math.round(video.volume * 100)}%`;
  sound.setAttribute('aria-label', `${silent ? 'Ativar som baixo' : 'Silenciar'}: ${video.getAttribute('aria-label')}`);
 };
 syncSound();
 video.addEventListener('volumechange', syncSound);
 const pausePreview = () => {
  if (!video.paused) { automaticPause = true; video.pause(); }
 };
 const startPreview = async () => {
  if (starting || !video.paused) return;
  starting = true;
  try { await video.play(); }
  catch (error) {
   if (error.name === 'NotAllowedError' && !video.muted) {
    video.muted = true;
    try { await video.play(); } catch { button.hidden = false; }
   } else if (error.name !== 'AbortError') { button.hidden = false; }
  } finally { starting = false; syncSound(); }
 };
 sound.addEventListener('click', () => {
  if (video.muted || video.volume === 0) {
   video.volume = 0.15; video.muted = false; userPaused = false;
   startPreview();
  } else { video.muted = true; }
  syncSound();
 });
 button.addEventListener('click', async () => {
  userPaused = false;
  await startPreview();
 });
 video.addEventListener('playing', () => { button.hidden = true; userPaused = false; });
 video.addEventListener('pause', () => {
  if (automaticPause) automaticPause = false;
  else if (!starting && !video.ended) userPaused = true;
 });
 const observer = new IntersectionObserver(entries => {
  inView = entries[0].isIntersecting;
  if (inView && !document.hidden && !userPaused) startPreview();
  else if (!inView) pausePreview();
 }, { threshold: 0.25 });
 observer.observe(video);
 document.addEventListener('visibilitychange', () => {
  if (document.hidden) pausePreview();
  else if (inView && !userPaused) startPreview();
 });
}
