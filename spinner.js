/* ================================================================
   ALGORITHM / VIDEO SPIN WHEEL — the back face of the clock card.
   Pulled out of script.js into its own file since it's a self-contained
   concern: what's shown on the wheel, how the odds are weighted, drawing
   it, spinning it, and popping the winning link open. The countdown timer
   and the card-flip animation that shows/hides this wheel stay in
   script.js -- this file only owns what happens once the wheel side is
   visible.

   Shared with script.js: window.wheelSpinnerState.isSpinning, so the
   clock card's auto-flip timer knows to pause while a spin is running.
   Defined here (loaded before script.js in index.html) so it always
   exists by the time script.js's flip timer/click handler reads it.

   ----------------------------------------------------------------
   HOW TO READ THIS FILE (every function below has a block comment
   like this one written above it):

     WHAT IT DOES   -- what the function is for, in plain English.
     INPUT          -- the value(s) you hand it when you call it, and
                       what each one means.
     OUTPUT         -- what it hands back (its "return value"), and
                       what that value represents. Some functions don't
                       hand anything back -- they just change something
                       instead (this is noted when it applies).
     WHERE IT GOES  -- which other part of the code calls this function,
                       and what that caller does with the result.
   ================================================================ */
window.wheelSpinnerState = { isSpinning: false };

