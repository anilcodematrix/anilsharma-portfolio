/* ==========================================================
   Edit these to personalise the animated text
   ========================================================== */
const FLIP_INTERVAL = 2200; // ms between headline words (edit the words in index.html)

const TERMINAL_LINES = [
  [{ c: "t-prompt", t: "$ " }, { t: "run lead-flow --live" }],
  [{ c: "t-dim", t: "→ Watching inbox for new leads..." }],
  [{ app: "mail" }, { c: "t-ok", t: "✓ " }, { t: "New email from sarah@acme.co" }],
  [{ c: "t-ok", t: "✓ " }, { t: "AI classified intent: " }, { c: "t-hl", t: "hot lead" }],
  [{ app: "sheets" }, { c: "t-ok", t: "✓ " }, { t: "Logged lead to Google Sheets" }],
  [{ app: "crm" }, { c: "t-ok", t: "✓ " }, { t: "Created deal in CRM → Pipeline: Sales" }],
  [{ app: "mail" }, { c: "t-ok", t: "✓ " }, { t: "Drafted personalised reply for review" }],
  [{ app: "slack" }, { c: "t-ok", t: "✓ " }, { t: "Pinged #sales on Slack" }],
  [{ app: "wa" }, { c: "t-ok", t: "✓ " }, { t: "Sent WhatsApp follow-up" }],
  [{ c: "t-dim", t: "" }],
  [{ c: "t-prompt", t: "⚡ " }, { t: "Done in 3.2s · " }, { c: "t-hl", t: "~40 hrs/month saved" }],
];

/* ========================================================== */

const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Phones / touch devices get a lighter version of the heavy effects
const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const lite = isTouch || window.matchMedia("(max-width: 760px)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

$("#year").textContent = new Date().getFullYear();

/* ---------- Protect images: no drag, no right-click save ---------- */
document.addEventListener("dragstart", (e) => {
  if (e.target.closest("img, .hero__photo")) e.preventDefault();
});
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest("img, .hero__photo, .hero__visual")) e.preventDefault();
});

/* ---------- Helpers ---------- */
function wrapWord(node) {
  const outer = document.createElement("span");
  const inner = document.createElement("span");
  outer.className = "w";
  inner.append(node);
  outer.append(inner);
  return outer;
}

// Wraps every word of an element in a mask so it can slide up
function splitWords(el) {
  const parts = [];
  [...el.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.split(/(\s+)/).forEach((chunk) => {
        if (!chunk) return;
        parts.push(/^\s+$/.test(chunk) ? document.createTextNode(" ") : wrapWord(document.createTextNode(chunk)));
      });
    } else if (node.nodeName === "BR" || (node.classList && node.classList.contains("nosplit"))) {
      parts.push(node);
    } else {
      parts.push(wrapWord(node));
    }
  });
  el.replaceChildren(...parts);
  return $$(".w > span", el);
}

/* ---------- Headline: split into words + characters ---------- */
(function splitHeadline() {
  $$(".hero__title .line__inner").forEach((line) => {
    const parts = [];
    [...line.childNodes].forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return parts.push(node);
      node.textContent.split(/(\s+)/).forEach((chunk) => {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) return parts.push(document.createTextNode(" "));
        const word = document.createElement("span");
        word.className = "word";
        [...chunk].forEach((c) => {
          const ch = document.createElement("span");
          ch.className = "ch";
          ch.textContent = c;
          word.append(ch);
        });
        parts.push(word);
      });
    });
    line.replaceChildren(...parts);
  });
})();

/* ---------- Rotating headline word with code-style scramble ---------- */
(function flipWords() {
  const flip = $(".flip");
  if (!flip) return;
  const text = $(".flip__text", flip);
  const words = flip.dataset.words.split(",").map((w) => w.trim());
  const glyphs = "abcdefghijklmnopqrstuvwxyz#%&*/<>{}=+";
  let index = 0;

  // Size the highlight to the current word
  const fit = () => (flip.style.width = `${text.offsetWidth + flip.offsetWidth - flip.clientWidth + parseFloat(getComputedStyle(flip).paddingLeft) * 2}px`);
  requestAnimationFrame(fit);
  document.fonts && document.fonts.ready.then(fit);
  window.addEventListener("resize", fit);

  function scrambleTo(target) {
    // Measure the final width first so the highlight glides to it
    const from = text.textContent;
    text.textContent = target;
    fit();
    text.textContent = from;

    const length = Math.max(from.length, target.length);
    const queue = Array.from({ length }, (_, i) => ({
      to: target[i] || "",
      end: 6 + Math.floor(Math.random() * 16),
    }));
    let frame = 0;

    (function update() {
      let html = "";
      let done = 0;
      queue.forEach((q) => {
        if (frame >= q.end) {
          done++;
          html += q.to;
        } else if (q.to) {
          html += `<span class="scr">${glyphs[Math.floor(Math.random() * glyphs.length)]}</span>`;
        }
      });
      text.innerHTML = html;
      frame++;
      if (done < queue.length) requestAnimationFrame(update);
    })();
  }

  if (reduceMotion) return;
  setInterval(() => {
    index = (index + 1) % words.length;
    scrambleTo(words[index]);
  }, FLIP_INTERVAL);
})();

