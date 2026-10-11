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
  const TEXT = window.REEL_TEXTS[LANG];
  document.documentElement.lang = LANG;
  document.body.classList.add("lang-" + LANG);
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

  // Folien und ihre Länge in Beats (weggelassene fallen raus)
  const SLIDES = [
    { id: "s1", beats: 8 },
    { id: "s2", beats: 4 },
    { id: "s3", beats: 16 },
    { id: "s3w", beats: 8 },
    { id: "s4", beats: 4 },
    { id: "s5", beats: 8 },
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
  // 1: Hook
  {
    const s = byId.s1;
    const slide = $("#s1");
    $$(".hl > span", slide).forEach((el, k) => popIn(el, t(s.start + k * 0.5)));
    const card = $(".card", slide);
    cardIn(card, t(s.start + 2));
    bumps(card, s.start + 4, s.start + s.beats);
    const emoji = $("#s1-emoji");
    emojiIn(emoji, t(s.start + 3));
    wiggle(emoji, s.start + 4, s.start + s.beats, 16);
  }

  // 2: ¿Sin culpa?
  {
    const s = byId.s2;
    const slide = $("#s2");
    $$(".hl > span", slide).forEach((el, k) => popIn(el, t(s.start + k * 0.5), { y: 200, scale: 0.4 }));
    const emoji = $("#s2-emoji");
    emojiIn(emoji, t(s.start + 1));
    wiggle(emoji, s.start + 2, s.start + s.beats, 14);
  }

  // 3: Alle Inhaltsstoffe -> Punkte im Bild + drei Gruppen-Kästen im Takt
  {
    const s = byId.s3;
    const slide = $("#s3");
    const end = s.start + s.beats;
    $$(".hl > span", slide).forEach((el) => popIn(el, t(s.start)));
    const card = $(".card", slide);
    cardIn(card, t(s.start + 0.5), 1.5);

    const spots = $$(".spot b", slide);
    const ripples = $$(".spot .ripple", slide);
    const ripple = (el, at) =>
      seq.push([el, { opacity: [0, 0.9, 0], scale: [1, 1, 2.4] }, { at, duration: 0.45, times: [0, 0.05, 1], ease: "easeOut" }]);

    const showSpot = (k, b) => {
      seq.push([spots[k], { opacity: [0, 1], scale: [0, 1.3, 1] }, { at: t(b), duration: 0.35, ease: "easeOut" }]);
      ripple(ripples[k], t(b));
      for (let beat = Math.floor(b) + 1; beat < end; beat++) {
        seq.push([spots[k], { scale: [1, 1.25, 1] }, { at: t(beat), duration: 0.22, ease: "easeOut" }]);
        ripple(ripples[k], t(beat));
      }
    };

    // Gruppe: Punkte auf halben Beats, dann der Kasten auf dem nächsten Beat
    const groups = $$(".group", slide);
    const plan = [
      { spots: [0, 1, 2, 3], at: s.start + 1.5 },
      { spots: [4, 5], at: s.start + 5 },
      { spots: [6], at: s.start + 7.5 },
    ];
    plan.forEach((g, gi) => {
      g.spots.forEach((k, j) => showSpot(k, g.at + j * 0.5));
      const boxAt = g.at + g.spots.length * 0.5;
      const box = groups[gi];
      seq.push([box, { opacity: [0, 1], x: [-200, 0], scale: [0.85, 1] }, { at: t(boxAt), duration: 0.4, ease: POP }]);
      const arrow = $(".p-arrow", box);
      for (let beat = Math.ceil(boxAt) + 1; beat < end; beat++) {
        seq.push([arrow, { x: [0, 14, 0] }, { at: t(beat), duration: 0.25, ease: "easeOut" }]);
      }
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
    const s = byId.s5;
    const slide = $("#s5");
    $$(".hl > span", slide).forEach((el, k) => popIn(el, t(s.start + k * 0.5)));
    const card = $(".card", slide);
    cardIn(card, t(s.start + 1), 2);
    popIn($(".badge", slide), t(s.start + 2), { y: 60, scale: 0.5 });
    const emoji = $("#s5-emoji");
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

    // Gisèle und das Titelblatt fliegen schräg rein und wippen abwechselnd im Takt
    const photos = $$(".photo", slide);
    seq.push([photos[0], { opacity: [0, 1], scale: [0.3, 1], rotate: [-20, -4] }, { at: t(s.start + 1.5), duration: 0.5, ease: POP }]);
    seq.push([photos[1], { opacity: [0, 1], scale: [0.3, 1], rotate: [20, 5] }, { at: t(s.start + 2), duration: 0.5, ease: POP }]);
    for (let b = s.start + 4; b < end; b++) {
      seq.push([photos[b % 2], { scale: [1, 1.05, 1] }, { at: t(b), duration: 0.22, ease: "easeOut" }]);
    }

    popIn($("#s6-sub > span"), t(s.start + 2.5), { y: 60, scale: 0.8 });
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

  // --- Abspielen / Rendern ---------------------------------------------------
  const duration = t(TOTAL_BEATS);
  const render = params.has("render");
  if (render) document.body.classList.add("render");

  const controls = animate(seq, { repeat: render ? 0 : Infinity });
  if (render) controls.pause();

  // Pizza-Video auf Folie 1 als Einzelbild-Folge (Zeitlupe, 30 fps), startet mit der Karte
  const video = $("#s1-video");
  const VIDEO_START = t(SLIDES[0].start + 2);
  const FRAME_COUNT = window.PIZZA_FRAMES || 1;
  const frameSrc = (i) => `assets/pizza-frames/f_${String(i + 1).padStart(4, "0")}.jpg`;
  const frames = Array.from({ length: FRAME_COUNT }, (_, i) => {
    const img = new Image();
    img.src = frameSrc(i);
    return img;
  });
  let shownFrame = 0;
  const showFrame = (time) => {
    const i = Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor((time - VIDEO_START) * 30)));
    if (i === shownFrame) return Promise.resolve();
    shownFrame = i;
    video.src = frames[i].src;
    return video.decode().catch(() => {});
  };

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
    duration,
    slideStarts: SLIDES.slice(1).map((sl) => t(sl.start)),
    ready: () => Promise.all(frames.map((img) => img.decode().catch(() => {}))),
    seek(time) {
      controls.time = time;
      return showFrame(time);
    },
  };
})();
