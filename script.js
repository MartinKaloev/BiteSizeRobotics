/* ==========================================================
   MAIN SITE SCRIPT
   Each widget below is ported from its original standalone
   prototype file and wrapped in its own IIFE so variable
   names (canvas, ctx, mouse, ...) never collide across
   sections.
   ========================================================== */

/* Each per-slide widget registers a reset() here, keyed by its section
   id. A single IntersectionObserver (set up at the bottom of this file,
   once every widget below has registered) calls reset() every time that
   slide scrolls back into view, so nothing is ever left mid-animation
   or mid-cycle from a previous visit — this is also what forces the
   attention-DRL gif to restart cleanly instead of occasionally getting
   stuck on a frame. */
const sectionAnimators = {};

/* ================================================================
   0. PERSISTENT BACKGROUND CRAWLER SWARM (from crawelers.html)
   ================================================================ */
(function backgroundCrawlerSwarm() {
  const canvas = document.getElementById('bgCrawlCanvas');
  const ctx = canvas.getContext('2d');

  let width, height;
  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const mouse = { x: -1000, y: -1000 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  class Packet {
    constructor(x, y) {
      this.x = x || Math.random() * (width - 100) + 50;
      this.y = y || Math.random() * (height - 100) + 50;
      this.size = 18;
      this.carried = false;
      this.id = Math.floor(Math.random() * 900 + 100);
    }

    draw() {
      if (this.carried) return;
      ctx.save();
      ctx.translate(this.x, this.y);

      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;

      ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
      ctx.fillRect(-this.size / 2 + 2, -this.size / 2 + 2, this.size - 4, this.size - 4);

      ctx.fillStyle = '#ffffff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`P-${this.id}`, 0, 0);

      ctx.restore();
    }
  }

  class Segment {
    constructor(x, y, radius = 18) {
      this.x = x;
      this.y = y;
      this.angle = 0;
      this.radius = radius;
      this.squishX = 1;
      this.squishY = 1;
    }

    draw(legOffsetTime, index) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.scale(this.squishX, this.squishY);

      const legPhase = legOffsetTime + index * 1.5;
      const legWiggleL = Math.sin(legPhase) * 12;
      const legWiggleR = Math.cos(legPhase) * 12;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(0, -this.radius * 0.7);
      ctx.lineTo(-this.radius * 1.6, -this.radius * 1.8 + legWiggleL);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, this.radius * 0.7);
      ctx.lineTo(-this.radius * 1.6, this.radius * 1.8 + legWiggleR);
      ctx.stroke();

      ctx.shadowBlur = 8;
      ctx.shadowColor = '#0284c7';
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, -Math.PI / 2, Math.PI / 2, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (index === 0) {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(this.radius * 0.45, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  class CrawlerBot {
    constructor() {
      this.spawnEdge();
      this.numSegments = 3;
      this.segmentDist = 26;
      this.segments = [];
      for (let i = 0; i < this.numSegments; i++) {
        this.segments.push(new Segment(this.x - i * this.segmentDist, this.y));
      }

      this.speed = 1.4 + Math.random() * 0.8;
      this.angle = Math.random() * Math.PI * 2;
      this.target = null;
      this.state = 'WANDER';
      this.home = { x: this.x, y: this.y };
      this.carriedPacket = null;
      this.legTimer = 0;
    }

    spawnEdge() {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { this.x = -40; this.y = Math.random() * height; }
      else if (edge === 1) { this.x = width + 40; this.y = Math.random() * height; }
      else if (edge === 2) { this.x = Math.random() * width; this.y = -40; }
      else { this.x = Math.random() * width; this.y = height + 40; }
    }

    update(packets) {
      this.legTimer += 0.12;

      if (this.state === 'WANDER') {
        let nearest = null;
        let minDst = Infinity;
        for (const p of packets) {
          if (!p.carried) {
            const d = Math.hypot(p.x - this.x, p.y - this.y);
            if (d < minDst) {
              minDst = d;
              nearest = p;
            }
          }
        }
        if (nearest) {
          this.target = nearest;
          this.state = 'FETCH';
        } else if (Math.random() < 0.02) {
          this.angle += (Math.random() - 0.5) * 1.5;
        }
      } else if (this.state === 'FETCH') {
        if (!this.target || this.target.carried) {
          this.state = 'WANDER';
        } else {
          const dx = this.target.x - this.x;
          const dy = this.target.y - this.y;
          const dist = Math.hypot(dx, dy);
          this.angle = Math.atan2(dy, dx);

          if (dist < 18) {
            this.carriedPacket = this.target;
            this.carriedPacket.carried = true;
            this.state = 'RETURN';
          }
        }
      } else if (this.state === 'RETURN') {
        const dx = this.home.x - this.x;
        const dy = this.home.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.angle = Math.atan2(dy, dx);

        this.carriedPacket.x = this.segments[0].x + Math.cos(this.angle) * 22;
        this.carriedPacket.y = this.segments[0].y + Math.sin(this.angle) * 22;

        if (dist < 30) {
          const idx = packets.indexOf(this.carriedPacket);
          if (idx !== -1) packets.splice(idx, 1);
          this.carriedPacket = null;
          this.spawnEdge();
          this.home = { x: this.x, y: this.y };
          this.state = 'WANDER';
        }
      }

      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      this.segments[0].x = this.x;
      this.segments[0].y = this.y;
      this.segments[0].angle = this.angle;

      for (let i = 0; i < this.segments.length; i++) {
        const seg = this.segments[i];

        if (i > 0) {
          const prev = this.segments[i - 1];
          const dx = prev.x - seg.x;
          const dy = prev.y - seg.y;
          seg.angle = Math.atan2(dy, dx);
          seg.x = prev.x - Math.cos(seg.angle) * this.segmentDist;
          seg.y = prev.y - Math.sin(seg.angle) * this.segmentDist;
        }

        const mouseDist = Math.hypot(seg.x - mouse.x, seg.y - mouse.y);
        if (mouseDist < 45) {
          seg.squishX = Math.max(0.4, seg.squishX - 0.15);
          seg.squishY = Math.min(1.6, seg.squishY + 0.15);
        } else {
          seg.squishX += (1 - seg.squishX) * 0.1;
          seg.squishY += (1 - seg.squishY) * 0.1;
        }
      }
    }

    draw() {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      for (let i = 0; i < this.segments.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(this.segments[i].x, this.segments[i].y);
        ctx.lineTo(this.segments[i + 1].x, this.segments[i + 1].y);
        ctx.stroke();
      }

      for (let i = this.segments.length - 1; i >= 0; i--) {
        this.segments[i].draw(this.legTimer, i);
      }

      if (this.carriedPacket) {
        ctx.save();
        ctx.translate(this.carriedPacket.x, this.carriedPacket.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#06b6d4';
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-8, -8, 16, 16);
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
      }
    }
  }

  const packets = [];
  for (let i = 0; i < 6; i++) packets.push(new Packet());

  const bots = [];
  for (let i = 0; i < 4; i++) bots.push(new CrawlerBot());

  setInterval(() => {
    if (packets.length < 8) packets.push(new Packet());
  }, 3000);

  function animate() {
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    packets.forEach(p => p.draw());

    bots.forEach(bot => {
      bot.update(packets);
      bot.draw();
    });

    requestAnimationFrame(animate);
  }

  animate();
})();

/* ================================================================
   1. CLOCK / WHEEL WIDGET (from cloclky clockky.html + spiny , spinny .html)
   ================================================================ */
(function clockCountdownAndFlip() {
  // The spin wheel itself (segments, weights, drawing, spinning, link
  // pop-open) lives in spinner.js. This IIFE only owns the countdown timer
  // and the card-flip animation that shows/hides the wheel side; it reads
  // window.wheelSpinnerState.isSpinning (set by spinner.js) so the
  // auto-flip pauses while a spin is in progress.
  const targetDate = new Date('2026-11-11T12:00:00+02:00').getTime();
  const clockText = document.getElementById('clockText');

  function updateCountdown() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      clockText.textContent = '00days:00h:00m:00s';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    clockText.textContent = `${days}days:${String(hours).padStart(2, '0')}h:${String(minutes).padStart(2, '0')}m:${String(seconds).padStart(2, '0')}s`;
  }
  setInterval(updateCountdown, 1000);
  updateCountdown();

  const flipper = document.getElementById('clockFlipper');
  const swapBar = document.getElementById('clockSwapBar');
  let isFlipped = false;
  let elapsed = 0;
  const SWAP_TIME = 10000;
  const spinState = window.wheelSpinnerState;

  setInterval(() => {
    if (spinState.isSpinning) return;

    elapsed += 100;
    const progress = (elapsed / SWAP_TIME) * 100;
    swapBar.style.width = `${progress}%`;

    if (elapsed >= SWAP_TIME) {
      elapsed = 0;
      isFlipped = !isFlipped;
      flipper.classList.toggle('flipped', isFlipped);
    }
  }, 100);

  // Click the clock face to skip straight to the wheel instead of waiting
  // out the full 10s auto-flip.
  const clockFace = document.querySelector('.clock-clock-side');
  clockFace.addEventListener('click', () => {
    if (isFlipped || spinState.isSpinning) return;
    elapsed = 0;
    isFlipped = true;
    flipper.classList.add('flipped');
    swapBar.style.width = '0%';
  });

  sectionAnimators['section-clock'] = {
    reset() {
      elapsed = 0;
      isFlipped = false;
      flipper.classList.remove('flipped');
      swapBar.style.width = '0%';
    }
  };
})();

/* ================================================================
   2. ATTENTION-DRL IDE WIDGET (from slop swap.html)
   ================================================================ */
(function ideTransformerWidget() {
  const codeFiles = [
    {
      name: '⚡ transformer_jax.py',
      code:
`<span class="syn-comment"># Minimal single-head self-attention for a DRL policy (JAX)</span>
<span class="syn-keyword">import</span> jax
<span class="syn-keyword">import</span> jax.numpy <span class="syn-keyword">as</span> <span class="syn-var">jnp</span>

<span class="syn-keyword">def</span> <span class="syn-fn">attention</span>(<span class="syn-var">q</span>, <span class="syn-var">k</span>, <span class="syn-var">v</span>):
    <span class="syn-var">d_k</span> = <span class="syn-var">q</span>.shape[-<span class="syn-num">1</span>]
    <span class="syn-var">scores</span> = <span class="syn-var">q</span> @ <span class="syn-var">k</span>.T / jnp.sqrt(<span class="syn-var">d_k</span>)
    <span class="syn-var">weights</span> = jax.nn.softmax(<span class="syn-var">scores</span>, axis=-<span class="syn-num">1</span>)
    <span class="syn-keyword">return</span> <span class="syn-var">weights</span> @ <span class="syn-var">v</span>

<span class="syn-keyword">def</span> <span class="syn-fn">policy_step</span>(<span class="syn-var">params</span>, <span class="syn-var">traj</span>):
    <span class="syn-comment"># traj: sequence of (state, action, reward) embeddings</span>
    <span class="syn-var">q</span> = <span class="syn-var">traj</span> @ <span class="syn-var">params</span>[<span class="syn-str">'Wq'</span>]
    <span class="syn-var">k</span> = <span class="syn-var">traj</span> @ <span class="syn-var">params</span>[<span class="syn-str">'Wk'</span>]
    <span class="syn-var">v</span> = <span class="syn-var">traj</span> @ <span class="syn-var">params</span>[<span class="syn-str">'Wv'</span>]
    <span class="syn-var">context</span> = <span class="syn-fn">attention</span>(<span class="syn-var">q</span>, <span class="syn-var">k</span>, <span class="syn-var">v</span>)
    <span class="syn-keyword">return</span> <span class="syn-var">context</span>[-<span class="syn-num">1</span>] @ <span class="syn-var">params</span>[<span class="syn-str">'Wout'</span>]  <span class="syn-comment"># next action logits</span>`
    },
    {
      name: '🔥 transformer_pytorch.py',
      code:
`<span class="syn-comment"># Minimal single-head self-attention for a DRL policy (PyTorch)</span>
<span class="syn-keyword">import</span> torch, torch.nn <span class="syn-keyword">as</span> <span class="syn-var">nn</span>

<span class="syn-keyword">class</span> <span class="syn-fn">AttentionDRLPolicy</span>(<span class="syn-var">nn</span>.Module):
    <span class="syn-keyword">def</span> <span class="syn-fn">__init__</span>(<span class="syn-var">self</span>, <span class="syn-var">d_model</span>, <span class="syn-var">n_actions</span>):
        <span class="syn-fn">super</span>().__init__()
        <span class="syn-var">self</span>.q = <span class="syn-var">nn</span>.Linear(<span class="syn-var">d_model</span>, <span class="syn-var">d_model</span>)
        <span class="syn-var">self</span>.k = <span class="syn-var">nn</span>.Linear(<span class="syn-var">d_model</span>, <span class="syn-var">d_model</span>)
        <span class="syn-var">self</span>.v = <span class="syn-var">nn</span>.Linear(<span class="syn-var">d_model</span>, <span class="syn-var">d_model</span>)
        <span class="syn-var">self</span>.out = <span class="syn-var">nn</span>.Linear(<span class="syn-var">d_model</span>, <span class="syn-var">n_actions</span>)

    <span class="syn-keyword">def</span> <span class="syn-fn">forward</span>(<span class="syn-var">self</span>, <span class="syn-var">traj</span>):
        <span class="syn-comment"># traj: [seq_len, d_model] of (state, action, reward) embeddings</span>
        <span class="syn-var">scores</span> = <span class="syn-var">self</span>.q(<span class="syn-var">traj</span>) @ <span class="syn-var">self</span>.k(<span class="syn-var">traj</span>).T
        <span class="syn-var">weights</span> = torch.softmax(<span class="syn-var">scores</span> / <span class="syn-var">traj</span>.shape[-<span class="syn-num">1</span>] ** <span class="syn-num">0.5</span>, dim=-<span class="syn-num">1</span>)
        <span class="syn-var">context</span> = <span class="syn-var">weights</span> @ <span class="syn-var">self</span>.v(<span class="syn-var">traj</span>)
        <span class="syn-keyword">return</span> <span class="syn-var">self</span>.out(<span class="syn-var">context</span>[-<span class="syn-num">1</span>])  <span class="syn-comment"># next action logits</span>`
    }
  ];

  let currentFile = 0;
  const typedCodeEl = document.getElementById('ideTypedCode');
  const lineNumbersEl = document.getElementById('ideLineNumbers');
  const ideBodyEl = document.getElementById('ideBody');
  const ideTimerEl = document.getElementById('ideTimer');
  const ideFileTabEl = document.getElementById('ideFileTab');

  // Parse the syntax-highlighted source into flat segments (one per plain
  // text run or colored <span>) using the browser's own HTML parser, so
  // entities etc. are handled correctly. This runs once per file, on the
  // complete well-formed string -- never on a half-typed one.
  function parseSegments(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    return Array.from(container.childNodes).map(node => ({
      className: node.nodeType === Node.ELEMENT_NODE ? node.className : null,
      fullText: node.textContent
    }));
  }

  let typingInterval = null;

  function typeCode() {
    clearInterval(typingInterval);
    typedCodeEl.innerHTML = '';
    lineNumbersEl.innerHTML = '1';
    ideBodyEl.scrollTop = 0;

    const file = codeFiles[currentFile];
    ideFileTabEl.textContent = file.name;

    const segments = parseSegments(file.code);

    // Build the real DOM nodes up front (each colored span already has its
    // class, just empty) -- then the animation only ever grows a node's
    // textContent, which never gets re-parsed as HTML and so can't get
    // auto-closed mid-word the way the old innerHTML-concatenation did.
    const liveNodes = segments.map(seg => {
      if (seg.className) {
        const span = document.createElement('span');
        span.className = seg.className;
        typedCodeEl.appendChild(span);
        return span;
      }
      const textNode = document.createTextNode('');
      typedCodeEl.appendChild(textNode);
      return textNode;
    });

    let segIndex = 0;
    let charIndex = 0;

    typingInterval = setInterval(() => {
      if (segIndex >= segments.length) {
        clearInterval(typingInterval);
        return;
      }

      charIndex++;
      const seg = segments[segIndex];
      liveNodes[segIndex].textContent = seg.fullText.slice(0, charIndex);

      if (charIndex >= seg.fullText.length) {
        segIndex++;
        charIndex = 0;
      }

      let revealedText = '';
      for (let i = 0; i <= Math.min(segIndex, segments.length - 1); i++) {
        revealedText += liveNodes[i].textContent;
      }
      const lineCount = (revealedText.match(/\n/g) || []).length + 1;
      lineNumbersEl.innerHTML = Array.from({ length: lineCount }, (_, i) => i + 1).join('<br>');

      // Auto-slide the code box to follow the newest typed line instead of
      // letting the box grow to fit -- matters most on mobile, where the
      // IDE panel has a fixed height and no room to expand.
      ideBodyEl.scrollTop = ideBodyEl.scrollHeight;
    }, 22);

    currentFile = (currentFile + 1) % codeFiles.length;
  }

  typeCode();

  let ideSeconds = 20;
  setInterval(() => {
    ideSeconds--;
    ideTimerEl.textContent = `Retype: ${ideSeconds}s`;
    if (ideSeconds <= 0) {
      ideSeconds = 20;
      typeCode();
    }
  }, 1000);

  const flipperCard = document.getElementById('ideFlipperCard');
  const swapProgress = document.getElementById('ideSwapProgress');
  // The gif is the front face (unflipped) so it's what plays first; the
  // explanation text is the back face.
  let isFlipped = false;
  let elapsed = 0;
  const SWAP_INTERVAL = 5000;

  const gifImg = document.getElementById('ideGifImg');
  const gifSrc = gifImg ? gifImg.getAttribute('src') : null;

  function reloadGif() {
    // Force the gif to re-decode from frame 0 every time it comes back
    // into view, instead of resuming wherever it happened to freeze.
    if (gifImg && gifSrc) {
      gifImg.src = '';
      gifImg.src = `${gifSrc.split('?')[0]}?t=${Date.now()}`;
    }
  }

  setInterval(() => {
    elapsed += 100;
    const pct = (elapsed / SWAP_INTERVAL) * 100;
    swapProgress.style.width = `${pct}%`;

    if (elapsed >= SWAP_INTERVAL) {
      elapsed = 0;
      isFlipped = !isFlipped;
      flipperCard.classList.toggle('flipped', isFlipped);
      swapProgress.style.background = isFlipped ? '#c084fc' : '#38bdf8';
      if (!isFlipped) reloadGif();
    }
  }, 100);

  sectionAnimators['section-ide'] = {
    reset() {
      ideSeconds = 20;
      typeCode();

      elapsed = 0;
      isFlipped = false;
      flipperCard.classList.remove('flipped');
      swapProgress.style.width = '0%';
      swapProgress.style.background = '#38bdf8';

      reloadGif();
    }
  };
})();

/* ================================================================
   3. CNN ZOOM WIDGET (from zoom cnns.html)
   ================================================================ */
(function cnnZoomWidget() {
  const cnnMatrix = document.getElementById('cnnMatrix');
  const telemetryCard = document.getElementById('cnnTelemetryCard');
  const statusTag = document.getElementById('cnnStatusTag');

  const lines = [
    document.getElementById('cnnLine1'),
    document.getElementById('cnnLine2'),
    document.getElementById('cnnLine3'),
    document.getElementById('cnnLine4')
  ];

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // A generation token so that when reset() starts a fresh loop, the old
  // (stale) loop notices on its next wakeup and quietly stops instead of
  // fighting the new one over the same DOM classes.
  let generation = 0;

  async function runAnimationLoop(myGen) {
    while (myGen === generation) {
      statusTag.textContent = 'STATE: SCANNING 3x3 MATRIX';
      cnnMatrix.classList.remove('zoomed');
      telemetryCard.classList.remove('visible');
      lines.forEach(l => l.classList.remove('revealed'));
      await sleep(1800);
      if (myGen !== generation) return;

      statusTag.textContent = 'STATE: ZOOMING IN MID SQR [1, 1]';
      cnnMatrix.classList.add('zoomed');
      await sleep(1000);
      if (myGen !== generation) return;

      telemetryCard.classList.add('visible');
      await sleep(400);
      if (myGen !== generation) return;

      statusTag.textContent = 'STATE: TRACKING METRICS';
      for (let i = 0; i < lines.length; i++) {
        lines[i].classList.add('revealed');
        await sleep(650);
        if (myGen !== generation) return;
      }

      await sleep(3500);
      if (myGen !== generation) return;

      statusTag.textContent = 'STATE: BUFFER RECYCLE (LOOPING BACK)';
      telemetryCard.classList.remove('visible');
      await sleep(500);
    }
  }

  runAnimationLoop(generation);

  sectionAnimators['section-cnn'] = {
    reset() {
      generation++;
      runAnimationLoop(generation);
    }
  };
})();

/* ================================================================
   4. PUBLICATIONS / BI-CURVES 3D WIDGET (from bi curves.html)
   ================================================================ */
(function publicationsBiCurveWidget() {
  // Isolated in a try/catch: if this browser can't create a WebGL context,
  // that failure must not abort the rest of script.js (widgets defined below).
  try {
  const container = document.querySelector('.pub-viewport-container');
  const canvas = document.getElementById('pubWebglCanvas');
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(22, 18, 26);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(4, 3, 4);

  const origin = new THREE.Vector3(0, 0, 0);
  const axisLength = 16;

  scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), origin, axisLength, 0xffffff, 1.2, 0.6));
  scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0.2).normalize(), origin, axisLength + 2, 0xffffff, 1.2, 0.6));
  scene.add(new THREE.ArrowHelper(new THREE.Vector3(0.2, 0, 1).normalize(), origin, axisLength + 2, 0xffffff, 1.2, 0.6));

  const grid = new THREE.GridHelper(24, 16, 0x1e293b, 0x0f172a);
  grid.position.set(8, 0, 8);
  scene.add(grid);

  const NUM_POINTS = 100;

  const geom1 = new THREE.BufferGeometry();
  const pos1 = new Float32Array(NUM_POINTS * 3);
  geom1.setAttribute('position', new THREE.BufferAttribute(pos1, 3));
  const line1 = new THREE.Line(geom1, new THREE.LineBasicMaterial({ color: 0x00f2fe, linewidth: 3 }));
  scene.add(line1);

  const geom2 = new THREE.BufferGeometry();
  const pos2 = new Float32Array(NUM_POINTS * 3);
  geom2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
  const line2 = new THREE.Line(geom2, new THREE.LineBasicMaterial({ color: 0xf43f5e, linewidth: 3 }));
  scene.add(line2);

  const INITIAL_PARAMS = {
    c1: { height: 9.0, mu: 0.5, sigma: 0.16, spanX: 14, spanZ: 5 },
    c2: { height: 6.5, mu: 0.4, sigma: 0.12, spanX: 8, spanZ: 14 }
  };
  let currentParams = JSON.parse(JSON.stringify(INITIAL_PARAMS));
  let targetParams = JSON.parse(JSON.stringify(currentParams));

  function randomDistribution() {
    return {
      c1: {
        height: 6 + Math.random() * 6.5,
        mu: 0.35 + Math.random() * 0.35,
        sigma: 0.12 + Math.random() * 0.09,
        spanX: 11 + Math.random() * 5,
        spanZ: 3 + Math.random() * 6
      },
      c2: {
        height: 5 + Math.random() * 5.5,
        mu: 0.3 + Math.random() * 0.4,
        sigma: 0.10 + Math.random() * 0.08,
        spanX: 5 + Math.random() * 6,
        spanZ: 11 + Math.random() * 5
      }
    };
  }

  function computeBell(t, p) {
    const exponent = -Math.pow(t - p.mu, 2) / (2 * Math.pow(p.sigma, 2));
    return p.height * Math.exp(exponent);
  }

  function updateCurvePositions(geom, params) {
    const arr = geom.attributes.position.array;
    for (let i = 0; i < NUM_POINTS; i++) {
      const t = i / (NUM_POINTS - 1);
      const x = t * params.spanX;
      const z = t * params.spanZ;
      const y = computeBell(t, params);

      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    geom.attributes.position.needsUpdate = true;
  }

  setInterval(() => {
    targetParams = randomDistribution();
  }, 3000);

  function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  function morphParams() {
    const speed = 0.04;
    ['c1', 'c2'].forEach(key => {
      currentParams[key].height = lerp(currentParams[key].height, targetParams[key].height, speed);
      currentParams[key].mu = lerp(currentParams[key].mu, targetParams[key].mu, speed);
      currentParams[key].sigma = lerp(currentParams[key].sigma, targetParams[key].sigma, speed);
      currentParams[key].spanX = lerp(currentParams[key].spanX, targetParams[key].spanX, speed);
      currentParams[key].spanZ = lerp(currentParams[key].spanZ, targetParams[key].spanZ, speed);
    });

    updateCurvePositions(geom1, currentParams.c1);
    updateCurvePositions(geom2, currentParams.c2);
  }

  function animate() {
    requestAnimationFrame(animate);
    morphParams();
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  sectionAnimators['section-pub'] = {
    reset() {
      currentParams = JSON.parse(JSON.stringify(INITIAL_PARAMS));
      targetParams = JSON.parse(JSON.stringify(INITIAL_PARAMS));
      updateCurvePositions(geom1, currentParams.c1);
      updateCurvePositions(geom2, currentParams.c2);
    }
  };
  } catch (err) {
    console.warn('Publications 3D view unavailable (no WebGL?):', err);
  }
})();