/* ---------- Headline letters react to the cursor ---------- */
if (finePointer && !reduceMotion) {
  const title = $(".hero__title");
  const chars = $$(".ch", title);
  let centers = [];

  const measure = () => {
    centers = chars.map((c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  };

  title.addEventListener("mouseenter", measure);
  title.addEventListener("mousemove", (e) => {
    chars.forEach((c, i) => {
      const d = Math.hypot(e.clientX - centers[i].x, e.clientY - centers[i].y);
      const t = Math.max(0, 1 - d / 220);
      c.style.fontVariationSettings = `"wdth" ${125 - t * 25}, "wght" ${800 + t * 100}`;
    });
  });
  title.addEventListener("mouseleave", () => chars.forEach((c) => (c.style.fontVariationSettings = "")));
}

/* ---------- Services: code types itself, app preview builds ---------- */
(function devDemo() {
  const demo = $(".devdemo");
  if (!demo) return;
  const lines = $$(".cl", demo);
  const [nav, chart, cards] = $$(".pv", demo);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const show = (el) => el.classList.add("on");

  if (reduceMotion) {
    [...lines, nav, chart, cards].forEach(show);
    return;
  }

  async function loop() {
    while (true) {
      for (let i = 0; i < lines.length; i++) {
        show(lines[i]);
        if (i === 0) show(nav);
        if (i === 5) show(chart); // <Dashboard>
        if (i === 6) show(cards); // <Chart />
        await sleep(lines[i].textContent.trim() ? 520 : 150);
      }
      await sleep(3500);

      // Wipe instantly and start again
      demo.classList.add("is-reset");
      [...lines, nav, chart, cards].forEach((el) => el.classList.remove("on"));
      void demo.offsetWidth;
      demo.classList.remove("is-reset");
      await sleep(500);
    }
  }

  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      loop();
      io.disconnect();
    }
  }, { threshold: 0.3 });
  io.observe(demo);
})();

/* ---------- Terminal typing ---------- */
(function terminal() {
  const out = $("#terminal");
  if (!out) return;
  let running = false;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const result = $(".result");

  // Light up the matching app icon in the 3D scene
  function ping(name) {
    const app = $(`.app[data-app="${name}"]`);
    if (!app) return;
    app.classList.remove("is-active");
    void app.offsetWidth;
    app.classList.add("is-active");
    setTimeout(() => app.classList.remove("is-active"), 1600);
  }

  async function play() {
    running = true;
    while (true) {
      out.innerHTML = "";
      if (result) result.classList.remove("is-visible");
      for (const line of TERMINAL_LINES) {
        for (const seg of line) {
          if (seg.app) {
            ping(seg.app);
            continue;
          }
          const span = document.createElement("span");
          if (seg.c) span.className = seg.c;
          out.append(span);
          for (const ch of seg.t) {
            span.textContent += ch;
            await sleep(reduceMotion ? 0 : 18 + Math.random() * 22);
          }
        }
        out.append("\n");
        await sleep(reduceMotion ? 0 : 260);
      }
      if (result) result.classList.add("is-visible");
      await sleep(5500);
    }
  }

  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !running) {
      play();
      io.disconnect();
    }
  }, { threshold: 0.35 });
  io.observe(out);
})();

/* ---------- Copy email ---------- */
(function copyEmail() {
  const btn = $(".copy");
  const toast = $(".toast");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const email = btn.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
      toast.classList.add("is-visible");
      setTimeout(() => toast.classList.remove("is-visible"), 2200);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  });
})();

/* ---------- Mobile menu ---------- */
(function mobileMenu() {
  const toggle = $(".nav__toggle");
  const menu = $(".mnav");
  if (!toggle || !menu) return;
  const root = document.documentElement;

  const setOpen = (open) => {
    root.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", String(!open));
  };

  toggle.addEventListener("click", () => setOpen(!root.classList.contains("menu-open")));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
  window.addEventListener("resize", () => window.innerWidth > 640 && setOpen(false));
})();

