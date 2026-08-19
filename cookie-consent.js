/* ==========================================================
   MINI COOKIE-CONSENT FILE
   Hardcoded cookie gate: kawaii bug chases your mouse until
   you answer the banner. Answer is stored as a real browser
   cookie so the gate is silently skipped on future visits.
   ========================================================== */
(function () {
  const COOKIE_NAME = 'bsr_consent';
  const COOKIE_VALUE_ACCEPTED = 'accepted';
  const COOKIE_DAYS = 365;

  /* ---------------- cookie helpers ---------------- */
  function getCookie(name) {
    const match = document.cookie.match('(^|;\\s*)' + name + '=([^;]*)');
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
  }

  /* ---------------- Google Analytics (gtag.js) injection ---------------- */
  function injectGoogleAnalytics() {
    const GA_ID = 'G-NFC3M5EDVM';
    if (document.getElementById('ga-gtag-script')) return;

    const s1 = document.createElement('script');
    s1.id = 'ga-gtag-script';
    s1.async = true;
    s1.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s1);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', GA_ID);
    window.gtag = gtag;
  }

  /* ---------------- gate elements ---------------- */
  const gate = document.getElementById('cookieGate');
  const canvas = document.getElementById('gateCanvas');
  const ctx = canvas.getContext('2d');
  const cookieBanner = document.getElementById('gateCookieBanner');
  const bannerTitle = document.getElementById('gateBannerTitle');
  const yesBtn = document.getElementById('gateYesBtn');
  const noBtn = document.getElementById('gateNoBtn');

  // Already agreed (or declined) before -> skip the gate silently, no chase.
  if (getCookie(COOKIE_NAME) !== null) {
    gate.classList.add('hidden');
    if (getCookie(COOKIE_NAME) === COOKIE_VALUE_ACCEPTED) injectGoogleAnalytics();
    return;
  }

  let width, height;
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const mouse = { x: width / 2 + 160, y: height / 2 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  let isMenuHovered = false;
  cookieBanner.addEventListener('mouseenter', () => { isMenuHovered = true; });
  cookieBanner.addEventListener('mouseleave', () => { isMenuHovered = false; });

  class Segment {
    constructor(x, y, radius = 24) {
      this.x = x;
      this.y = y;
      this.angle = 0;
      this.radius = radius;
      this.squishX = 1;
      this.squishY = 1;
    }

    draw(legPhase, isHead, emotion) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.scale(this.squishX, this.squishY);

      const legL = Math.sin(legPhase) * 10;
      const legR = Math.cos(legPhase) * 10;

      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(0, -this.radius * 0.7);
      ctx.lineTo(-this.radius * 1.5, -this.radius * 1.6 + legL);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, this.radius * 0.7);
      ctx.lineTo(-this.radius * 1.5, this.radius * 1.8 + legR);
      ctx.stroke();

      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ec4899';
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, -Math.PI / 2, Math.PI / 2, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (isHead) {
        ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
        ctx.beginPath();
        ctx.arc(this.radius * 0.3, -this.radius * 0.55, 4.5, 0, Math.PI * 2);
        ctx.arc(this.radius * 0.3, this.radius * 0.55, 4.5, 0, Math.PI * 2);
        ctx.fill();

        const eyeX = this.radius * 0.45;
        const eyeSpacing = this.radius * 0.42;

        [-1, 1].forEach(dir => {
          const eyeY = dir * eyeSpacing;

          if (emotion === 'happy') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(eyeX - 2, eyeY, 6, -Math.PI / 2.2, Math.PI / 2.2, false);
            ctx.stroke();
          } else if (emotion === 'sad') {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(eyeX - 2, eyeY - 4);
            ctx.lineTo(eyeX + 2, eyeY);
            ctx.lineTo(eyeX - 2, eyeY + 4);
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(eyeX - 4, eyeY, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, 7.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(eyeX + 2, eyeY - 2.5, 3.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(eyeX - 1.5, eyeY + 2.5, 1.6, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (emotion === 'sad') {
          ctx.arc(this.radius * 0.65, 0, 3, Math.PI * 0.2, Math.PI * 0.8, false);
        } else {
          ctx.arc(this.radius * 0.7, -1.5, 2.5, 0, Math.PI);
          ctx.arc(this.radius * 0.7, 1.5, 2.5, 0, Math.PI);
        }
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  class KawaiiCrawler {
    constructor() {
      this.x = width / 2 - 100;
      this.y = height / 2;
      this.numSegments = 3;
      this.segmentDist = 28;
      this.segments = [];
      for (let i = 0; i < this.numSegments; i++) {
        this.segments.push(new Segment(this.x - i * this.segmentDist, this.y));
      }
      this.speed = 2.4;
      this.angle = 0;
      this.legTimer = 0;
      this.emotion = 'normal';
    }

    update() {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distToMouse = Math.hypot(dx, dy);

      this.angle = Math.atan2(dy, dx);

      if (!isMenuHovered && distToMouse > 65) {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.legTimer += 0.18;
      }

      this.segments[0].x = this.x;
      this.segments[0].y = this.y;
      this.segments[0].angle = this.angle;

      for (let i = 0; i < this.segments.length; i++) {
        const seg = this.segments[i];

        if (i > 0) {
          const prev = this.segments[i - 1];
          const segDx = prev.x - seg.x;
          const segDy = prev.y - seg.y;
          seg.angle = Math.atan2(segDy, segDx);
          seg.x = prev.x - Math.cos(seg.angle) * this.segmentDist;
          seg.y = prev.y - Math.sin(seg.angle) * this.segmentDist;
        }

        const mouseDist = Math.hypot(seg.x - mouse.x, seg.y - mouse.y);
        if (mouseDist < 45) {
          seg.squishX = Math.max(0.4, seg.squishX - 0.15);
          seg.squishY = Math.min(1.7, seg.squishY + 0.15);
        } else {
          seg.squishX += (1 - seg.squishX) * 0.1;
          seg.squishY += (1 - seg.squishY) * 0.1;
        }
      }

      cookieBanner.style.left = `${this.x}px`;
      cookieBanner.style.top = `${this.y - 52}px`;
    }

    draw() {
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 3.5;
      for (let i = 0; i < this.segments.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(this.segments[i].x, this.segments[i].y);
        ctx.lineTo(this.segments[i + 1].x, this.segments[i + 1].y);
        ctx.stroke();
      }

      for (let i = this.segments.length - 1; i >= 0; i--) {
        this.segments[i].draw(this.legTimer + i * 1.5, i === 0, this.emotion);
      }
    }
  }

  const bot = new KawaiiCrawler();
  let rafId = null;

  function closeGate() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    gate.classList.add('hidden');
  }

  yesBtn.addEventListener('click', () => {
    setCookie(COOKIE_NAME, COOKIE_VALUE_ACCEPTED, COOKIE_DAYS);
    injectGoogleAnalytics();
    bot.emotion = 'happy';
    bannerTitle.textContent = 'YAY! TANK YOU! (≧▽≦)🍪';
    cookieBanner.style.borderColor = '#22c55e';
    setTimeout(closeGate, 700);
  });

  noBtn.addEventListener('click', () => {
    // No cookie is stored on decline, so the gate returns next visit.
    // Guilt trip first: the bug stays sad and keeps chasing the mouse
    // for 20s, cycling through a few pleas, before letting you through.
    bot.emotion = 'sad';
    cookieBanner.style.borderColor = '#ef4444';

    const guiltMessages = [
      'nuuu why not? plz? (╥﹏╥)',
      "i'll just keep following you then...",
      'was it something i said? 🥺',
      "i'm not crying, you're crying (╥﹏╥)",
      'fine. FINE. i see how it is.'
    ];
    let guiltIndex = 0;
    bannerTitle.textContent = guiltMessages[guiltIndex];

    const guiltInterval = setInterval(() => {
      guiltIndex = (guiltIndex + 1) % guiltMessages.length;
      bannerTitle.textContent = guiltMessages[guiltIndex];
    }, 4000);

    setTimeout(() => {
      clearInterval(guiltInterval);
      closeGate();
    }, 20000);
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);
    bot.update();
    bot.draw();
    rafId = requestAnimationFrame(animate);
  }

  animate();
})();