/* ================================================================
   5. INDEX MASTER (trivia game -- King Indexer grows on correct answers)
   ================================================================ */
(function indexMasterGame() {
  const canvas = document.getElementById('kingBotCanvas');
  const stage = document.getElementById('gameStage');
  if (!canvas || !stage) return;
  const ctx = canvas.getContext('2d');

  const questionEl = document.getElementById('gameQuestion');
  const answersEl = document.getElementById('gameAnswers');
  const progressEl = document.getElementById('gameProgress');
  const feedbackEl = document.getElementById('gameFeedback');
  const segmentCountEl = document.getElementById('gameSegmentCount');

  const STORAGE_Q = 'im_question_index';
  const STORAGE_SEG = 'im_king_segments';
  const MIN_SEG = 3;
  const MAX_SEG = 28;

  let questions = [];
  let questionIndex = parseInt(localStorage.getItem(STORAGE_Q), 10) || 0;
  let kingSegmentCount = parseInt(localStorage.getItem(STORAGE_SEG), 10) || MIN_SEG;
  let answering = false;

  let width, height;
  function resize() {
    const rect = stage.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
  }
  window.addEventListener('resize', resize);
  resize();

  // Same dome-body-plus-legs look used by every other bot on the site,
  // just gold instead of blue, with a small crown added on the head.
  class KingSegment {
    constructor(x, y, radius = 9) {
      this.x = x;
      this.y = y;
      this.angle = 0;
      this.radius = radius;
      this.squishX = 1;
      this.squishY = 1;
    }

    draw(legPhase, isHead) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.scale(this.squishX, this.squishY);

      const legL = Math.sin(legPhase) * 5;
      const legR = Math.cos(legPhase) * 5;

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(0, -this.radius * 0.7);
      ctx.lineTo(-this.radius * 1.6, -this.radius * 1.8 + legL);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, this.radius * 0.7);
      ctx.lineTo(-this.radius * 1.6, this.radius * 1.8 + legR);
      ctx.stroke();

      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ca8a04';
      ctx.fillStyle = '#1c1305';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, -Math.PI / 2, Math.PI / 2, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (isHead) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(-4, -this.radius * 0.9);
        ctx.lineTo(-4, -this.radius * 1.6);
        ctx.lineTo(0, -this.radius * 1.1);
        ctx.lineTo(4, -this.radius * 1.6);
        ctx.lineTo(4, -this.radius * 0.9);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(this.radius * 0.45, 0, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // The King's own packet: unlike every other packet on the site, this
  // one is never carried anywhere -- it just gets eaten in place, then
  // reappears somewhere new for the King to go hunt down again.
  class KingPacket {
    constructor(w, h) {
      this.respawn(w, h);
    }
    respawn(w, h) {
      this.x = 20 + Math.random() * Math.max(1, w - 40);
      this.y = 20 + Math.random() * Math.max(1, h - 40);
      this.age = 0;
    }
    draw() {
      this.age++;
      const scale = Math.min(1, this.age / 12); // quick pop-in when it reappears
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(scale, scale);
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#38bdf8';
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
  }

  class KingBot {
    constructor(count) {
      this.x = 0;
      this.y = 0;
      this.angle = Math.random() * Math.PI * 2;
      this.speed = 0.35;
      this.segmentDist = 11;
      this.segments = [];
      this.legTimer = 0;
      this._placed = false;
      this.packet = null; // set right after construction, once width/height are known
      this.setSegmentCount(count);
    }

    place() {
      this.x = width / 2;
      this.y = height / 2;
      this.segments.forEach((s, i) => {
        s.x = this.x - i * this.segmentDist;
        s.y = this.y;
      });
      this._placed = true;
    }

    // Grows (or, in principle, shrinks) toward n segments by adding new
    // ones at the tail's current position -- they get pulled into the
    // follow-chain naturally over the next few frames instead of
    // popping in somewhere jarring.
    setSegmentCount(n) {
      n = Math.max(MIN_SEG, Math.min(MAX_SEG, n));
      while (this.segments.length < n) {
        const tail = this.segments[this.segments.length - 1];
        this.segments.push(new KingSegment(tail ? tail.x : this.x, tail ? tail.y : this.y));
      }
      this.segments.length = n;
    }

    update() {
      if (!this._placed && width) this.place();
      this.legTimer += 0.12;

      if (this.packet) {
        // Always hunting: steer straight at the current packet, and when
        // the head reaches it, it's eaten -- gone, then reappears
        // somewhere new for the King to go find next.
        const dx = this.packet.x - this.x;
        const dy = this.packet.y - this.y;
        this.angle = Math.atan2(dy, dx);
        if (Math.hypot(dx, dy) < 14) {
          this.packet.respawn(width, height);
        }
      } else if (Math.random() < 0.015) {
        this.angle += (Math.random() - 0.5) * 1.0;
      }

      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;

      if (this.x < 10) { this.x = 10; this.angle = Math.PI - this.angle; }
      if (this.x > width - 10) { this.x = width - 10; this.angle = Math.PI - this.angle; }
      if (this.y < 10) { this.y = 10; this.angle = -this.angle; }
      if (this.y > height - 10) { this.y = height - 10; this.angle = -this.angle; }

      this.segments[0].x = this.x;
      this.segments[0].y = this.y;
      this.segments[0].angle = this.angle;

      for (let i = 0; i < this.segments.length; i++) {
        const seg = this.segments[i];
        if (i > 0) {
          const prev = this.segments[i - 1];
          const dx = prev.x - seg.x;
          const dy = prev.y - seg.y;
          seg.angle = Math.atan2(dy, dx);
          seg.x = prev.x - Math.cos(seg.angle) * this.segmentDist;
          seg.y = prev.y - Math.sin(seg.angle) * this.segmentDist;
        }
      }
    }

    draw() {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < this.segments.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(this.segments[i].x, this.segments[i].y);
        ctx.lineTo(this.segments[i + 1].x, this.segments[i + 1].y);
        ctx.stroke();
      }
      for (let i = this.segments.length - 1; i >= 0; i--) {
        this.segments[i].draw(this.legTimer + i * 1.5, i === 0);
      }
    }
  }

  const king = new KingBot(kingSegmentCount);
  king.packet = new KingPacket(width, height);

  function animateStage() {
    if (width && height) {
      ctx.clearRect(0, 0, width, height);
      king.packet.draw();
      king.update();
      king.draw();
    }
    requestAnimationFrame(animateStage);
  }
  animateStage();

  function updateSegmentLabel() {
    const n = king.segments.length;
    segmentCountEl.textContent = `${n} segment${n === 1 ? '' : 's'}${n >= MAX_SEG ? ' (max!)' : ''}`;
  }
  updateSegmentLabel();

  // ---------------- Quiz ----------------
  // trivia.json wraps LaTeX spans in \( ... \) -- escape first so any stray
  // HTML-special char in the source text can't be read as a tag, then hand
  // the container to KaTeX's auto-render, which finds those \( \) spans in
  // the freshly-inserted DOM text and swaps them for real typeset formulas.
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderMath(container) {
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(container, {
        delimiters: [{ left: '\\(', right: '\\)', display: false }],
        throwOnError: false
      });
    }
  }

  function renderQuestion() {
    if (!questions.length) return;
    answering = false;
    feedbackEl.textContent = '';
    feedbackEl.className = 'game-feedback';

    const q = questions[questionIndex];
    progressEl.textContent = `Question ${questionIndex + 1} of ${questions.length}`;
    questionEl.innerHTML = escapeHtml(q.q);
    renderMath(questionEl);

    answersEl.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'game-answer-btn';
      btn.innerHTML = escapeHtml(opt);
      renderMath(btn);
      btn.addEventListener('click', () => handleAnswer(i, btn));
      answersEl.appendChild(btn);
    });
  }

  function handleAnswer(pickedIndex, btnEl) {
    if (answering) return;
    answering = true;

    const q = questions[questionIndex];
    const buttons = Array.from(answersEl.children);
    buttons.forEach(b => { b.disabled = true; });

    if (pickedIndex === q.correct) {
      btnEl.classList.add('correct');
      feedbackEl.textContent = '✅ Correct!';
      feedbackEl.className = 'game-feedback correct';

      kingSegmentCount = Math.min(MAX_SEG, kingSegmentCount + 1);
      king.setSegmentCount(kingSegmentCount);
      updateSegmentLabel();
      localStorage.setItem(STORAGE_SEG, String(kingSegmentCount));
    } else {
      btnEl.classList.add('wrong');
      buttons[q.correct].classList.add('correct');
      feedbackEl.textContent = '❌ Not quite — correct answer highlighted.';
      feedbackEl.className = 'game-feedback wrong';
    }

    // Sequential 1->25 then loop, per the designed easy-to-hard ramp.
    setTimeout(() => {
      questionIndex = (questionIndex + 1) % questions.length;
      localStorage.setItem(STORAGE_Q, String(questionIndex));
      renderQuestion();
    }, 1800);
  }

  fetch('trivia.json')
    .then(r => r.json())
    .then(data => {
      questions = data;
      if (questionIndex >= questions.length) questionIndex = 0;
      renderQuestion();
    })
    .catch(err => {
      questionEl.textContent = 'Could not load trivia questions.';
      console.warn('Index Master: failed to load trivia.json', err);
    });
})();