/* ---------- Nav: hide on scroll down, show on scroll up ---------- */
(function navBehaviour() {
  const nav = $(".nav");
  let last = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    nav.classList.toggle("is-hidden", y > last && y > 300 && !document.documentElement.classList.contains("menu-open"));
    last = y;
  }, { passive: true });

  // Highlight the section currently in view
  const links = $$(".nav__link[href^='#']").filter((a) => a.getAttribute("href").length > 1);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((a) => {
    const target = $(a.getAttribute("href"));
    if (target) io.observe(target);
  });
})();

/* ---------- Marquee: duplicate tracks for a seamless loop ---------- */
$$(".marquee, .bigname").forEach((m) => {
  const track = $(".marquee__track, .bigname__track", m);
  m.append(track.cloneNode(true));
});

/* ---------- Contact: rotating 3D dot globe ---------- */
(function globe() {
  const canvas = $(".contact__globe");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const section = $(".contact");
  const COUNT = lite ? 420 : 1100;
  const points = [];
  // Evenly spread points on a sphere (Fibonacci lattice)
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = i * Math.PI * (3 - Math.sqrt(5));
    points.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }

  let size = 0;
  let rotY = 0;
  let tilt = 0.35;
  let targetTilt = 0.35;
  let speed = 0.0025;
  let targetSpeed = 0.0025;
  let running = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 2);
    size = canvas.offsetWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    ctx.clearRect(0, 0, size, size);
    speed += (targetSpeed - speed) * 0.05;
    tilt += (targetTilt - tilt) * 0.05;
    rotY += speed;

    const R = size * 0.42;
    const c = size / 2;
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(tilt), sinX = Math.sin(tilt);

    for (const [px, py, pz] of points) {
      // rotate around Y, then tilt around X
      const x1 = px * cosY - pz * sinY;
      const z1 = px * sinY + pz * cosY;
      const y2 = py * cosX - z1 * sinX;
      const z2 = py * sinX + z1 * cosX;

      const depth = (1 - z2) / 2; // 1 = front, 0 = back
      const f = 900 / (900 + z2 * R);
      ctx.fillStyle = `rgba(212,255,58,${0.06 + depth * depth * 0.9})`;
      ctx.beginPath();
      ctx.arc(c + x1 * R * f, c + y2 * R * f, 0.5 + depth * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (running) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);

  section.addEventListener("mousemove", (e) => {
    const px = e.clientX / window.innerWidth - 0.5;
    const py = e.clientY / window.innerHeight - 0.5;
    targetSpeed = 0.0025 + px * 0.012;
    targetTilt = 0.35 + py * 0.6;
  });
  section.addEventListener("mouseleave", () => {
    targetSpeed = 0.0025;
    targetTilt = 0.35;
  });

  if (reduceMotion) return draw();
  new IntersectionObserver(([entry]) => {
    const was = running;
    running = entry.isIntersecting;
    if (running && !was) draw();
  }).observe(section);
})();

/* ---------- Contact: email scrambles on hover ---------- */
(function emailScramble() {
  const btn = $(".copy");
  const text = $(".copy__text");
  if (!btn || !text || reduceMotion) return;
  const final = text.textContent;
  const glyphs = "abcdefghijklmnopqrstuvwxyz0123456789@#%&*";
  let busy = false;

  btn.addEventListener("mouseenter", () => {
    if (busy) return;
    busy = true;
    let frame = 0;
    (function tick() {
      text.textContent = [...final]
        .map((ch, i) => (i < frame / 1.5 || ch === "@" || ch === "." ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]))
        .join("");
      frame++;
      if (frame / 1.5 <= final.length) requestAnimationFrame(tick);
      else {
        text.textContent = final;
        busy = false;
      }
    })();
  });
})();

