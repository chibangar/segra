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