/* ================================================================
   6. ROBOTS WELCOME (crawlers wander over the 3-column bot marquee)
   ================================================================ */
(function robotsWelcomeMarquee() {
  // Same welcomed-bot names as robots.txt (the wildcard `*` there already
  // allows everyone; this is the "invited by name" wall for slide 6).
  const ROBOTS_LIST = [
    'Googlebot', 'Bingbot', 'DuckDuckBot', 'ia_archiver',
    'AddSearchBot', 'AgentTimes', 'AI2Bot', 'AI2Bot-DeepResearchEval', 'Ai2Bot-Dolma',
    'aiHitBot', 'AIWebIndex', 'amazon-kendra', 'amazon-QBusiness', 'Amazonbot',
    'AmazonBuyForMe', 'Amzn-SearchBot', 'Amzn-User', 'Andibot', 'Anomura', 'anthropic-ai',
    'ApifyBot', 'ApifyWebsiteContentCrawler', 'Applebot', 'Applebot-Extended',
    'Aranet-SearchBot', 'atlassian-bot', 'Awario', 'AzureAI-SearchBot', 'bedrockbot',
    'bigsur.ai', 'Bravebot', 'Brightbot', 'Brightbot 1.0', 'BuddyBot', 'Bytespider',
    'CCBot', 'Channel3Bot', 'ChatGLM-Spider', 'ChatGPT Agent', 'ChatGPT-User',
    'Claude-Code', 'Claude-SearchBot', 'Claude-User', 'Claude-Web', 'ClaudeBot',
    'Cloudflare-AutoRAG', 'CloudVertexBot', 'Code', 'cohere-ai',
    'cohere-training-data-crawler', 'Cotoyogi', 'CragCrawler', 'Crawl4AI', 'Crawlspace',
    'Cursor', 'Datenbank Crawler', 'DeepSeekBot', 'Devin', 'Diffbot', 'DuckAssistBot',
    'Echobot Bot', 'EchoboxBot', 'ExaBot', 'ExaSearchBot', 'FacebookBot',
    'facebookexternalhit', 'Factset_spyderbot', 'FirecrawlAgent', 'FriendlyCrawler',
    'GeistHaus-PageFetcher', 'Gemini-Deep-Research', 'Google-Agent', 'Google-CloudVertexBot',
    'Google-Extended', 'Google-Firebase', 'Google-Gemini-CLI', 'Google-NotebookLM',
    'GoogleAgent-Mariner', 'GoogleAgent-URLContext', 'GoogleOther', 'GoogleOther-Image',
    'GoogleOther-Video', 'GPTBot', 'HenkBot', 'iAskBot', 'iaskspider', 'iaskspider/2.0',
    'ICC-Crawler', 'ImagesiftBot', 'imageSpider', 'img2dataset', 'ISSCyberRiskCrawler',
    'kagi-fetcher', 'Kangaroo Bot', 'Kimi-User', 'KlaviyoAIBot', 'KunatoCrawler',
    'laion-huggingface-processor', 'LAIONDownloader', 'LCC', 'Lightpanda', 'LinerBot',
    'Linguee Bot', 'LinkupBot', 'Manus-User', 'meta-externalagent', 'Meta-ExternalAgent',
    'meta-externalfetcher', 'Meta-ExternalFetcher', 'meta-webindexer', 'MistralAI-User',
    'MistralAI-User/1.0', 'Mozilla-Tabstack', 'MyCentralAIScraperBot', 'NagetBot',
    'netEstate Imprint Crawler', 'newsai', 'NotebookLM', 'NovaAct', 'OAI-SearchBot',
    'omgili', 'omgilibot', 'OpenAI', 'opencode', 'Operator', 'PanguBot', 'Panscient',
    'panscient.com', 'Perplexity-User', 'PerplexityBot', 'PetalBot', 'PhindBot',
    'Poggio-Citations', 'Poseidon Research Crawler', 'QualifiedBot', 'Querit-SearchBot',
    'QueritBot', 'QuillBot', 'quillbot.com', 'SBIntuitionsBot', 'Scrapy',
    'SemrushBot-OCOB', 'SemrushBot-SWA', 'Shap-User', 'ShapBot', 'Sidetrade indexer bot',
    'Spider', 'TavilyBot', 'Terra Cotta', 'TerraCotta', 'Thinkbot', 'TikTokSpider',
    'Timpibot', 'TongyiBot', 'Trae', 'TwinAgent', 'UseAI', 'VelenPublicWebCrawler',
    'WARDBot', 'Webzio-Extended', 'webzio-extended', 'wpbot', 'WRTNBot', 'YaK',
    'YandexAdditional', 'YandexAdditionalBot', 'YiyanBot', 'YouBot', 'ZanistaBot'
  ];

  const stage = document.getElementById('robStage');
  const canvas = document.getElementById('robCrawlCanvas');
  if (!stage || !canvas) return;
  const ctx = canvas.getContext('2d');

  // Split the list round-robin into 3 columns, then duplicate each
  // column's content so a translateY(0 -> -50%) loop is seamless.
  const cols = [[], [], []];
  ROBOTS_LIST.forEach((name, i) => cols[i % 3].push(name));

  const tracks = [];
  cols.forEach((names, i) => {
    const track = document.getElementById(`robCol${i}`);
    if (!track) return;
    const lineHtml = names.map(name =>
      `<div class="rob-bot-line">User-agent: ${name}<span class="rob-allow">Allow: /</span></div>`
    ).join('');
    track.innerHTML = lineHtml + lineHtml;

    // Roughly constant px/sec speed across columns regardless of item count.
    const duration = names.length * 1.8;
    track.style.animationDuration = `${duration}s`;
    if (i % 2 === 1) track.parentElement.classList.add('rob-col-reverse');
    tracks.push(track);
  });

  sectionAnimators['section-robots'] = {
    reset() {
      // Toggle animation-name only (not the whole shorthand) so each
      // column's own animation-duration stays intact -- dropping the
      // name then forcing a reflow before restoring it re-triggers the
      // loop at 0% instead of wherever it had scrolled to.
      tracks.forEach(track => {
        track.style.animationName = 'none';
        void track.offsetHeight;
        track.style.animationName = 'robScroll';
      });
    }
  };

  let width, height;
  function resize() {
    const rect = stage.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
  }
  window.addEventListener('resize', resize);
  resize();

  const mouse = { x: -1000, y: -1000 };
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  class Packet {
    constructor(w, h) {
      this.x = Math.random() * (w - 40) + 20;
      this.y = Math.random() * (h - 40) + 20;
      this.size = 10;
      this.carried = false;
      this.id = Math.floor(Math.random() * 900 + 100);
    }

    draw() {
      if (this.carried) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#38bdf8';
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
      ctx.fillRect(-this.size / 2 + 1, -this.size / 2 + 1, this.size - 2, this.size - 2);
      ctx.restore();
    }
  }

  class Segment {
    constructor(x, y, radius = 8) {
      this.x = x;
      this.y = y;
      this.angle = 0;
      this.radius = radius;
      this.squishX = 1;
      this.squishY = 1;
    }

    draw(legPhase, isHead) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.scale(this.squishX, this.squishY);

      const legL = Math.sin(legPhase) * 5;
      const legR = Math.cos(legPhase) * 5;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(0, -this.radius * 0.7);
      ctx.lineTo(-this.radius * 1.6, -this.radius * 1.8 + legL);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, this.radius * 0.7);
      ctx.lineTo(-this.radius * 1.6, this.radius * 1.8 + legR);
      ctx.stroke();

      ctx.shadowBlur = 5;
      ctx.shadowColor = '#0284c7';
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.3;

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, -Math.PI / 2, Math.PI / 2, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (isHead) {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(this.radius * 0.45, 0, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  class WanderBot {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.home = { x: this.x, y: this.y };
      this.angle = Math.random() * Math.PI * 2;
      this.speed = 0.5 + Math.random() * 0.5;
      this.numSegments = 3;
      this.segmentDist = 12;
      this.segments = [];
      for (let i = 0; i < this.numSegments; i++) {
        this.segments.push(new Segment(this.x - i * this.segmentDist, this.y));
      }
      this.legTimer = 0;
      this.state = 'WANDER'; // 'WANDER', 'FETCH', 'RETURN' -- same indexer behavior as the background swarm
      this.target = null;
      this.carriedPacket = null;
    }

    update(packets) {
      this.legTimer += 0.15;

      if (this.state === 'WANDER') {
        let nearest = null;
        let minDst = Infinity;
        for (const p of packets) {
          if (!p.carried) {
            const d = Math.hypot(p.x - this.x, p.y - this.y);
            if (d < minDst) { minDst = d; nearest = p; }
          }
        }
        if (nearest) {
          this.target = nearest;
          this.state = 'FETCH';
        } else if (Math.random() < 0.02) {
          this.angle += (Math.random() - 0.5) * 1.2;
        }
      } else if (this.state === 'FETCH') {
        if (!this.target || this.target.carried) {
          this.state = 'WANDER';
        } else {
          const dx = this.target.x - this.x;
          const dy = this.target.y - this.y;
          const dist = Math.hypot(dx, dy);
          this.angle = Math.atan2(dy, dx);
          if (dist < 10) {
            this.carriedPacket = this.target;
            this.carriedPacket.carried = true;
            this.state = 'RETURN';
          }
        }
      } else if (this.state === 'RETURN') {
        const dx = this.home.x - this.x;
        const dy = this.home.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.angle = Math.atan2(dy, dx);

        this.carriedPacket.x = this.segments[0].x + Math.cos(this.angle) * 14;
        this.carriedPacket.y = this.segments[0].y + Math.sin(this.angle) * 14;

        if (dist < 14) {
          const idx = packets.indexOf(this.carriedPacket);
          if (idx !== -1) packets.splice(idx, 1);
          this.carriedPacket = null;
          this.home = { x: Math.random() * width, y: Math.random() * height };
          this.state = 'WANDER';
        }
      }

      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;

      if (this.x < 8) { this.x = 8; this.angle = Math.PI - this.angle; }
      if (this.x > width - 8) { this.x = width - 8; this.angle = Math.PI - this.angle; }
      if (this.y < 8) { this.y = 8; this.angle = -this.angle; }
      if (this.y > height - 8) { this.y = height - 8; this.angle = -this.angle; }

      this.segments[0].x = this.x;
      this.segments[0].y = this.y;
      this.segments[0].angle = this.angle;

      for (let i = 0; i < this.segments.length; i++) {
        const seg = this.segments[i];
        if (i > 0) {
          const prev = this.segments[i - 1];
          const dx = prev.x - seg.x;
          const dy = prev.y - seg.y;
          seg.angle = Math.atan2(dy, dx);
          seg.x = prev.x - Math.cos(seg.angle) * this.segmentDist;
          seg.y = prev.y - Math.sin(seg.angle) * this.segmentDist;
        }

        const mouseDist = Math.hypot(seg.x - mouse.x, seg.y - mouse.y);
        if (mouseDist < 22) {
          seg.squishX = Math.max(0.4, seg.squishX - 0.15);
          seg.squishY = Math.min(1.6, seg.squishY + 0.15);
        } else {
          seg.squishX += (1 - seg.squishX) * 0.1;
          seg.squishY += (1 - seg.squishY) * 0.1;
        }
      }
    }

    draw() {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < this.segments.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(this.segments[i].x, this.segments[i].y);
        ctx.lineTo(this.segments[i + 1].x, this.segments[i + 1].y);
        ctx.stroke();
      }
      for (let i = this.segments.length - 1; i >= 0; i--) {
        this.segments[i].draw(this.legTimer + i * 1.5, i === 0);
      }

      if (this.carriedPacket) {
        ctx.save();
        ctx.translate(this.carriedPacket.x, this.carriedPacket.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#06b6d4';
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 1;
        ctx.strokeRect(-5, -5, 10, 10);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      }
    }
  }

  const packets = [];
  for (let i = 0; i < 4; i++) packets.push(new Packet(width, height));

  setInterval(() => {
    if (packets.length < 5) packets.push(new Packet(width, height));
  }, 3500);

  const bots = [];
  for (let i = 0; i < 7; i++) bots.push(new WanderBot());

  function animate() {
    ctx.clearRect(0, 0, width, height);
    packets.forEach(p => p.draw());
    bots.forEach(b => { b.update(packets); b.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ================================================================
   7. ARTEFACTS (ambient crawlers wandering behind the 4 experiment cards)
   ================================================================ */
(function artefactsCrawlers() {
  const stage = document.getElementById('section-artefacts');
  const canvas = document.getElementById('artCrawlCanvas');
  if (!stage || !canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height;
  function resize() {
    const rect = stage.getBoundingClientRect();
    width = canvas.width = rect.width;
    height = canvas.height = rect.height;
  }
  window.addEventListener('resize', resize);
  resize();

  // Same dome+legs body as every other bot on this site, trimmed down: no
  // fetch/carry state machine here at all -- this slide only asked for
  // bots ambiently walking the background, not indexing anything.
  class Segment {
    constructor(x, y, radius = 7) {
      this.x = x;
      this.y = y;
      this.angle = 0;
      this.radius = radius;
    }
    draw(legPhase, isHead) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      const legL = Math.sin(legPhase) * 4.5;
      const legR = Math.cos(legPhase) * 4.5;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(0, -this.radius * 0.7);
      ctx.lineTo(-this.radius * 1.6, -this.radius * 1.8 + legL);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, this.radius * 0.7);
      ctx.lineTo(-this.radius * 1.6, this.radius * 1.8 + legR);
      ctx.stroke();

      ctx.shadowBlur = 4;
      ctx.shadowColor = '#0284c7';
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, -Math.PI / 2, Math.PI / 2, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (isHead) {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(this.radius * 0.45, 0, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class AmbientBot {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.angle = Math.random() * Math.PI * 2;
      this.speed = 0.4 + Math.random() * 0.4;
      this.segmentDist = 11;
      this.segments = [];
      for (let i = 0; i < 3; i++) {
        this.segments.push(new Segment(this.x - i * this.segmentDist, this.y));
      }
      this.legTimer = Math.random() * 10;
    }

    update() {
      this.legTimer += 0.15;
      if (Math.random() < 0.02) this.angle += (Math.random() - 0.5) * 1.2;

      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;

      if (this.x < 8) { this.x = 8; this.angle = Math.PI - this.angle; }
      if (this.x > width - 8) { this.x = width - 8; this.angle = Math.PI - this.angle; }
      if (this.y < 8) { this.y = 8; this.angle = -this.angle; }
      if (this.y > height - 8) { this.y = height - 8; this.angle = -this.angle; }

      this.segments[0].x = this.x;
      this.segments[0].y = this.y;
      this.segments[0].angle = this.angle;
      for (let i = 1; i < this.segments.length; i++) {
        const seg = this.segments[i];
        const prev = this.segments[i - 1];
        const dx = prev.x - seg.x;
        const dy = prev.y - seg.y;
        seg.angle = Math.atan2(dy, dx);
        seg.x = prev.x - Math.cos(seg.angle) * this.segmentDist;
        seg.y = prev.y - Math.sin(seg.angle) * this.segmentDist;
      }
    }

    draw() {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < this.segments.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(this.segments[i].x, this.segments[i].y);
        ctx.lineTo(this.segments[i + 1].x, this.segments[i + 1].y);
        ctx.stroke();
      }
      for (let i = this.segments.length - 1; i >= 0; i--) {
        this.segments[i].draw(this.legTimer + i * 1.5, i === 0);
      }
    }
  }

  const bots = [];
  for (let i = 0; i < 6; i++) bots.push(new AmbientBot());

  function animate() {
    ctx.clearRect(0, 0, width, height);
    bots.forEach(b => { b.update(); b.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ================================================================
   7b. ARTEFACTS CARD EXPAND (click a card -> fullscreen; click again,
       the close button, the backdrop, or Escape -> back to the grid)
   ================================================================ */
(function artefactsCardExpand() {
  const cards = Array.from(document.querySelectorAll('#artGrid .art-card'));
  const backdrop = document.getElementById('artBackdrop');
  if (!cards.length || !backdrop) return;

  let current = null;

  // .art-grid has its own position:relative + z-index:10 (needed to sit
  // above the bg grid/crawl canvas), which means it establishes a
  // stacking context -- a child of it can NEVER paint above a sibling
  // like #artBackdrop no matter how high the child's own z-index goes,
  // because the whole .art-grid layer is stacked at level 10 first. That
  // was the actual bug behind "the page just dims and the card is barely
  // readable": the backdrop was painting over the expanded card, not
  // behind it. Reparenting the card straight onto <body> while it's
  // expanded escapes that trap entirely; putting it back where it came
  // from (using the saved placeholder) on collapse undoes it cleanly.
  function collapse() {
    if (!current) return;
    const { card, placeholder } = current;
    card.classList.remove('art-card-expanded');
    placeholder.replaceWith(card);
    backdrop.classList.remove('visible');
    current = null;
  }

  function expand(card) {
    if (current) collapse();
    const placeholder = document.createComment('art-card-slot');
    card.replaceWith(placeholder);
    document.body.appendChild(card);
    card.classList.add('art-card-expanded');
    backdrop.classList.add('visible');
    current = { card, placeholder };
  }

  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.art-card-close')) { collapse(); return; }
      // Already open -- let clicks inside it scroll/select text normally
      // instead of instantly closing on the next click.
      if (card.classList.contains('art-card-expanded')) return;
      expand(card);
    });
    card.addEventListener('keydown', (e) => {
      if (e.target !== card) return; // let scrolling/selection inside the card body alone
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        expand(card);
      }
    });
  });

  backdrop.addEventListener('click', collapse);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') collapse();
  });
})();

/* ================================================================
   8. NAV TRACK (fixed points, click to jump, periodic label flash)
   ================================================================ */
(function navTrack() {
  const rungs = Array.from(document.querySelectorAll('.navrung'));
  const sections = rungs.map(rung => document.getElementById(rung.dataset.target));
  const flash = document.getElementById('navFlash');
  const htmlEl = document.documentElement;

  // CSS scroll-snap can fight a JS-driven smooth scroll mid-animation
  // (the snap correction and the scroll target end up disagreeing about
  // where to land), which is what made clicks need a second try. Turning
  // snap off for the duration of the animated scroll, then back on once
  // it actually finishes, lets the scroll complete cleanly every time.
  let snapRestoreTimer = null;
  function jumpToSection(section) {
    htmlEl.style.scrollSnapType = 'none';
    section.scrollIntoView({ behavior: 'smooth' });

    clearTimeout(snapRestoreTimer);
    const restoreSnap = () => {
      htmlEl.style.scrollSnapType = '';
      htmlEl.removeEventListener('scrollend', restoreSnap);
    };
    if ('onscrollend' in window) {
      htmlEl.addEventListener('scrollend', restoreSnap, { once: true });
    } else {
      snapRestoreTimer = setTimeout(restoreSnap, 900);
    }
  }

  rungs.forEach((rung, i) => {
    rung.addEventListener('click', () => {
      jumpToSection(sections[i]);
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = sections.indexOf(entry.target);
        rungs.forEach(r => r.classList.remove('active'));
        if (idx !== -1) rungs[idx].classList.add('active');

        // Every time a slide scrolls back into view, reset its own
        // widget(s) to a clean starting state instead of leaving them
        // mid-cycle from a previous visit.
        const animator = sectionAnimators[entry.target.id];
        if (animator) animator.reset();
      }
    });
  }, { threshold: 0.6 });
  sections.forEach(section => observer.observe(section));

  // Every few seconds, flash a label next to one of the 4 points in turn
  // so it's clear what each stop is (and that there's more below).
  let flashIndex = 0;
  let shownIndex = 0; // which section the flash label currently names, for click-to-jump
  const CYCLE_MS = 3500;

  let prevFlashingRung = null;

  function runFlashCycle() {
    const rung = rungs[flashIndex];
    shownIndex = flashIndex;
    flash.textContent = rung.dataset.label;
    flash.style.top = rung.style.top || `${(flashIndex / (rungs.length - 1)) * 100}%`;
    // Stays visible (and clickable) permanently now -- it used to fully
    // hide for ~1.3s of every 3.5s cycle, during which clicking it did
    // nothing at all. It just relabels/repositions itself in place now,
    // so there's no dead window where the hint is sitting there inert.
    flash.classList.add('visible');

    if (prevFlashingRung) prevFlashingRung.classList.remove('flashing');
    rung.classList.add('flashing');
    prevFlashingRung = rung;

    flashIndex = (flashIndex + 1) % rungs.length;
  }

  // Clicking the flash label itself jumps to whichever section it's
  // currently naming, same as clicking its rung would.
  flash.addEventListener('click', () => {
    jumpToSection(sections[shownIndex]);
  });

  // Rungs are laid out with nth-of-type top percentages in CSS; mirror that here.
  rungs.forEach((rung, i) => {
    rung.style.top = `${(i / (rungs.length - 1)) * 100}%`;
  });

  runFlashCycle();
  setInterval(runFlashCycle, CYCLE_MS);
})();
