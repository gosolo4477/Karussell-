(function () {
  const { animate } = window.Motion;

  // Takt: alle Einsätze liegen auf einem 120-BPM-Raster (1 Beat = 0,5 s)
  const BPM = 120;
  const BEAT = 60 / BPM;
  const SLIDE_W = 1080;

  const POP = [0.34, 1.56, 0.64, 1]; // überschwingend ("backOut")
  const SNAP = [0.85, 0, 0.15, 1]; // schneller Karussell-Wisch

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // --- Sprache: Texte einsetzen, Folien weglassen, Codewort vorbereiten ---------
  const params = new URLSearchParams(location.search);
  const LANG = window.REEL_TEXTS[params.get("lang")] ? params.get("lang") : "es";
  const TEXT = Object.assign({}, window.REEL_TEXTS[LANG], window.SCHWAECHE_TEXTS[LANG]);
  document.documentElement.lang = LANG;
  document.body.classList.add("lang-" + LANG);
  const THEME = params.get("theme") === "dark" ? "dark" : "color";
  document.body.classList.add("theme-" + THEME);
  $$("[data-t]").forEach((el) => {
    if (TEXT[el.dataset.t] !== undefined) el.innerHTML = TEXT[el.dataset.t];
  });
  TEXT.skip.forEach((id) => document.getElementById(id)?.remove());
  const caretEl = $(".ctext .caret");
  for (const ch of TEXT.code) {
    const l = document.createElement("span");
    l.className = "ltr";
    l.textContent = ch;
    caretEl.before(l);
  }
  $(".ptext").textContent = TEXT.code;

  // Wellenförmige Pfeile: die Welle (Periode 16) fließt später im Takt nach rechts
  const WAVE_D = (() => {
    let d = "M-48 18 q4 -14 8 0";
    for (let x = -40; x < 44; x += 8) d += " t8 0";
    return d;
  })();
  $$(".wa").forEach((el) => {
    el.innerHTML =
      '<svg class="wave-arrow" viewBox="0 0 64 36" aria-hidden="true">' +
      '<defs><clipPath id="wa-clip"><rect x="0" y="0" width="47" height="36" /></clipPath></defs>' +
      '<g clip-path="url(#wa-clip)"><path class="wave" d="' + WAVE_D + '" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" /></g>' +
      '<path d="M43 7 L62 18 L43 29 Z" fill="currentColor" /></svg>';
  });

  // Folien und ihre Länge in Beats (weggelassene fallen raus)
  const SLIDES = [
    { id: "a1", beats: 8 },
    { id: "a2", beats: 6 },
    { id: "a3", beats: 8 },
    { id: "s3", beats: 16 },
    { id: "s4", beats: 4 },
    { id: "s6", beats: 14 },
  ].filter((sl) => document.getElementById(sl.id));

  // Position im Karussell und Farbe (Orange/Blau im Wechsel)
  SLIDES.forEach((sl, i) => {
    const el = document.getElementById(sl.id);
    el.style.left = i * SLIDE_W + "px";
    el.classList.add(i % 2 ? "blue" : "orange");
  });
  const byId = Object.fromEntries(SLIDES.map((sl) => [sl.id, sl]));

  let beat = 0;
  for (const s of SLIDES) {
    s.start = beat;
    beat += s.beats;
  }
  const TOTAL_BEATS = beat;

  const t = (b) => b * BEAT;

  const track = $("#track");
  const dots = SLIDES.map(() => {
    const d = document.createElement("div");
    d.className = "dot";
    $("#dots").appendChild(d);
    return d;
  });

  const seq = [];

  // --- Bausteine -----------------------------------------------------------
  const popIn = (el, at, from = { y: 140, scale: 0.6 }) =>
    seq.push([el, { opacity: [0, 1], y: [from.y, 0], scale: [from.scale, 1] }, { at, duration: 0.4, ease: POP }]);

  const cardIn = (el, at, rotate = -3) =>
    seq.push([el, { opacity: [0, 1], scale: [0.3, 1], rotate: [-18, rotate] }, { at, duration: 0.5, ease: POP }]);

  const emojiIn = (el, at) =>
    seq.push([el, { opacity: [0, 1], scale: [0, 1], rotate: [-40, 0] }, { at, duration: 0.45, ease: POP }]);

  // kleiner "Kick" auf jedem Beat
  const bumps = (el, fromBeat, toBeat, amount = 1.05) => {
    for (let b = fromBeat; b < toBeat; b++) {
      seq.push([el, { scale: [1, amount, 1] }, { at: t(b), duration: 0.22, ease: "easeOut" }]);
    }
  };

  const wiggle = (el, fromBeat, toBeat, deg = 12) => {
    for (let b = fromBeat; b < toBeat; b++) {
      const d = b % 2 ? deg : -deg;
      seq.push([el, { rotate: [0, d, 0] }, { at: t(b), duration: 0.3, ease: "easeOut" }]);
    }
  };

  // Welle fließt pro Beat genau eine Periode weiter -> nahtlos und im Takt
  const waveFlow = (wa, fromBeat, toBeat) => {
    const path = $(".wave", wa);
    for (let b = fromBeat; b < toBeat; b++) {
      seq.push([path, { x: [0, 16] }, { at: t(b), duration: BEAT, ease: "linear" }]);
    }
  };

  const bounce = (el, fromBeat, toBeat) => {
    for (let b = fromBeat; b < toBeat; b++) {
      seq.push([el, { y: [0, 40, 0] }, { at: t(b), duration: 0.3, ease: "easeOut" }]);
    }
  };

  // --- Karussell-Wechsel + Punkte --------------------------------------------
  SLIDES.forEach((s, i) => {
    const slide = $("#" + s.id);
    const end = s.start + s.beats;

    if (i > 0) {
      // landet genau auf dem Beat
      const at = t(s.start) - 0.3;
      seq.push([track, { x: -i * SLIDE_W }, { at, duration: 0.3, ease: SNAP }]);
      seq.push([track, { skewX: [0, -6, 0] }, { at, duration: 0.3, ease: "easeInOut" }]);
      seq.push([dots[i - 1], { width: 22, opacity: 0.45 }, { at, duration: 0.3, ease: SNAP }]);
    }
    seq.push([dots[i], { width: [22, 64], opacity: [0.45, 1] }, { at: Math.max(0, t(s.start) - 0.3), duration: 0.3, ease: SNAP }]);

    // Hintergrund pumpt im Takt
    bumps($(".blob", slide), s.start, end, 1.08);
    for (let b = s.start; b < end; b++) {
      seq.push([$(".ring", slide), { scale: [1, 1.12, 1] }, { at: t(b + 0.5), duration: 0.25, ease: "easeOut" }]);
    }
  });

  // --- Inhalte pro Folie ------------------------------------------------------
  // 1: Hook – Pizza, Pasta oder Brot? Auswahl springt im Takt von Kachel zu Kachel
  {
    const s = byId.a1;
    const slide = $("#a1");
    const end = s.start + s.beats;
    $$(".hl > span", slide).forEach((el, k) => popIn(el, t(s.start + k * 0.5)));
    const tiles = $$(".tile", slide);
    tiles.forEach((el, k) => {
      seq.push([el, { opacity: [0, 1], y: [160, 0], scale: [0.4, 1], rotate: [k % 2 ? 12 : -12, 0] }, { at: t(s.start + 1.5 + k * 0.5), duration: 0.45, ease: POP }]);
    });
    popIn($("#a1-q > span"), t(s.start + 3), { y: 60, scale: 0.6 });
    for (let b = s.start + 3.5; b < end; b += 1) {
      const k = Math.round((b - s.start - 3.5)) % 3;
      const tile = tiles[k];
      seq.push([tile, { scale: [1, 1.1, 1.06] }, { at: t(b), duration: 0.3, ease: "easeOut" }]);
      seq.push([tile, { scale: 1 }, { at: t(b + 0.85), duration: 0.15 }]);
      seq.push([$(".tglow", tile), { opacity: [0, 1, 1, 0] }, { at: t(b), duration: BEAT, times: [0, 0.15, 0.8, 1] }]);
      seq.push([$(".emo", tile), { rotate: [0, k % 2 ? 14 : -14, 0] }, { at: t(b), duration: 0.35, ease: "easeOut" }]);
    }
    const swipe = $(".swipe > span", slide);
    seq.push([swipe, { opacity: [0, 1] }, { at: t(s.start + 4), duration: 0.3 }]);
    for (let b = s.start + 5; b < end; b++) {
      seq.push([swipe, { x: [0, 18, 0] }, { at: t(b), duration: 0.3, ease: "easeOut" }]);
    }
  }

  // 2: Nummer in die Kommentare
  {
    const s = byId.a2;
    const slide = $("#a2");
    const end = s.start + s.beats;
    $$(".hl > span", slide).forEach((el, k) => popIn(el, t(s.start + k * 0.5)));
    $$(".nchip", slide).forEach((el, k) => {
      seq.push([el, { opacity: [0, 1], x: [k % 2 ? 300 : -300, 0], scale: [0.7, 1] }, { at: t(s.start + 1.5 + k * 0.5), duration: 0.4, ease: POP }]);
      bumps($("b", el), s.start + 3 + k, end, 1.18);
    });
    const finger = $("#a2-finger");
    emojiIn(finger, t(s.start + 3));
    bounce(finger, s.start + 3.5, end);
  }

  // 3: Alle Inhaltsstoffe -> Video-Karte + drei Kästen mit fließenden Wellenpfeilen
  {
    const s = byId.s3;
    const slide = $("#s3");
    const end = s.start + s.beats;
    $$(".hl > span", slide).forEach((el) => popIn(el, t(s.start)));
    const card = $(".card", slide);
    cardIn(card, t(s.start + 0.5), 1.5);

    $$(".group", slide).forEach((box, gi) => {
      const at = s.start + 2 + gi * 2;
      seq.push([box, { opacity: [0, 1], x: [-200, 0], scale: [0.85, 1] }, { at: t(at), duration: 0.4, ease: POP }]);
      $$(".wa", box).forEach((wa, k) => {
        seq.push([wa, { opacity: [0, 1], scale: [0, 1.3, 1], x: [-30, 0] }, { at: t(at + 0.25 + k * 0.5), duration: 0.35, ease: "easeOut" }]);
        waveFlow(wa, Math.ceil(at + 0.5), end);
        for (let b = Math.ceil(at + 1); b < end; b++) {
          seq.push([wa, { x: [0, 10, 0] }, { at: t(b), duration: 0.25, ease: "easeOut" }]);
        }
      });
    });

    bumps(card, s.start + 9, end, 1.03);
  }

  // 3w: Wirkungs-Bild mit Glitzer im Takt (nicht in jeder Sprachversion)
  if (byId.s3w) {
    const s = byId.s3w;
    const slide = $("#s3w");
    const end = s.start + s.beats;
    $$(".hl > span", slide).forEach((el, k) => popIn(el, t(s.start + k * 0.5)));
    const card = $(".card", slide);
    cardIn(card, t(s.start + 1), -2);
    $$(".spark", slide).forEach((el, k) => {
      for (let b = s.start + 2 + (k % 4) * 0.25; b < end; b += 1) {
        seq.push([el, { opacity: [0, 1, 0], scale: [0.2, 1.4, 0.2] }, { at: t(b), duration: 0.4, ease: "easeOut" }]);
      }
    });
    $$(".chip", slide).forEach((el, k) => {
      const b = s.start + 3 + k;
      popIn(el, t(b), { y: 80, scale: 0.3 });
      bumps(el, b + 1, end, 1.05);
    });
    bumps(card, s.start + 3, end, 1.03);
  }

  // 4: Sin azúcar / Sin colorantes
  {
    const s = byId.s4;
    const slide = $("#s4");
    $$(".hl > span", slide).forEach((el, k) => {
      seq.push([el, { opacity: [0, 1], x: [-260, 0] }, { at: t(s.start + k), duration: 0.4, ease: POP }]);
    });
    $$(".check", slide).forEach((el, k) => {
      seq.push([el, { scale: [0, 1], rotate: [-90, 0] }, { at: t(s.start + k + 0.5), duration: 0.4, ease: POP }]);
    });
  }

  // 5: Ritual
  {
    const s = byId.a3;
    const slide = $("#a3");
    $$(".hl > span", slide).forEach((el, k) => popIn(el, t(s.start + k * 0.5)));
    const card = $(".card", slide);
    cardIn(card, t(s.start + 1), 2);
    popIn($(".badge", slide), t(s.start + 2), { y: 60, scale: 0.5 });
    const emoji = $("#a3-emoji");
    emojiIn(emoji, t(s.start + 2.5));
    wiggle(emoji, s.start + 4, s.start + s.beats, 10);
    bumps(card, s.start + 4, s.start + s.beats, 1.04);
  }

  // 6: CTA – Gratis-Ratgeber; das Codewort wird im Takt getippt und abgeschickt
  {
    const s = byId.s6;
    const slide = $("#s6");
    const end = s.start + s.beats;
    popIn($(".gift", slide), t(s.start), { y: 60, scale: 0.4 });
    $$("h1.hl > span", slide).forEach((el, k) => popIn(el, t(s.start + 0.5 + k * 0.5)));
    popIn($("#s6-sub > span"), t(s.start + 2.5), { y: 60, scale: 0.8 });
    const cta = $("#s6-cta > span");
    popIn(cta, t(s.start + 3), { y: 80, scale: 0.4 });
    bumps(cta, s.start + 4, end, 1.06);
    bounce($("#s6-finger"), s.start + 3, end);

    const field = $(".cfield", slide);
    seq.push([field, { opacity: [0, 1], y: [120, 0], scale: [0.8, 1] }, { at: t(s.start + 3), duration: 0.4, ease: POP }]);

    // Tippen: ein Buchstabe pro halbem Beat, der Cursor wandert mit
    const caret = $(".caret", slide);
    const letters = $$(".ltr", slide);
    const typeStart = s.start + 3.5;
    letters.forEach((el, k) => {
      const at = t(typeStart + k * 0.5);
      seq.push([el, { opacity: [0, 1], scale: [1.6, 1], y: [-20, 0] }, { at, duration: 0.18, ease: "easeOut" }]);
      seq.push([caret, { x: el.offsetLeft + el.offsetWidth + 4 }, { at, duration: 0.08, ease: "linear" }]);
    });
    const postBeat = typeStart + letters.length * 0.5;

    // Cursor blinkt bis zum Abschicken
    for (let b = typeStart; b < postBeat; b += 0.5) {
      seq.push([caret, { opacity: [1, 0.15, 1] }, { at: t(b), duration: BEAT / 2, ease: "linear" }]);
    }

    // "Publicar" wird aktiv und gedrückt
    const post = $(".cpost", slide);
    seq.push([post, { opacity: [0.3, 1] }, { at: t(typeStart + 0.5), duration: 0.2 }]);
    seq.push([post, { scale: [1, 0.8, 1.15, 1] }, { at: t(postBeat) - 0.15, duration: 0.35, ease: "easeOut" }]);

    // Feld leert sich, Kommentar erscheint
    letters.forEach((el) => seq.push([el, { opacity: 0 }, { at: t(postBeat) + 0.1, duration: 0.15 }]));
    seq.push([caret, { x: 0, opacity: 1 }, { at: t(postBeat) + 0.1, duration: 0.05 }]);
    seq.push([post, { opacity: 0.3 }, { at: t(postBeat) + 0.15, duration: 0.2 }]);

    const posted = $(".posted", slide);
    seq.push([posted, { opacity: [0, 1], y: [-160, 0], scale: [0.6, 1] }, { at: t(postBeat) + 0.1, duration: 0.45, ease: POP }]);

    // Herz ploppt auf dem nächsten Beat und schlägt im Takt
    const heart = $(".pheart", slide);
    seq.push([heart, { opacity: [0, 1], scale: [0, 1.6, 1], rotate: [-30, 0] }, { at: t(postBeat + 1), duration: 0.4, ease: "easeOut" }]);
    bumps(heart, postBeat + 2, end, 1.3);
    bumps(posted, postBeat + 2, end, 1.03);

    // kleine Herzen steigen auf jedem Beat auf
    $$(".floater", slide).forEach((el, k) => {
      const at = t(postBeat + 1 + k);
      if (postBeat + 1 + k >= end) return;
      const drift = k % 2 ? 60 : -60;
      seq.push([el, { opacity: [0, 1, 0], y: [0, -380], x: [0, drift], scale: [0.6, 1.1, 0.8] }, { at, duration: 1.4, ease: "easeOut" }]);
    });
  }

  // --- Edler Hintergrund (nur Theme "dark"): Goldlinien, Lichtpunkte, Glanz --------
  if (THEME === "dark") {
    const bg = $("#bg");
    bg.innerHTML =
      '<svg class="lines" viewBox="0 0 1080 1920" aria-hidden="true"><defs>' +
      '<linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d79a" stop-opacity="0"/>' +
      '<stop offset="0.5" stop-color="#e2b866"/><stop offset="1" stop-color="#f3d79a" stop-opacity="0"/></linearGradient></defs>' +
      '<g fill="none" stroke="url(#gl)" stroke-width="2">' +
      '<path class="ln" d="M-120 1480 C 260 1260, 720 1700, 1200 1380"/>' +
      '<path class="ln" d="M-120 1560 C 300 1360, 760 1780, 1200 1470" stroke-opacity="0.6"/>' +
      '<path class="ln" d="M-100 360 C 300 120, 700 520, 1180 220" stroke-opacity="0.5"/>' +
      "</g></svg>" +
      '<div class="sheen"></div><div class="vignette"></div><div class="grain"></div>';
    // goldene Lichtpunkte (feste Positionen -> jedes Rendern gleich)
    const B = [[90, 300, 120], [880, 220, 70], [980, 760, 150], [60, 1050, 90], [760, 1320, 110], [260, 1650, 160],
      [940, 1700, 80], [520, 120, 60], [160, 620, 50], [640, 980, 46], [400, 1420, 70], [1020, 1180, 54]];
    const sheen = $(".sheen", bg);
    B.forEach(([x, y, d], k) => {
      const el = document.createElement("i");
      el.className = "bokeh";
      Object.assign(el.style, { left: x - d / 2 + "px", top: y - d / 2 + "px", width: d + "px", height: d + "px" });
      bg.insertBefore(el, sheen);
      // langsam aufsteigend über das ganze Reel, Helligkeit atmet alle 2 Beats
      seq.push([el, { y: [0, -180 - (k % 4) * 60], x: [0, k % 2 ? 40 : -40] }, { at: 0, duration: t(TOTAL_BEATS), ease: "linear" }]);
      for (let b = k % 4; b < TOTAL_BEATS; b += 4) {
        seq.push([el, { opacity: [0.35, 0.9, 0.35] }, { at: t(b), duration: t(4), ease: "easeInOut" }]);
      }
    });
    // Goldlinien schimmern sanft
    $$(".ln", bg).forEach((el, k) => {
      seq.push([el, { x: [0, k % 2 ? -60 : 60] }, { at: 0, duration: t(TOTAL_BEATS), ease: "linear" }]);
    });
    // Glanz-Streifen zieht bei jedem Folienwechsel einmal über das Bild
    SLIDES.forEach((s) => {
      seq.push([sheen, { x: [0, 2400] }, { at: Math.max(0, t(s.start) - 0.2), duration: 1.1, ease: "easeInOut" }]);
    });
  }

  // --- Abspielen / Rendern ---------------------------------------------------
  const duration = t(TOTAL_BEATS);
  const render = params.has("render");
  if (render) document.body.classList.add("render");

  const controls = animate(seq, { repeat: render ? 0 : Infinity });
  if (render) controls.pause();

  // Videos als Einzelbild-Folgen (30 fps), gesteuert von der Timeline -> beim Rendern exakt
  const COUNTS = window.REEL_FRAMES || {};
  const players = [
    { el: $("#s3-video"), dir: "zutaten-frames", count: COUNTS.zutaten || 1, start: t(byId.s3.start + 0.5) },
  ].map((pl) => ({
    ...pl,
    shown: 0,
    frames: Array.from({ length: pl.count }, (_, i) => {
      const img = new Image();
      img.src = `assets/${pl.dir}/f_${String(i + 1).padStart(4, "0")}.jpg`;
      return img;
    }),
  }));
  const showFrame = (time) =>
    Promise.all(
      players.map((pl) => {
        const i = Math.min(pl.count - 1, Math.max(0, Math.floor((time - pl.start) * 30)));
        if (i === pl.shown) return null;
        pl.shown = i;
        pl.el.src = pl.frames[i].src;
        return pl.el.decode().catch(() => {});
      })
    );

  if (!render) {
    const tick = () => {
      showFrame(controls.time % duration);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.reel = {
    bpm: BPM,
    lang: LANG,
    theme: THEME,
    duration,
    slideStarts: SLIDES.slice(1).map((sl) => t(sl.start)),
    ready: () => Promise.all(players.flatMap((pl) => pl.frames).map((img) => img.decode().catch(() => {}))),
    seek(time) {
      controls.time = time;
      return showFrame(time);
    },
  };
})();