(function algorithmVideoSpinner() {
  // These five constants grab the actual HTML elements on the page (the
  // canvas the wheel is drawn on, the little pointer/arrow, the text
  // bubble, the SPIN button, and the "watch it" link that appears after a
  // spin). Every function below reads or changes one of these five things.
  const canvas = document.getElementById('clockWheelCanvas');
  const ctx = canvas.getContext('2d');
  const pointer = document.getElementById('clockPointer');
  const wheelBubble = document.getElementById('clockWheelBubble');
  const spinBtn = document.getElementById('clockSpinBtn');
  const revealBtn = document.getElementById('clockRevealBtn');

  // The 9 colors the wheel's wedges cycle through, in order.
  const SEG_COLORS = ['#0284c7', '#9333ea', '#ea580c', '#16a34a', '#0891b2', '#4f46e5', '#eab308', '#db2777', '#65a30d'];

  // These 5 variables hold the current state of the wheel. They start
  // empty/zero and get filled in once buildSegments() runs (a few lines
  // down). Every other function in this file reads from these instead of
  // being handed the wheel's data directly as a parameter.
  //   segments     -- the list of all 9 wedges (6 algo + however many
  //                   videos), each one an object like:
  //                   { type, label, displayLabel, url, color }
  //   weights      -- a list of numbers, same length as segments, one
  //                   weight per wedge (bigger number = more likely to
  //                   be picked). weights[3] is the weight for segments[3].
  //   numSegs      -- how many wedges there are right now (9, or 6 if no
  //                   videos have been added yet).
  //   arc          -- how many radians (a unit for measuring angles,
  //                   like degrees but based on circles) one wedge takes
  //                   up. A full circle is 2*PI radians, so arc = 2*PI
  //                   divided by the number of wedges.
  //   currentAngle -- which way the wheel is currently rotated. This
  //                   changes 60 times a second while it's spinning.
  let segments = [];
  let weights = [];
  let numSegs = 0;
  let arc = 0;
  let currentAngle = 0;

  // ------------------------------------------------------------
  // secureRandom()
  //
  // WHAT IT DOES: hands back a random decimal from 0 up to (but not
  //   including) 1 -- the same shape of value Math.random() gives -- but
  //   drawn from the browser's cryptographic generator
  //   (crypto.getRandomValues) instead. That generator is seeded from the
  //   operating system's entropy pool, so the numbers are much higher
  //   quality and less predictable than Math.random().
  //
  //   Note: this site is fully static, so the spin still can't be
  //   server-controlled or certified -- a visitor with dev tools can
  //   always force an outcome. This only makes the draw itself as good as
  //   the browser can give.
  //
  // INPUT: none.
  //
  // OUTPUT: a number n with 0 <= n < 1. If the crypto API somehow isn't
  //   there (very old browser, unusual embedding), it quietly falls back
  //   to Math.random() so the wheel still works.
  //
  // WHERE IT GOES: used by pickIndex() (to roll the weighted winner) and
  //   by the SPIN click handler (for the landing jitter and the number of
  //   extra rotations).
  // ------------------------------------------------------------
  function secureRandom() {
    const cryptoObj = window.crypto || window.msCrypto;
    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
      const buf = new Uint32Array(1);
      cryptoObj.getRandomValues(buf);
      return buf[0] / 4294967296; // divide by 2^32 -> [0, 1)
    }
    return Math.random();
  }

  // ------------------------------------------------------------
  // buildAlgoSegments()
  //
  // WHAT IT DOES: builds the 6 fixed "DRL ALGO #1" through "#6" wedges.
  //   These are the original wedges the wheel had before videos were
  //   added. Their url is set to `null` (meaning "nothing here") on
  //   purpose: none of them have a real specific video assigned yet.
  //   A wedge with url: null still gets DRAWN on the wheel (so you
  //   still see all 6 of them), but the spin can never actually STOP on
  //   one, because pickIndex() (further down) skips any wedge whose url
  //   is null. To turn one on, replace its `url: null` below with a
  //   real link -- e.g. `url: 'https://youtu.be/xxxxxxxxxxx'`.
  //
  // INPUT: none -- it doesn't take any values in.
  //
  // OUTPUT: an array (a list) of 6 objects, one per algo wedge. Each
  //   object has: type ("algo"), label (what's drawn on the wheel),
  //   displayLabel (same as label here), url (null), and color.
  //
  // WHERE IT GOES: called once by buildSegments() below, which glues
  //   this list of 6 together with the video wedges to make the full
  //   9-wedge wheel.
  // ------------------------------------------------------------
  function buildAlgoSegments() {
    return ['DRL ALGO #1', 'DRL ALGO #2', 'DRL ALGO #3', 'DRL ALGO #4', 'DRL ALGO #5', 'DRL ALGO #6']
      .map((label, i) => ({
        type: 'algo',
        label,
        displayLabel: label,
        url: null,
        color: SEG_COLORS[i % SEG_COLORS.length]
      }));
  }

  // ------------------------------------------------------------
  // videoLabels(entry)
  //
  // WHAT IT DOES: takes one video's data (one entry from slot-links.js,
  //   e.g. { url, label, week, date, version }) and works out the two
  //   different pieces of text that get shown for it: a SHORT version
  //   that has to fit inside a tiny wedge on the wheel, and a FULL
  //   version with more detail that gets shown after you land on it
  //   (there's plenty of room for that one).
  //
  //   The short version shows the label you actually typed in when you
  //   ran add-video.sh (truncated with "…" if it's too long to fit),
  //   NOT the week number -- e.g. it shows "Welcome video", not
  //   "Week 37". The full version shows everything: your label, plus
  //   the week/version/date, e.g. "Welcome video — Week 37 (2026-09-09)".
  //
  // INPUT: entry -- one video object, e.g.
  //   { url: "https://youtu.be/xxx", label: "Welcome video",
  //     week: "Week 37", date: "2026-09-09", version: 1 }
  //
  // OUTPUT: an object with two pieces of text:
  //   { short: "Welcome video", full: "Welcome video — Week 37 (2026-09-09)" }
  //
  // WHERE IT GOES: called by buildSegments() below, once per video, to
  //   fill in that video wedge's `label` (uses `short`) and
  //   `displayLabel` (uses `full`) fields.
  // ------------------------------------------------------------
  function videoLabels(entry) {
    const weekPart = entry.version > 1
      ? `${entry.week} v${entry.version} (${entry.date})`
      : `${entry.week} (${entry.date})`;

    // The wheel wedge is small, so a very long label gets cut off with
    // "…" rather than overflowing into the next wedge. If no label was
    // ever given (shouldn't normally happen -- add-video.sh requires
    // one), it falls back to showing the week instead of blank text.
    const rawLabel = entry.label || entry.week || 'Week ?';
    const short = rawLabel.length > 14 ? rawLabel.slice(0, 13) + '…' : rawLabel;

    const full = entry.label ? `${entry.label} — ${weekPart}` : weekPart;
    return { short, full };
  }

  // ------------------------------------------------------------
  // buildSegments(videoEntries)
  //
  // WHAT IT DOES: this is the function that actually builds the whole
  //   wheel. It takes the list of videos (from slot-links.js), combines
  //   it with the 6 fixed algo wedges from buildAlgoSegments(), and
  //   works out how likely each wedge is to be picked (its "weight").
  //
  //   The weighting rule: the 6 algo wedges share 50% of the wheel
  //   evenly between them (about 8.3% each) -- but remember, they're
  //   not actually pickable yet since their url is null, so in practice
  //   right now that 50% never gets used. The video wedges share the
  //   OTHER 50%: split evenly at first (80% of that half, divided
  //   between however many videos there are), then whichever video was
  //   added MOST RECENTLY (the last one in the list) gets an extra
  //   20%-of-that-half bonus on top, so newer videos come up somewhat
  //   more often than older ones. If there are 0 videos, the algo
  //   wedges take the full 100% between them instead of just 50%.
  //
  //   This function doesn't hand back a result the normal way --
  //   instead, it directly updates the shared `segments`, `weights`,
  //   `numSegs`, and `arc` variables declared above, since those are
  //   what every other function in this file reads from.
  //
  // INPUT: videoEntries -- the array of video objects from
  //   window.SLOT_LINKS (could be empty, e.g. []).
  //
  // OUTPUT: nothing is returned. Instead, it fills in:
  //   segments -- the full list of 9 (or 6, if no videos yet) wedges.
  //   weights  -- one weight number per wedge, same order as segments.
  //   numSegs  -- how many wedges total.
  //   arc      -- how many radians each wedge takes up.
  //
  // WHERE IT GOES: called once when the page first loads (a few lines
  //   below), handing it window.SLOT_LINKS. After this runs, drawWheel()
  //   uses `segments`/`numSegs`/`arc` to actually paint the wheel, and
  //   pickIndex() uses `segments`/`weights` to choose a winner.
  // ------------------------------------------------------------
  function buildSegments(videoEntries) {
    const algoSegs = buildAlgoSegments();
    const n = videoEntries.length;
    const videoSegs = videoEntries.map((entry, i) => {
      const { short, full } = videoLabels(entry);
      return {
        type: 'video',
        label: short,
        displayLabel: full,
        url: entry.url,
        color: SEG_COLORS[(algoSegs.length + i) % SEG_COLORS.length]
      };
    });

    segments = algoSegs.concat(videoSegs);
    numSegs = segments.length;
    arc = (2 * Math.PI) / numSegs;

    const videoTotal = n > 0 ? 50 : 0;
    const algoTotal = 100 - videoTotal;
    const algoShare = algoTotal / algoSegs.length;
    const videoBase = n > 0 ? (videoTotal * 0.8) / n : 0;
    const videoLastBonus = n > 0 ? videoTotal * 0.2 : 0;

    weights = segments.map((seg, i) => {
      if (seg.type === 'algo') return algoShare;
      const vi = i - algoSegs.length;
      return videoBase + (vi === n - 1 ? videoLastBonus : 0);
    });
  }

  // This is the actual "start it up" step: read the video list straight
  // from window.SLOT_LINKS (set by slot-links.js, which is loaded via a
  // plain <script> tag in index.html, before this file). We deliberately
  // do NOT use fetch() to load a .json file here, because fetch() of a
  // local file is blocked by the browser when you open index.html by
  // double-clicking it (the file:// address bar trick) -- a <script> tag
  // doesn't have that restriction, so this way testing locally just
  // works without needing to run a local web server.
  const links = Array.isArray(window.SLOT_LINKS) ? window.SLOT_LINKS : [];
  buildSegments(links);
  drawWheel();
  spinBtn.disabled = false;

  // Memory of past spins, saved in the browser's localStorage (a small
  // storage box the browser keeps for this website, that survives page
  // reloads and closing/reopening the tab -- unlike a normal variable,
  // which resets every time the page reloads).
  //   streaks[url]   -- for each video's url, how many spins IN A ROW it
  //                     has NOT won. Resets to 0 the moment it wins.
  //   lastWinnerUrl  -- whichever url won the most recent spin, so the
  //                     very next spin knows what to avoid repeating.
  // Identified by url (not by position in the list), because that's the
  // one thing about a video that never changes even as new videos get
  // added later and shuffle everyone's list position around.
  const MEMORY_KEY = 'wheelSpinMemory_v1';
  const PITY_THRESHOLD = 5; // snubbed this many spins running -> forced win

  // ------------------------------------------------------------
  // loadMemory()
  //
  // WHAT IT DOES: reads the saved spin history back out of localStorage
  //   when the page first loads, so the "no repeats" and "pity" systems
  //   remember what happened on previous visits, not just this one.
  //
  // INPUT: none.
  //
  // OUTPUT: the saved memory object, e.g.
  //   { streaks: { "https://youtu.be/AAA": 2, "https://youtu.be/BBB": 0 },
  //     lastWinnerUrl: "https://youtu.be/BBB" }
  //   If nothing was ever saved before (first visit ever, or the browser
  //   is blocking localStorage), it hands back a fresh empty one instead:
  //   { streaks: {}, lastWinnerUrl: null }
  //
  // WHERE IT GOES: called once, right below, to set up the `memory`
  //   variable that pickIndex() and recordWinner() both use.
  // ------------------------------------------------------------
  function loadMemory() {
    try {
      const raw = localStorage.getItem(MEMORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* localStorage unavailable/blocked -- just start fresh */ }
    return { streaks: {}, lastWinnerUrl: null };
  }

  // ------------------------------------------------------------
  // saveMemory()
  //
  // WHAT IT DOES: writes the current `memory` object back into
  //   localStorage, so the update sticks around for next time the page
  //   loads (otherwise it would only exist for as long as this tab
  //   stays open).
  //
  // INPUT: none directly -- it reads the shared `memory` variable.
  //
  // OUTPUT: nothing returned. Its effect is entirely the side effect of
  //   writing to localStorage.
  //
  // WHERE IT GOES: called by recordWinner() every time a spin finishes,
  //   right after memory has been updated with that spin's result.
  // ------------------------------------------------------------
  function saveMemory() {
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(memory)); } catch (e) { /* ignore */ }
  }

  const memory = loadMemory();

  // ------------------------------------------------------------
  // pickIndex()
  //
  // WHAT IT DOES: decides which wedge wins, BEFORE the wheel visually
  //   spins to it. It checks things in this order:
  //
  //   1. ELIGIBILITY -- first, it throws out every wedge whose url is
  //      null (the not-yet-linked algo wedges). Only real, clickable
  //      links are allowed to win.
  //
  //   2. PITY -- next, it checks: has any eligible wedge gone 5 spins
  //      in a row without winning (PITY_THRESHOLD)? If yes, that one is
  //      forced to win this time, no randomness involved -- this
  //      guarantees a video can never get unlucky and be skipped
  //      forever. If more than one wedge has hit that limit at the same
  //      time, whichever has been waiting the LONGEST wins.
  //
  //   3. NO REPEATS -- if nothing is being forced by pity, it removes
  //      whatever won the PREVIOUS spin from consideration (unless
  //      that's literally the only real link there is, in which case it
  //      has no choice but to allow it).
  //
  //   4. WEIGHTED RANDOM -- finally, among whatever's left, it rolls a
  //      random number and picks one, using each wedge's weight (from
  //      the `weights` array) so bigger-weight wedges come up more
  //      often, exactly like a raffle where some people hold more
  //      tickets than others.
  //
  // INPUT: none directly -- it reads the shared `segments`, `weights`,
  //   and `memory` variables.
  //
  // OUTPUT: a single number -- the position (index) of the winning
  //   wedge inside the `segments` list. For example, if it returns 7,
  //   that means `segments[7]` is the winner.
  //
  // WHERE IT GOES: called by the SPIN button's click handler below, right
  //   at the start of a spin, to decide the destination BEFORE the wheel
  //   animation figures out how to visually spin there.
  // ------------------------------------------------------------
  function pickIndex() {
    const eligible = segments
      .map((seg, i) => ({ seg, i, weight: weights[i] }))
      .filter(e => !!e.seg.url);

    if (eligible.length === 0) return 0; // nothing real to land on yet

    eligible.forEach(e => {
      if (!(e.seg.url in memory.streaks)) memory.streaks[e.seg.url] = 0;
    });

    const overdue = eligible.filter(e => memory.streaks[e.seg.url] >= PITY_THRESHOLD);
    if (overdue.length > 0) {
      overdue.sort((a, b) => memory.streaks[b.seg.url] - memory.streaks[a.seg.url]);
      return overdue[0].i;
    }

    let pool = eligible;
    if (eligible.length > 1 && memory.lastWinnerUrl) {
      const noRepeat = eligible.filter(e => e.seg.url !== memory.lastWinnerUrl);
      if (noRepeat.length > 0) pool = noRepeat;
    }

    const total = pool.reduce((sum, e) => sum + e.weight, 0);
    let roll = secureRandom() * total;
    for (const e of pool) {
      roll -= e.weight;
      if (roll < 0) return e.i;
    }
    return pool[pool.length - 1].i;
  }

  // ------------------------------------------------------------
  // recordWinner(winnerUrl)
  //
  // WHAT IT DOES: updates the spin-history memory right after a spin
  //   finishes. The wedge that just won gets its "spins since last win"
  //   counter reset back to 0. Every OTHER real wedge gets its counter
  //   bumped up by 1 (moving it one step closer to triggering pity).
  //   Then it remembers this url as "whatever just won", and saves
  //   everything to localStorage so it's still there next time the page
  //   loads.
  //
  // INPUT: winnerUrl -- the url string of whichever wedge just won,
  //   e.g. "https://www.youtube.com/watch?v=IkMxln99szo".
  //
  // OUTPUT: nothing returned. Its whole job is updating the shared
  //   `memory` object and then saving it.
  //
  // WHERE IT GOES: called by the SPIN button's click handler below, at
  //   the very end of a spin, right after the wheel has stopped moving
  //   and the winner has been shown on screen.
  // ------------------------------------------------------------
  function recordWinner(winnerUrl) {
    Object.keys(memory.streaks).forEach(url => {
      memory.streaks[url] = (url === winnerUrl) ? 0 : memory.streaks[url] + 1;
    });
    memory.lastWinnerUrl = winnerUrl;
    saveMemory();
  }

  // ------------------------------------------------------------
  // drawWheel()
  //
  // WHAT IT DOES: this is the function that actually paints the wheel
  //   onto the canvas -- every colored wedge, the text label on each
  //   one, and the little white dots ("pegs") around the rim. It reads
  //   the current `currentAngle` variable to know which way the wheel
  //   is currently rotated, so calling this over and over with a
  //   slightly different `currentAngle` each time is what makes the
  //   spinning animation actually look like it's spinning.
  //
  // INPUT: none directly -- it reads the shared `segments`, `numSegs`,
  //   `arc`, and `currentAngle` variables.
  //
  // OUTPUT: nothing returned. Its whole job is drawing pixels onto the
  //   canvas element (a side effect, not a return value).
  //
  // WHERE IT GOES: called once when the page first loads (to show the
  //   wheel at rest), and then called again and again -- about 60 times
  //   per second -- by animateSpin() below, each time with a slightly
  //   different `currentAngle`, to create the spinning motion.
  // ------------------------------------------------------------
  function drawWheel() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 6;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numSegs; i++) {
      const angle = currentAngle + i * arc;
      ctx.beginPath();
      ctx.fillStyle = segments[i].color;
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle, angle + arc);
      ctx.lineTo(cx, cy);
      ctx.fill();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(segments[i].label, radius - 16, 4);
      ctx.restore();
    }

    for (let i = 0; i < numSegs * 2; i++) {
      const pegAngle = currentAngle + i * (arc / 2);
      const px = cx + Math.cos(pegAngle) * (radius - 5);
      const py = cy + Math.sin(pegAngle) * (radius - 5);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }
  drawWheel();

  // ------------------------------------------------------------
  // The SPIN button's click handler.
  //
  // WHAT IT DOES: this is what runs the instant someone clicks the SPIN
  //   button. It's the "conductor" that ties everything else in this
  //   file together, in this order:
  //     1. Bail out early if a spin is already in progress, or if there
  //        are no real (non-null-url) wedges to land on at all.
  //     2. Lock the button and clear any previous result off screen.
  //     3. Call pickIndex() to decide the winner FIRST (see above).
  //     4. Work out how far and fast to visually spin so the wheel ends
  //        up exactly pointing at that pre-decided winner (the math
  //        just below does this -- it's solving "what rotation makes
  //        the pointer end up on wedge number X").
  //     5. Kick off animateSpin() (defined just inside here) to actually
  //        animate the rotation frame by frame.
  //     6. Once the animation finishes, show the result and call
  //        recordWinner() to remember it for next time.
  //
  // INPUT: none that we use (browsers pass a "click event" object to
  //   every click handler automatically, but this code doesn't need any
  //   information out of it, so it's not even given a name here).
  //
  // OUTPUT: nothing returned -- click handlers never return anything
  //   meaningful; their whole job is to make things happen (locking
  //   buttons, changing text, starting the animation, etc).
  //
  // WHERE IT GOES: this isn't called by other code in this file -- the
  //   browser itself calls it, automatically, every time a real person
  //   clicks the SPIN button.
  // ------------------------------------------------------------
  spinBtn.addEventListener('click', () => {
    if (window.wheelSpinnerState.isSpinning || numSegs === 0) return;
    if (!segments.some(s => !!s.url)) {
      wheelBubble.textContent = 'NO LINKS YET -- ADD A VIDEO FIRST';
      return;
    }
    window.wheelSpinnerState.isSpinning = true;
    spinBtn.disabled = true;
    revealBtn.classList.remove('visible');
    wheelBubble.textContent = 'SPINNING... GOOD LUCK!';

    // Decide the winner FIRST (pity, then no-repeat, then weighted), then
    // aim the spin at it -- rather than spinning to a random angle and
    // reading off whatever it lands on.
    const winningIndex = pickIndex();
    const winner = segments[winningIndex];

    // Same landing-angle math the old reveal used
    // (normalized = (PI - currentAngle) mod 2PI, index = floor(normalized/arc)),
    // solved backwards for the currentAngle that produces our chosen index.
    // A little jitter within the segment (not dead center) keeps it looking
    // like a real spin rather than a rigged laser-point stop.
    const jitter = 0.15 + secureRandom() * 0.7; // stays clear of both edges
    const targetNormalized = (winningIndex + jitter) * arc;
    const targetAngleMod = (3 * Math.PI - targetNormalized + Math.PI * 2 * 4) % (Math.PI * 2);

    // Whole number of extra turns. This MUST be an integer: any fractional
    // part becomes a partial rotation that gets added on top of
    // deltaToTarget, which would leave the wheel visually stopped on a
    // random wedge instead of the one pickIndex() already chose.
    const extraRounds = 5 + Math.floor(secureRandom() * 4); // 5..8 whole turns
    const startAngle = currentAngle;
    const startAngleMod = ((startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const deltaToTarget = ((targetAngleMod - startAngleMod) + Math.PI * 2) % (Math.PI * 2);
    const totalSpinAngle = extraRounds * Math.PI * 2 + deltaToTarget;

    const duration = 4500;
    const startTime = performance.now();

    // --------------------------------------------------------
    // animateSpin(now)
    //
    // WHAT IT DOES: this is the actual frame-by-frame animation loop
    //   for the spin. The browser calls this itself, roughly 60 times
    //   per second, each time handing it the current timestamp. Each
    //   time it runs, it works out how far through the 4.5-second spin
    //   we are, updates `currentAngle` to match (slowing down towards
    //   the end via the "easeOut" math, so it decelerates like a real
    //   wheel instead of stopping abruptly), and redraws the wheel at
    //   that new angle. Once the full 4.5 seconds have passed, it stops
    //   the animation and reveals the result instead of scheduling
    //   another frame.
    //
    // INPUT: now -- a timestamp (a number representing "how many
    //   milliseconds since the browser tab was opened") that the
    //   browser automatically hands to this function every time it
    //   calls it, via requestAnimationFrame.
    //
    // OUTPUT: nothing returned. Its effects are: updating `currentAngle`,
    //   redrawing the wheel via drawWheel(), and -- once the animation
    //   is done -- updating the on-screen text/button and calling
    //   recordWinner().
    //
    // WHERE IT GOES: first called once, manually, right after this
    //   function is defined (see requestAnimationFrame(animateSpin) a
    //   few lines down). After that, it calls itself again and again
    //   (via requestAnimationFrame) until the spin duration is over.
    // --------------------------------------------------------
    function animateSpin(now) {
      const elapsedSpin = now - startTime;
      const t = Math.min(1, elapsedSpin / duration);

      const easeOut = 1 - Math.pow(1 - t, 3);
      currentAngle = startAngle + totalSpinAngle * easeOut;

      if (Math.sin(currentAngle * numSegs) > 0.8) {
        pointer.classList.add('wiggle');
      } else {
        pointer.classList.remove('wiggle');
      }

      drawWheel();

      if (t < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        window.wheelSpinnerState.isSpinning = false;
        spinBtn.disabled = false;
        pointer.classList.remove('wiggle');

        wheelBubble.textContent = `LANDED ON: ${winner.displayLabel}!`;
        revealBtn.textContent = winner.type === 'video' ? '▶ Watch this video' : '▶ Watch on YouTube';
        revealBtn.href = winner.url;
        revealBtn.classList.add('visible');
        recordWinner(winner.url);
      }
    }
    requestAnimationFrame(animateSpin);
  });
})();