/* ---------- Pointer effects (desktop only) ---------- */
if (finePointer && !reduceMotion) {
  // Hero spotlight
  const hero = $(".hero");
  const spot = $(".hero__spot");
  hero.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    spot.style.setProperty("--mx", `${e.clientX - r.left}px`);
    spot.style.setProperty("--my", `${e.clientY - r.top}px`);
  });

  // Spotlight inside service cards
  // Automation scene tilts toward the mouse
  const autoSection = $(".automate");
  const autoTilt = $(".auto-tilt");
  if (autoSection && autoTilt) {
    autoSection.addEventListener("mousemove", (e) => {
      const r = autoSection.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      autoTilt.style.setProperty("--ry", `${px * 18 - 8}deg`);
      autoTilt.style.setProperty("--rx", `${-py * 12 + 4}deg`);
    });
    autoSection.addEventListener("mouseleave", () => {
      autoTilt.style.removeProperty("--ry");
      autoTilt.style.removeProperty("--rx");
    });
  }

  // Stats: each number turns in 3D toward the cursor
  const statsRow = $(".stats");
  if (statsRow) {
    const nums = $$(".stat__num", statsRow);
    statsRow.addEventListener("mousemove", (e) => {
      nums.forEach((num) => {
        const r = num.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        num.style.setProperty("--ry", `${Math.max(-35, Math.min(35, dx * 90))}deg`);
        num.style.setProperty("--rx", `${Math.max(-25, Math.min(25, -dy * 90))}deg`);
      });
    });
    statsRow.addEventListener("mouseleave", () =>
      nums.forEach((num) => {
        num.style.setProperty("--ry", "0deg");
        num.style.setProperty("--rx", "0deg");
      })
    );
  }

  // Project cards: 3D tilt + sheen follow the mouse
  $$(".pcard").forEach((card) => {
    const tilt = $(".stage3d__tilt", card);
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
      tilt.style.setProperty("--ry", `${px * 22}deg`);
      tilt.style.setProperty("--rx", `${-py * 16}deg`);
    });
    card.addEventListener("mouseleave", () => {
      tilt.style.setProperty("--ry", "0deg");
      tilt.style.setProperty("--rx", "0deg");
    });
  });

  $$(".bcard").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

/* ==========================================================
   GSAP animations
   ========================================================== */
