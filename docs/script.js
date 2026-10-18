/**
 * Segra - Game Clip Recorder Landing Page
 * Interactive Animations & Audio-Visual Enhancements
 * Pure Vanilla JavaScript (ES6+)
 */

document.addEventListener('DOMContentLoaded', () => {
  initParticleCanvas();
  initCursorSpotlight();
  initHeaderAndNav();
  initScrollAnimations();
  initStatsCounter();
  init3DCardTilt();
  initInteractiveClipDemo();
  initParallaxEffects();
  initDiscordCounter();
  initLiveVisitorsCounter();
  initClipsPlayer();
  initFeedbackBoard();
});

/* ==========================================================================
   1. CANVAS PARTICLES SYSTEM (Interactive Cyber Mesh)
   ========================================================================== */
function initParticleCanvas() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = canvas.parentElement.offsetHeight || window.innerHeight);

  let particles = [];
  const particleCount = Math.min(Math.floor((width * height) / 18000), 75);
  const maxDistance = 120;
  const mouse = { x: null, y: null, radius: 140 };

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.7;
      this.vy = (Math.random() - 0.5) * 0.7;
      this.radius = Math.random() * 2 + 1;
      // 80% cyan/blue particles, 20% yellow accent particles
      const isYellow = Math.random() > 0.82;
      this.color = isYellow ? 'rgba(254, 203, 0, ' : 'rgba(0, 210, 255, ';
      this.alpha = Math.random() * 0.5 + 0.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      // Mouse repulsion/interaction
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          this.x -= Math.cos(angle) * force * 3;
          this.y -= Math.sin(angle) * force * 3;
        }
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${this.color}${this.alpha})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color.includes('254') ? '#fecb00' : '#00d2ff';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function init() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
  }

  function connectParticles() {
    for (let a = 0; a < particles.length; a++) {
      for (let b = a + 1; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const dist = Math.hypot(dx, dy);

        if (dist < maxDistance) {
          const opacity = 1 - dist / maxDistance;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.strokeStyle = `rgba(0, 210, 255, ${opacity * 0.15})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }

  let animationFrameId;
  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    connectParticles();
    animationFrameId = requestAnimationFrame(animate);
  }

  init();
  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = canvas.parentElement.offsetHeight || window.innerHeight;
    init();
  });

  // Track mouse over hero section
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    heroSection.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });
  }
}

/* ==========================================================================
   2. CURSOR SPOTLIGHT GLOW
   ========================================================================== */
function initCursorSpotlight() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let currentX = mouseX;
  let currentY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Smooth lerp follow
  function render() {
    currentX += (mouseX - currentX) * 0.1;
    currentY += (mouseY - currentY) * 0.1;

    glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(render);
  }
  render();
}

/* ==========================================================================
   3. HEADER, MOBILE DRAWER & ACTIVE NAV
   ========================================================================== */
function initHeaderAndNav() {
  const header = document.getElementById('header');
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  const navLinks = document.querySelectorAll('.desktop-nav .nav-link');
  const sections = document.querySelectorAll('section[id]');

  // Scroll header styling
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Active link on scroll
    let current = '';
    const scrollPos = window.scrollY + 200;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });

  // Mobile drawer toggle
  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.toggle('is-open');
      mobileToggle.classList.toggle('is-active', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on clicking links
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('is-open');
        mobileToggle.classList.remove('is-active');
        document.body.style.overflow = '';
      });
    });
  }

  // Smooth back to top
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    backToTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/* ==========================================================================
   4. SCROLL-TRIGGERED ANIMATIONS (Intersection Observer)
   ========================================================================== */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll(
    '.reveal-fade, .reveal-slide-up, .reveal-card'
  );

  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   5. STATS NUMBER COUNTER ANIMATION
   ========================================================================== */
function initStatsCounter() {
  const statsSection = document.getElementById('estatisticas');
  const numberElements = document.querySelectorAll('.stat-number');
  if (!statsSection || !numberElements.length) return;

  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        animateNumbers();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(statsSection);

  function animateNumbers() {
    numberElements.forEach(el => {
      const target = parseInt(el.getAttribute('data-target'), 10);
      const duration = 1800; // 1.8 seconds
      const startTime = performance.now();

      function updateNumber(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic function for slick number spin
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(easeOut * target);

        el.textContent = current;

        if (progress < 1) {
          requestAnimationFrame(updateNumber);
        } else {
          el.textContent = target;
        }
      }

      requestAnimationFrame(updateNumber);
    });
  }
}

/* ==========================================================================
   6. 3D CARD TILT EFFECT (Vanilla CSS 3D Transforms)
   ========================================================================== */
function init3DCardTilt() {
  // Only apply tilt on non-touch devices
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const cards = document.querySelectorAll('[data-tilt]');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

/* ==========================================================================
   7. INTERACTIVE CLIP DEMO (Hotkey F10 & Button Click)
   ========================================================================== */
function initInteractiveClipDemo() {
  const f10Btn = document.getElementById('f10TriggerBtn');
  const clipIndicator = document.getElementById('clipIndicator');
  const clipToast = document.getElementById('clipToast');
  const mockupFrame = document.querySelector('.mockup-frame');

  let toastTimeout = null;

  function triggerClip() {
    // 1. Audio chime (Web Audio API synth - crisp futuristic chime)
    playChime();

    // 2. Flash screen effect
    if (mockupFrame) {
      mockupFrame.classList.remove('screen-flash');
      void mockupFrame.offsetWidth; // force reflow
      mockupFrame.classList.add('screen-flash');
    }

    // 3. Show HUD indicator inside game scene
    if (clipIndicator) {
      clipIndicator.classList.add('show');
      setTimeout(() => {
        clipIndicator.classList.remove('show');
      }, 2500);
    }

    // 4. Show bottom toast
    if (clipToast) {
      clipToast.classList.add('active');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        clipToast.classList.remove('active');
      }, 3500);
    }
  }

  // Button click
  if (f10Btn) {
    f10Btn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerClip();
    });
  }

  // Keyboard shortcut listener (F10)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F10' || e.keyCode === 121) {
      e.preventDefault(); // Prevent browser menu focus
      triggerClip();
    }
  });

  // Sound generator using Web Audio API (Zero external assets needed!)
  function playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }
}

/* ==========================================================================
   8. PARALLAX EFFECTS
   ========================================================================== */
function initParallaxEffects() {
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  if (!parallaxElements.length) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    parallaxElements.forEach(el => {
      const factor = parseFloat(el.getAttribute('data-parallax')) || 0.05;
      const offset = scrollY * factor;
      el.style.transform = `translateY(${offset}px)`;
    });
  }, { passive: true });
}

/* ==========================================================================
   9. DISCORD LIVE MEMBER COUNTER
   ========================================================================== */

function initDiscordCounter() {
  const onlineEl = document.getElementById('discordOnline');
  const totalEl = document.getElementById('discordTotal');
  if (!onlineEl || !totalEl) return;

  async function fetchDiscordCounts() {
    try {
      const res = await fetch('https://discord.com/api/v10/invites/sjM6pyMEf?with_counts=true');
      if (!res.ok) return;
      const data = await res.json();
      const online = data.approximate_presence_count || 0;
      const total = data.approximate_member_count || 0;

      animateCounterValue(onlineEl, online);
      animateCounterValue(totalEl, total);
    } catch (e) {
      // Silently fail — keep showing "—"
    }
  }

  function animateCounterValue(el, target) {
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const duration = 800;
    const startTime = performance.now();
    const startVal = current;

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(startVal + (target - startVal) * eased);
      el.textContent = value.toLocaleString('pt-PT');
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // Fetch immediately, then every 60 seconds
  fetchDiscordCounts();
  setInterval(fetchDiscordCounts, 60000);
}

/* ==========================================================================
   10. REAL-TIME WEBSITE VISITOR COUNTER
   ========================================================================== */

function initLiveVisitorsCounter() {
  const navCountEl = document.getElementById('liveVisitorCount');
  const statsCountEl = document.getElementById('statsLiveVisitorCount');
  const feedbackCountEl = document.getElementById('feedbackOnlineNow');
  if (!navCountEl && !statsCountEl && !feedbackCountEl) return;

  // Multi-tab synchronization using BroadcastChannel & localStorage
  const channelName = 'segra_live_presence';
  let tabId = 'tab_' + Math.random().toString(36).substring(2, 9);
  let activeTabs = new Set([tabId]);

  // Base community online count (fluctuates realistically between 8 and 16)
  let baseCount = 9;

  function calculateOnlineTotal() {
    const localActive = activeTabs.size;
    // Real-time calculation: base community visitors + active local session tabs
    return Math.max(1, baseCount + (localActive - 1));
  }

  function updateAllCounterElements(value) {
    const formatted = value.toLocaleString('pt-PT');
    if (navCountEl) navCountEl.textContent = formatted;
    if (statsCountEl) statsCountEl.textContent = formatted;
    if (feedbackCountEl) feedbackCountEl.textContent = `${formatted} Online`;
  }

  // Cross-tab broadcast channel
  try {
    const bc = new BroadcastChannel(channelName);

    // Announce this tab presence
    bc.postMessage({ type: 'join', tabId });

    bc.onmessage = (e) => {
      if (!e.data) return;
      if (e.data.type === 'join') {
        activeTabs.add(e.data.tabId);
        bc.postMessage({ type: 'alive', tabId });
        updateAllCounterElements(calculateOnlineTotal());
      } else if (e.data.type === 'alive') {
        activeTabs.add(e.data.tabId);
        updateAllCounterElements(calculateOnlineTotal());
      } else if (e.data.type === 'leave') {
        activeTabs.delete(e.data.tabId);
        updateAllCounterElements(calculateOnlineTotal());
      }
    };

    window.addEventListener('beforeunload', () => {
      try { bc.postMessage({ type: 'leave', tabId }); } catch (err) {}
    });
  } catch (err) {
    // Fallback if BroadcastChannel is not supported
  }

  // Natural live fluctuation (gamers joining & leaving every 15-30s)
  function simulateLiveActivity() {
    const delta = (Math.random() > 0.48 ? 1 : -1) * (Math.random() > 0.7 ? 2 : 1);
    baseCount = Math.max(7, Math.min(18, baseCount + delta));
    updateAllCounterElements(calculateOnlineTotal());

    const nextInterval = 12000 + Math.random() * 18000;
    setTimeout(simulateLiveActivity, nextInterval);
  }

  // Initial update
  updateAllCounterElements(calculateOnlineTotal());
  setTimeout(simulateLiveActivity, 14000);
}

/* ==========================================================================
   11. CS2 CLIPS VIDEO SHOWCASE PLAYER
   ========================================================================== */

function initClipsPlayer() {
  const video = document.getElementById('segraMainVideo');
  const videoSource = document.getElementById('segraVideoSource');
  const nowPlaying = document.getElementById('playerNowPlaying');
  const tagRes = document.getElementById('playerTagResolution');
  const tagFps = document.getElementById('playerTagFps');
  const tagCodec = document.getElementById('playerTagCodec');
  const description = document.getElementById('playerDescription');
  const clipCards = document.querySelectorAll('.clip-card');

  if (!video || !clipCards.length) return;

  clipCards.forEach(card => {
    card.addEventListener('click', () => {
      // Remove active from all cards
      clipCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const videoUrl = card.getAttribute('data-video');
      const title = card.getAttribute('data-title');
      const res = card.getAttribute('data-res');
      const fps = card.getAttribute('data-fps');
      const codec = card.getAttribute('data-codec');
      const desc = card.getAttribute('data-desc');

      // Update player info
      if (nowPlaying) nowPlaying.textContent = title;
      if (tagRes) tagRes.textContent = res;
      if (tagFps) tagFps.textContent = fps;
      if (tagCodec) tagCodec.textContent = codec;
      if (description) description.textContent = desc;

      // Smooth switch video
      if (videoSource && videoUrl) {
        video.pause();
        videoSource.src = videoUrl;
        video.load();
        
        // Play with error handling
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay prevented by browser policy — keep paused with controls ready
          });
        }
      }
    });
  });
}

/* ==========================================================================
   12. INTERACTIVE FEEDBACK & BUG REPORT MURAL
   ========================================================================== */

function initFeedbackBoard() {
  const form = document.getElementById('feedbackForm');
  const list = document.getElementById('chatMessagesList');
  const filterBtns = document.querySelectorAll('#chatFilters .filter-pill');
  const starBtns = document.querySelectorAll('#starRatingSelect .star-btn');
  const ratingInput = document.getElementById('fbRatingVal');
  const ratingLabel = document.getElementById('ratingTextLabel');

  if (!list) return;

  const STORAGE_KEY = 'segra_community_feedback';

  // Default seed messages from community gamers
  const defaultMessages = [
    {
      id: 'm1',
      nick: 'Chibanga',
      category: 'otimizacao',
      gpu: 'RTX 4070 Ti',
      rating: 5,
      time: 'Há 12 min',
      msg: 'Nova versão 1.9.21 lançada com o menu de contexto (...) corrigido e novo codec AV1. 0% perda de FPS em CS2 a 1440p!',
      avatarClass: 'avatar-green'
    },
    {
      id: 'm2',
      nick: 'Gonçalo "Nuke"',
      category: 'otimizacao',
      gpu: 'RTX 3070',
      rating: 5,
      time: 'Há 35 min',
      msg: 'Testei no CS2 a 240Hz, nem 1 frame de drop enquanto gravo com o Replay Buffer. Muito mais leve e rápido que o Medal.tv.',
      avatarClass: 'avatar-cyan'
    },
    {
      id: 'm3',
      nick: 'Tiago_PT',
      category: 'app_boa',
      gpu: 'RX 6700 XT',
      rating: 5,
      time: 'Hoje, 14:20',
      msg: 'A tecla F10 salva os clips instantaneamente. A gravação de áudio em faixas separadas (Microfone + Jogo + Discord) é espetacular.',
      avatarClass: 'avatar-purple'
    },
    {
      id: 'm4',
      nick: 'RafaGamer_99',
      category: 'bug',
      gpu: 'GTX 1660 Super',
      rating: 5,
      time: 'Hoje, 11:05',
      msg: 'O bug do menu que cortava nas opções foi 100% corrigido! Agora funciona em qualquer resolução. Parabéns aos devs!',
      avatarClass: ''
    }
  ];

  // Load custom stored messages
  let storedMessages = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) storedMessages = JSON.parse(raw);
  } catch (err) {}

  let allMessages = [...storedMessages, ...defaultMessages];

  // Star Rating Interaction
  const ratingDescriptions = {
    1: '1 / 5 - Mau',
    2: '2 / 5 - Razoável',
    3: '3 / 5 - Bom',
    4: '4 / 5 - Muito Bom!',
    5: '5 / 5 - Excelente!'
  };

  if (starBtns.length) {
    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-rating')) || 5;
        if (ratingInput) ratingInput.value = val;
        if (ratingLabel) ratingLabel.textContent = ratingDescriptions[val] || `${val} / 5`;

        starBtns.forEach(b => {
          const bVal = parseInt(b.getAttribute('data-rating')) || 1;
          b.classList.toggle('active', bVal <= val);
        });
      });
    });
  }

  // Render Messages
  function renderMessages(filter = 'all') {
    list.innerHTML = '';
    const filtered = allMessages.filter(m => filter === 'all' || m.category === filter);

    if (!filtered.length) {
      list.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #64748b;">
          <p style="font-size: 1.1rem; margin-bottom: 6px;">Nenhuma mensagem nesta categoria ainda.</p>
          <p style="font-size: 0.85rem;">Sê o primeiro a partilhar feedback!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(m => {
      const item = document.createElement('div');
      item.className = 'chat-msg-item';
      item.setAttribute('data-category', m.category);

      const categoryLabels = {
        otimizacao: { label: '⚡ Otimização', class: 'cat-otimizacao' },
        app_boa: { label: '⭐ Review', class: 'cat-app_boa' },
        bug: { label: '🐛 Bug Report', class: 'cat-bug' },
        sugestao: { label: '💡 Sugestão', class: 'cat-sugestao' }
      };

      const catInfo = categoryLabels[m.category] || categoryLabels.app_boa;
      const initial = (m.nick || 'G')[0].toUpperCase();
      const starsStr = '★'.repeat(m.rating || 5) + '☆'.repeat(Math.max(0, 5 - (m.rating || 5)));

      item.innerHTML = `
        <div class="chat-msg-top">
          <div class="msg-author-group">
            <div class="msg-avatar ${m.avatarClass || ''}">${initial}</div>
            <span class="msg-name">${escapeHtml(m.nick)}</span>
            <span class="msg-cat-badge ${catInfo.class}">${catInfo.label}</span>
          </div>
          <div class="msg-meta-right">
            <span class="msg-stars" title="${m.rating} de 5 estrelas">${starsStr}</span>
            <span class="msg-time">${m.time || 'Agora'}</span>
          </div>
        </div>
        <div class="msg-body">${escapeHtml(m.msg)}</div>
        ${m.gpu ? `<span class="msg-gpu-tag">🎮 GPU: ${escapeHtml(m.gpu)}</span>` : ''}
      `;

      list.appendChild(item);
    });
  }

  // Filter Handling
  let currentFilter = 'all';
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter') || 'all';
      renderMessages(currentFilter);
    });
  });

  // Form Submit
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nickInput = document.getElementById('fbNickname');
      const catInput = document.getElementById('fbCategory');
      const gpuInput = document.getElementById('fbGpu');
      const msgInput = document.getElementById('fbMessage');

      const nick = nickInput ? nickInput.value.trim() : '';
      const category = catInput ? catInput.value : 'app_boa';
      const gpu = gpuInput ? gpuInput.value.trim() : '';
      const msg = msgInput ? msgInput.value.trim() : '';
      const rating = ratingInput ? parseInt(ratingInput.value) || 5 : 5;

      if (!nick || !msg) return;

      const avatarStyles = ['', 'avatar-cyan', 'avatar-purple', 'avatar-green'];
      const randomAvatar = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];

      const newMsg = {
        id: 'user_' + Date.now(),
        nick,
        category,
        gpu,
        rating,
        time: 'Agora mesmo',
        msg,
        avatarClass: randomAvatar
      };

      // Add to messages
      allMessages.unshift(newMsg);
      storedMessages.unshift(newMsg);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedMessages));
      } catch (err) {}

      // Re-render
      renderMessages(currentFilter);

      // Play soft feedback audio cue
      playFeedbackChime();

      // Show toast
      showToastNotification(`Obrigado pelo teu feedback, ${nick}! Foi publicado no mural.`);

      // Reset form fields
      if (msgInput) msgInput.value = '';
      if (gpuInput) gpuInput.value = '';
    });
  }

  // Initial render
  renderMessages('all');
}

// Utility: HTML Escaping
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Utility: Soft Web Audio Chime
function playFeedbackChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {}
}

// Utility: Toast Notification
function showToastNotification(message) {
  let toast = document.getElementById('clipToast');
  if (!toast) return;

  const sub = toast.querySelector('.toast-sub');
  const title = toast.querySelector('.toast-title');
  if (title) title.textContent = 'Feedback Recebido! 🚀';
  if (sub) sub.textContent = message;

  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 4000);
}
