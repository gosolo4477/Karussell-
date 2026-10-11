(function () {
  const { animate } = window.Motion;

  // Takt: alle Einsätze liegen auf einem 120-BPM-Raster (1 Beat = 0,5 s)
  const BPM = 120;
  const BEAT = 60 / BPM;
  const SLIDE_W = 1080;

  const POP = [0.34, 1.56, 0.64, 1]; // überschwingend ("backOut")
  const SNAP = [0.85, 0, 0.15, 1]; // schneller Karussell-Wisch

  // Folien und ihre Länge in Beats
  const SLIDES = [
    { id: "s1", beats: 8 },
    { id: "s2", beats: 4 },
    { id: "s3", beats: 14 },
    { id: "s3b", beats: 12 },
    { id: "s4", beats: 4 },
    { id: "s5", beats: 8 },
    { id: "s6", beats: 8 },
  ];

  let beat = 0;
  for (const s of SLIDES) {
    s.start = beat;
    beat += s.beats;
  }
  const TOTAL_BEATS = beat;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
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
    const s = SLIDES[0];
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
    const s = SLIDES[1];
    const slide = $("#s2");
    $$(".hl > span", slide).forEach((el, k) => popIn(el, t(s.start + k * 0.5), { y: 200, scale: 0.4 }));
    const emoji = $("#s2-emoji");
    emojiIn(emoji, t(s.start + 1));
    wiggle(emoji, s.start + 2, s.start + s.beats, 14);
  }

  // 3a + 3b: Wirkstoffe -> Punkte im Bild, Chips, dann Wirkungs-Panel
  const ingredients = (s, panelAt) => {
    const slide = $("#" + s.id);
    const end = s.start + s.beats;
    $$(".hl > span", slide).forEach((el, k) => popIn(el, t(s.start + k * 0.5)));
    const card = $(".card", slide);
    cardIn(card, t(s.start + 1), 2);

    const spots = $$(".spot b", slide);
    const ripples = $$(".spot .ripple", slide);
    const ripple = (el, at) =>
      seq.push([el, { opacity: [0, 0.9, 0], scale: [1, 1, 2.4] }, { at, duration: 0.45, times: [0, 0.05, 1], ease: "easeOut" }]);

    // Chip und passender Punkt erscheinen gemeinsam, jeweils auf dem halben Beat
    const chips = $$(".chip", slide);
    chips.forEach((el, k) => {
      const b = s.start + 2 + k * 0.5;
      popIn(el, t(b), { y: 80, scale: 0.3 });
      seq.push([spots[k], { opacity: [0, 1], scale: [0, 1.3, 1] }, { at: t(b), duration: 0.35, ease: "easeOut" }]);
      ripple(ripples[k], t(b));
      for (let beat = Math.floor(b) + 1; beat < end; beat++) {
        seq.push([spots[k], { scale: [1, 1.25, 1] }, { at: t(beat), duration: 0.22, ease: "easeOut" }]);
        ripple(ripples[k], t(beat));
      }
    });

    // Pfeil hüpft im Takt Richtung Bild
    const arrow = $(".arrow", slide);
    seq.push([arrow, { opacity: [0, 1], scale: [0, 1] }, { at: t(s.start + 2), duration: 0.3, ease: POP }]);
    for (let beat = s.start + 3; beat < end; beat++) {
      seq.push([arrow, { y: [0, -26, 0] }, { at: t(beat), duration: 0.3, ease: "easeOut" }]);
    }

    // Chips machen Platz für das Wirkungs-Panel
    const pb = s.start + panelAt;
    chips.forEach((el, k) => {
      seq.push([el, { opacity: [1, 0], scale: [1, 0.7] }, { at: t(pb) - 0.25 + k * 0.03, duration: 0.2, ease: "easeIn" }]);
    });
    const panel = $(".panel", slide);
    seq.push([panel, { opacity: [0, 1], y: [160, 0], scale: [0.8, 1] }, { at: t(pb), duration: 0.45, ease: POP }]);
    const rows = $$(".p-head, .p-row", slide);
    rows.forEach((el, k) => {
      seq.push([el, { opacity: [0, 1], x: [-120, 0] }, { at: t(pb + k), duration: 0.35, ease: POP }]);
    });
    // Pfeile in den Zeilen stoßen auf jedem Beat nach rechts
    $$(".p-arrow", slide).forEach((el, k) => {
      for (let beat = pb + k + 2; beat < end; beat++) {
        seq.push([el, { x: [0, 16, 0] }, { at: t(beat), duration: 0.25, ease: "easeOut" }]);
      }
    });
    bumps(card, pb, end, 1.03);
  };

  ingredients(SLIDES[2], 6);
  ingredients(SLIDES[3], 4);

  // 4: Sin azúcar / Sin colorantes
  {
    const s = SLIDES[4];
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
    const s = SLIDES[5];
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

  // 6: CTA
  {
    const s = SLIDES[6];
    const slide = $("#s6");
    $$(".hl > span", slide).forEach((el, k) => popIn(el, t(s.start + k * 0.5)));
    popIn($("#s6-escribe"), t(s.start + 1));
    const box = $(".cta-box", slide);
    seq.push([box, { opacity: [0, 1], scale: [0, 1.15, 1], rotate: [-8, -2] }, { at: t(s.start + 2), duration: 0.5, ease: "easeOut" }]);
    bumps(box, s.start + 3, s.start + s.beats, 1.1);
    popIn($("#s6-sub"), t(s.start + 3), { y: 60, scale: 0.8 });
    const emoji = $("#s6-emoji");
    emojiIn(emoji, t(s.start + 3.5));
    bounce(emoji, s.start + 4, s.start + s.beats);
  }

  // --- Abspielen / Rendern ---------------------------------------------------
  const duration = t(TOTAL_BEATS);
  const render = new URLSearchParams(location.search).has("render");
  if (render) document.body.classList.add("render");

  const controls = animate(seq, { repeat: render ? 0 : Infinity });
  if (render) controls.pause();

  window.reel = {
    bpm: BPM,
    duration,
    slideStarts: SLIDES.slice(1).map((sl) => t(sl.start)),
    seek(time) {
      controls.time = time;
    },
  };
})();