if (!hasGsap || reduceMotion) {
  // No animation library (offline) or user prefers less motion: just show everything
  const pre = $(".preloader");
  if (pre) pre.remove();
} else {
  gsap.registerPlugin(ScrollTrigger);
  // Don't recalculate everything when the phone's address bar shows/hides
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !isTouch) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  $$("a[href^='#']").forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: id === "#contact" ? 0 : -40, duration: 1.4 });
      else window.scrollTo({ top: target === 0 ? 0 : target.offsetTop - 40, behavior: "smooth" });
    });
  });

  /* ---------- Initial hidden states ---------- */
  gsap.set([".hero__title .ch", ".flip"], { yPercent: 120, rotate: 6 });
  gsap.set([".hero__halo", ".spin-badge"], { scale: 0.6, opacity: 0 });
  gsap.set(".hero__title .hl", { "--hl": 0 });
  gsap.set([".hero__status", ".hero__subtitle"], { y: 20, opacity: 0 });
  gsap.set(".hero__photo", { y: 80, opacity: 0 });
  gsap.set(".tool", { scale: 0 });
  gsap.set(".nav", { y: -100, opacity: 0 });

  /* ---------- Preloader → hero intro ---------- */
  const counter = { v: 0 };
  const countEl = $("#loadCount");

  const intro = gsap.timeline({ paused: true, onComplete: () => lenis && lenis.start() });
  intro
    .to([".hero__title .ch", ".flip"], { yPercent: 0, rotate: 0, duration: 1, ease: "power4.out", stagger: 0.022 })
    .to(".hero__title .hl", { "--hl": 1, duration: 0.8, ease: "power3.inOut" }, "-=0.4")
    .to(".nav", { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", clearProps: "transform" }, "-=1.1")
    .to([".hero__status", ".hero__subtitle"], { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.1 }, "-=0.9")
    .to(".hero__photo", { y: 0, opacity: 1, duration: 1.2, ease: "power4.out" }, "-=0.7")
    .to(".hero__halo", { scale: 1, opacity: 1, duration: 1.4, ease: "expo.out" }, "<")
    .to(".spin-badge", { scale: 1, opacity: 1, duration: 1.2, ease: "expo.out" }, "-=0.9")
    .to(".tool", { scale: 1, duration: 0.6, ease: "back.out(2)", stagger: { each: 0.035, from: "random" } }, "-=1");

  // Boot log lines appear as the counter passes each threshold
  const BOOT = [
    [0, "booting anil.dev"],
    [14, "loading react · next.js"],
    [32, "connecting node + database"],
    [52, "waking up AI agents"],
    [72, "compiling 3D animations"],
    [94, "ready, welcome"],
  ];
  const logEl = $("#bootLog");
  const odoCols = $$(".odo__col");
  const satEls = $$(".sat");

  // Rolling odometer: each digit column slides to its number
  function setCounter(v) {
    const digits = String(v).padStart(3, "0");
    odoCols.forEach((col, i) => {
      col.firstElementChild.style.transform = `translateY(${-Number(digits[i]) * 10}%)`;
      col.classList.toggle("is-lead", digits.slice(0, i + 1).split("").every((d) => d === "0") && i < 2);
    });
  }
  setCounter(0);
  const barEl = $(".pl-bar span");
  let logged = 0;

  function addLog(text, i) {
    const line = document.createElement("div");
    const last = i === BOOT.length - 1;
    line.className = "pl-line" + (last ? " pl-line--final" : "");
    line.innerHTML = last ? `✦ ${text}` : `› ${text}${i > 0 ? " <b>✓</b>" : ""}`;
    logEl.append(line);
  }

  gsap.from(".pl-anim", { y: 24, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1, clearProps: "transform" });

  // Name flips in letter by letter (3D)
  const plName = $(".preloader__name");
  if (plName) {
    const dot = plName.querySelector("span");
    const letters = [...plName.childNodes[0].textContent].map((c) => `<span class="plc">${c === " " ? "&nbsp;" : c}</span>`).join("");
    plName.innerHTML = letters;
    if (dot) plName.append(dot);
    gsap.from(".plc", {
      rotateX: -100,
      yPercent: 60,
      opacity: 0,
      transformPerspective: 500,
      transformOrigin: "50% 100%",
      duration: 0.9,
      ease: "back.out(1.6)",
      stagger: 0.045,
      delay: 0.15,
    });
  }

  // Warp-speed starfield: speeds up with loading, hyperspace on exit
  const warp = { speed: 0.004 };
  const starCanvas = $(".pl-stars");
  if (starCanvas) {
    const sctx = starCanvas.getContext("2d");
    let sw, sh;
    const stars = Array.from({ length: lite ? 160 : 420 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
      lime: Math.random() < 0.25,
    }));
    const sizeStars = () => {
      const dpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      sw = window.innerWidth;
      sh = window.innerHeight;
      starCanvas.width = sw * dpr;
      starCanvas.height = sh * dpr;
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeStars();
    window.addEventListener("resize", sizeStars);

    (function drawStars() {
      if (!document.body.contains(starCanvas)) return; // preloader removed
      sctx.clearRect(0, 0, sw, sh);
      const cx = sw / 2;
      const cy = sh / 2;
      const f = Math.max(sw, sh) * 0.5;
      for (const s of stars) {
        const pz = s.z;
        s.z -= warp.speed;
        if (s.z <= 0.01) {
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
          s.z = 1;
          continue;
        }
        const x1 = cx + (s.x / pz) * f;
        const y1 = cy + (s.y / pz) * f;
        const x2 = cx + (s.x / s.z) * f;
        const y2 = cy + (s.y / s.z) * f;
        const a = Math.min(1, (1 - s.z) * 1.4);
        sctx.strokeStyle = s.lime ? `rgba(212,255,58,${a})` : `rgba(255,255,255,${a * 0.8})`;
        sctx.lineWidth = (1 - s.z) * 2.2;
        sctx.beginPath();
        sctx.moveTo(x1, y1);
        sctx.lineTo(x2, y2);
        sctx.stroke();
      }
      requestAnimationFrame(drawStars);
    })();
  }

  // Mouse tilts the cube scene in 3D
  const plEl = $(".preloader");
  const cubeTilt = $(".cube-tilt");
  if (plEl && cubeTilt && finePointer) {
    plEl.addEventListener("mousemove", (e) => {
      const px = e.clientX / window.innerWidth - 0.5;
      const py = e.clientY / window.innerHeight - 0.5;
      cubeTilt.style.setProperty("--ty", `${px * 50}deg`);
      cubeTilt.style.setProperty("--tx", `${-py * 40}deg`);
    });
  }

  const boot = gsap.timeline();
  boot
    .to(counter, {
      v: 100,
      duration: 2.6,
      ease: "power2.inOut",
      onUpdate: () => {
        const v = Math.round(counter.v);
        setCounter(v);
        // Orbiting logos pop in one by one as loading progresses
        satEls.forEach((sat, i) => sat.classList.toggle("is-on", v >= (i / satEls.length) * 90 + 4));
        barEl.style.transform = `scaleX(${counter.v / 100})`;
        warp.speed = 0.004 + (counter.v / 100) * 0.008;
        while (logged < BOOT.length && v >= BOOT[logged][0]) addLog(BOOT[logged][1], logged++);
      },
    })
    // Hold at 100% until the web fonts are ready
    .add(() => {
      boot.pause();
      const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
      Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => boot.resume());
    }, "+=0.2")
    // Hyperspace jump: stars streak, cube bursts and flies at the camera
    .to(warp, { speed: 0.075, duration: 1.1, ease: "power2.in" })
    .to(".cube", { "--d": "320px", duration: 0.9, ease: "power3.in" }, "<0.1")
    .to(".pl-sats", { "--r": "900px", duration: 1, ease: "power3.in" }, "<")
    .to(".cube__face", { opacity: 0, duration: 0.5, ease: "power2.in" }, "-=0.5")
    .to(".cube-tilt", { scale: 3.2, opacity: 0, duration: 0.9, ease: "power3.in" }, "<-0.2")
    .to(".pl-glow", { scale: 2.5, opacity: 0, duration: 0.8, ease: "power3.in" }, "<")
    .to(".pl-floor", { opacity: 0, yPercent: 30, duration: 0.7, ease: "power2.in" }, "<")
    .to([".preloader__top", ".preloader__bottom", ".pl-bar"], { opacity: 0, y: -20, duration: 0.5, stagger: 0.05 }, "<")
    .to([".pl-stars", ".pl-scan"], { opacity: 0, duration: 0.5 }, "-=0.2")
    // Panels slide away from the centre outward
    .to(".preloader__panels i", {
      yPercent: -100,
      duration: 1,
      ease: "expo.inOut",
      stagger: { each: 0.07, from: "center" },
    }, "-=0.2")
    .add(() => intro.play(), "-=0.7")
    .add(() => $(".preloader").remove());

  /* ---------- Scroll progress ---------- */
  gsap.to(".progress", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
  });

  /* ---------- Hero parallax on scroll ---------- */
  gsap.to(".hero__title", {
    yPercent: -30,
    opacity: 0.2,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  gsap.to(".hero__visual", {
    yPercent: 12,
    scale: 0.94,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  /* ---------- Orbit rings shift with the mouse (parallax depth) ---------- */
  if (finePointer) {
    // Uses the CSS "translate" property so it doesn't fight the ring rotation
    const rings = $$(".halo__orbit").map((el, i) => ({ el, depth: [12, -20, 32][i] || 16 }));
    $(".hero").addEventListener("mousemove", (e) => {
      const dx = e.clientX / window.innerWidth - 0.5;
      const dy = e.clientY / window.innerHeight - 0.5;
      rings.forEach(({ el, depth }) => (el.style.translate = `${dx * depth}px ${dy * depth}px`));
    });
  }

  /* ---------- Marquee band subtle parallax ---------- */
  gsap.fromTo(".marquee-band", { rotate: -4 }, {
    rotate: 2,
    ease: "none",
    scrollTrigger: { trigger: ".marquee-band", start: "top bottom", end: "bottom top", scrub: true },
  });

  /* ---------- Section titles: words slide up ---------- */
  $$("[data-split]").forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 110,
      duration: 1,
      ease: "power4.out",
      stagger: 0.06,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
    const hl = $(".hl", el);
    if (hl) {
      gsap.fromTo(hl, { "--hl": 0 }, {
        "--hl": 1,
        duration: 0.9,
        delay: 0.5,
        ease: "power3.inOut",
        scrollTrigger: { trigger: el, start: "top 80%" },
      });
    }
  });

  /* ---------- About text: words light up as you scroll ---------- */
  $$("[data-scrub-words]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="sw">${w}</span>`).join(" ");
    gsap.fromTo($$(".sw", el), { opacity: 0.12 }, {
      opacity: 1,
      stagger: 0.1,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
    });
  });

  /* ---------- Generic reveal (batched so siblings stagger) ---------- */
  gsap.set("[data-reveal]", { y: 50, opacity: 0 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { y: 0, opacity: 1, duration: 1, ease: "power3.out", stagger: 0.12, overwrite: true, clearProps: "transform" }),
  });

  /* ---------- Stats: lines draw in, numbers flip up in 3D ---------- */
  const statsEl = $(".stats");
  if (statsEl) {
    const statTl = gsap.timeline({ scrollTrigger: { trigger: statsEl, start: "top 85%" } });
    statTl
      .fromTo(statsEl, { "--line-x": 0 }, { "--line-x": 1, duration: 1, ease: "power3.inOut" })
      .fromTo(".stat", { "--line-y": 0 }, { "--line-y": 1, duration: 0.8, ease: "power3.out", stagger: 0.12 }, "-=0.5")
      .from(".stat__num", {
        rotateX: -95,
        yPercent: 40,
        opacity: 0,
        filter: "blur(8px)",
        transformPerspective: 600,
        transformOrigin: "50% 100%",
        duration: 1.1,
        ease: "back.out(1.4)",
        stagger: 0.12,
        clearProps: "transform,filter",
      }, "-=1.1")
      .from(".stat__label", { y: 16, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.12 }, "-=0.9");

    // Parallax: neighbouring numbers drift at different speeds (desktop only)
    if (!lite) $$(".stat").forEach((stat, i) => {
      gsap.fromTo(stat, { y: i % 2 ? 30 : -10 }, {
        y: i % 2 ? -20 : 15,
        ease: "none",
        scrollTrigger: { trigger: statsEl, start: "top bottom", end: "bottom top", scrub: true },
      });
    });
  }

  /* ---------- Counters ---------- */
  $$("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = "0";
    gsap.to(obj, {
      v: end,
      duration: 2,
      ease: "power2.out",
      onUpdate: () => (el.textContent = Math.round(obj.v)),
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });

  /* ---------- Automation: 3D scene swings in, apps fly out of depth ---------- */
  gsap.fromTo(".auto-scene", { rotateY: -35, rotateX: 20, z: -250, opacity: 0.4 }, {
    rotateY: 0,
    rotateX: 0,
    z: 0,
    opacity: 1,
    ease: "none",
    scrollTrigger: { trigger: ".automate", start: "top 90%", end: "top 25%", scrub: 0.8 },
  });

  gsap.from(".app", {
    opacity: 0,
    scale: 0.3,
    duration: 1,
    ease: "back.out(1.6)",
    stagger: 0.12,
    scrollTrigger: { trigger: ".auto-stage", start: "top 70%" },
  });

  /* ---------- Work: cards stack in 3D as you scroll ---------- */
  const pcards = $$(".pcard");
  pcards.forEach((card, i) => {
    const next = pcards[i + 1];
    const stage = $(".stage3d", card);
    const floats = $$(".float", card);

    // Preview swings in from an angle as the card arrives
    gsap.fromTo(stage, { rotateX: 28, rotateY: -24, z: -120 }, {
      rotateX: 0,
      rotateY: 0,
      z: 0,
      ease: "none",
      scrollTrigger: { trigger: card, start: "top bottom", end: "top 25%", scrub: 0.6 },
    });

    // Floating badges drift at a different speed (depth)
    gsap.fromTo(floats, { y: 70 }, {
      y: -30,
      ease: "none",
      stagger: 0.1,
      scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: 0.6 },
    });

    // When the next card slides over, push this one back
    if (next) {
      gsap.to(card, {
        scale: 0.9,
        rotateX: lite ? 0 : -8,
        ...(lite ? { opacity: 0.55 } : { filter: "brightness(0.6)" }),
        transformPerspective: 1400,
        ease: "none",
        scrollTrigger: { trigger: next, start: "top bottom", end: "top 20%", scrub: true },
      });
    }
  });

  /* ---------- Process: 3D ring rotates as you scroll (desktop) ---------- */
  (function processRing() {
    const section = $(".process-sec");
    const steps = $$(".pstep");
    if (!section || !steps.length) return;

    // Phones/tablets: plain grid, cards just fade up
    if (!window.matchMedia("(min-width: 900px)").matches) {
      gsap.from(steps, {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".ring", start: "top 85%" },
      });
      return;
    }

    section.classList.add("is-3d");
    const ring = $(".ring");
    const tilt = $(".ring-tilt");
    const fill = $(".prail__fill");
    const btns = $$(".prail__btn");
    const STEP = 40;
    const last = steps.length - 1;
    const radius = () => parseFloat(getComputedStyle(ring).getPropertyValue("--r")) || 640;
    const state = { rot: 0 };

    function render() {
      ring.style.transform = `translateY(-50%) translateZ(${-radius()}px) rotateY(${state.rot}deg)`;
      const progress = -state.rot / (last * STEP);
      const current = Math.round(progress * last);
      steps.forEach((step, i) => {
        const angle = Math.abs(i * STEP + state.rot);
        step.style.opacity = Math.max(0.15, 1 - angle / 75);
        step.classList.toggle("is-active", i === current);
      });
      fill.style.transform = `scaleX(${progress})`;
      btns.forEach((b, i) => {
        b.classList.toggle("is-active", i === current);
        b.classList.toggle("is-done", i < current);
      });
    }

    const trigger = gsap.to(state, {
      rot: -last * STEP,
      ease: "none",
      onUpdate: render,
      scrollTrigger: {
        trigger: section,
        pin: ".process-pin",
        start: "top top",
        end: () => `+=${last * window.innerHeight * 0.8}`,
        scrub: 0.8,
        snap: { snapTo: 1 / last, duration: { min: 0.2, max: 0.6 }, ease: "power2.inOut" },
        invalidateOnRefresh: true,
      },
    }).scrollTrigger;
    render();

    // Click a step on the rail to jump to it
    btns.forEach((btn, i) => {
      btn.addEventListener("click", () => {
        const y = trigger.start + (trigger.end - trigger.start) * (i / last);
        if (lenis) lenis.scrollTo(y, { duration: 1.2 });
        else window.scrollTo({ top: y, behavior: "smooth" });
      });
    });

    // Slight 3D tilt toward the mouse
    if (finePointer) {
      section.addEventListener("mousemove", (e) => {
        const px = e.clientX / window.innerWidth - 0.5;
        const py = e.clientY / window.innerHeight - 0.5;
        tilt.style.setProperty("--ty", `${px * 10}deg`);
        tilt.style.setProperty("--tx", `${-4 - py * 8}deg`);
      });
      section.addEventListener("mouseleave", () => {
        tilt.style.removeProperty("--ty");
        tilt.style.removeProperty("--tx");
      });
    }
  })();

  /* ---------- Contact title: letters flip in with 3D rotation ---------- */
  $$("[data-split-3d]").forEach((el) => {
    function splitInto(node) {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((chunk) => {
            if (!chunk) return;
            if (/^\s+$/.test(chunk)) return frag.append(" ");
            const word = document.createElement("span");
            word.className = "word";
            [...chunk].forEach((c) => {
              const ch = document.createElement("span");
              ch.className = "ch3";
              ch.textContent = c;
              word.append(ch);
            });
            frag.append(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeName !== "BR") {
          splitInto(child);
        }
      });
    }
    splitInto(el);

    gsap.from($$(".ch3", el), {
      rotateX: -110,
      yPercent: 50,
      opacity: 0,
      transformPerspective: 700,
      transformOrigin: "50% 100% -20px",
      duration: 1.2,
      ease: "power4.out",
      stagger: 0.022,
      scrollTrigger: { trigger: el, start: "top 80%" },
    });

    const hl = $(".hl", el);
    if (hl) {
      gsap.fromTo(hl, { "--hl": 0 }, {
        "--hl": 1,
        duration: 0.9,
        delay: 0.9,
        ease: "power3.inOut",
        scrollTrigger: { trigger: el, start: "top 80%" },
      });
    }
  });

  /* ---------- Big name leans with scroll speed ---------- */
  // (skew the container: the tracks already use transform for the CSS marquee)
  const bigName = $(".bigname");
  if (bigName && !lite) {
    const skewTo = gsap.quickTo(bigName, "skewX", { duration: 0.5, ease: "power3.out" });
    ScrollTrigger.create({
      trigger: ".bigname",
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => skewTo(gsap.utils.clamp(-18, 18, self.getVelocity() / -150)),
    });
  }

  /* ---------- Contact section rises up ---------- */
  gsap.from(".contact", {
    scale: 0.94,
    ease: "none",
    scrollTrigger: { trigger: ".contact", start: "top bottom", end: "top 40%", scrub: true },
  });

  /* ---------- Desktop-only interactions ---------- */
  if (finePointer) {
    // Custom cursor
    const dot = $(".cursor");
    const ring = $(".cursor-ring");
    const label = $(".cursor-ring__label");
    const dotX = gsap.quickTo(dot, "x", { duration: 0.1 });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.1 });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

    window.addEventListener("mousemove", (e) => {
      document.body.classList.add("has-cursor");
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    });
    document.addEventListener("mouseleave", () => document.body.classList.remove("has-cursor"));

    document.addEventListener("mouseover", (e) => {
      const labelled = e.target.closest("[data-cursor]");
      const interactive = e.target.closest("a, button");
      ring.classList.toggle("is-label", !!labelled);
      ring.classList.toggle("is-hover", !labelled && !!interactive);
      dot.classList.toggle("is-hidden", !!labelled);
      label.textContent = labelled ? labelled.dataset.cursor : "";
    });

    // Magnetic buttons
    $$("[data-magnetic]").forEach((el) => {
      const strength = el.classList.contains("orb") ? 0.45 : 0.3;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - r.left - r.width / 2) * strength,
          y: (e.clientY - r.top - r.height / 2) * strength,
          duration: 0.5,
          ease: "power3.out",
        });
      });
      el.addEventListener("mouseleave", () =>
        gsap.to(el, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.35)" })
      );
    });

  }

  // Triggers were created in code order, not page order: sort them so the
  // pinned Process section pushes later triggers down correctly
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  // Recalculate trigger positions once fonts/images are in
  window.addEventListener("load", () => ScrollTrigger.refresh());
}
