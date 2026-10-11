(function () {
  const { animate, motionValue } = window.Motion;

  // Einstellungen
  const AUTOPLAY_MS = 5000;
  const SPRING = { type: "spring", stiffness: 260, damping: 32 };
  const SWIPE_DISTANCE = 0.2; // Anteil der Breite, ab dem ein Ziehen die Folie wechselt
  const SWIPE_VELOCITY = 500; // px/s, ab der ein schnelles Wischen wechselt

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".carousel").forEach(setupCarousel);

  function setupCarousel(root) {
    const viewport = root.querySelector(".carousel__viewport");
    const track = root.querySelector(".carousel__track");
    const slides = Array.from(track.children);
    const prevBtn = root.querySelector(".carousel__btn--prev");
    const nextBtn = root.querySelector(".carousel__btn--next");
    const dotsWrap = root.querySelector(".carousel__dots");

    const x = motionValue(0);
    x.on("change", (v) => (track.style.transform = `translateX(${v}px)`));

    let index = 0;
    let timer = null;

    const width = () => viewport.clientWidth;

    const dots = slides.map((slide, i) => {
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", `${i + 1} von ${slides.length}`);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", `Folie ${i + 1}`);
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    function goTo(i, { velocity = 0 } = {}) {
      const prev = index;
      index = (i + slides.length) % slides.length;

      animate(x, -index * width(), reduceMotion ? { duration: 0 } : { ...SPRING, velocity });
      updateUi();

      if (index !== prev && !reduceMotion) {
        const card = slides[index].querySelector(".slide__card");
        if (card) {
          animate(card, { opacity: [0, 1], y: [24, 0], scale: [0.96, 1] }, { duration: 0.5, delay: 0.1, ease: "easeOut" });
        }
      }
      restartAutoplay();
    }

    function updateUi() {
      dots.forEach((dot, i) => dot.setAttribute("aria-selected", String(i === index)));
      slides.forEach((slide, i) => slide.setAttribute("aria-hidden", String(i !== index)));
    }

    // Buttons & Tastatur
    prevBtn.addEventListener("click", () => goTo(index - 1));
    nextBtn.addEventListener("click", () => goTo(index + 1));
    root.tabIndex = 0;
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    });

    // Ziehen / Wischen
    let dragStartX = 0;
    let dragStartValue = 0;
    let dragging = false;

    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      dragStartX = e.clientX;
      dragStartValue = x.get();
      x.stop();
      stopAutoplay();
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      let next = dragStartValue + (e.clientX - dragStartX);
      // Gummiband-Effekt an den Rändern
      const min = -(slides.length - 1) * width();
      if (next > 0) next *= 0.35;
      if (next < min) next = min + (next - min) * 0.35;
      x.set(next);
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove("is-dragging");
      if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);

      const offset = e.clientX - dragStartX;
      const velocity = x.getVelocity();
      let target = index;
      if (offset < -width() * SWIPE_DISTANCE || velocity < -SWIPE_VELOCITY) target = index + 1;
      else if (offset > width() * SWIPE_DISTANCE || velocity > SWIPE_VELOCITY) target = index - 1;
      target = Math.max(0, Math.min(slides.length - 1, target));
      goTo(target, { velocity });
    };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    // Autoplay (pausiert bei Hover/Fokus)
    function stopAutoplay() {
      clearInterval(timer);
      timer = null;
    }
    function restartAutoplay() {
      stopAutoplay();
      if (AUTOPLAY_MS > 0 && !reduceMotion && !root.matches(":hover, :focus-within")) {
        timer = setInterval(() => goTo(index + 1), AUTOPLAY_MS);
      }
    }
    root.addEventListener("mouseenter", stopAutoplay);
    root.addEventListener("mouseleave", restartAutoplay);
    root.addEventListener("focusin", stopAutoplay);
    root.addEventListener("focusout", restartAutoplay);

    // Bei Größenänderung ohne Animation auf die aktuelle Folie springen
    new ResizeObserver(() => x.jump(-index * width())).observe(viewport);

    updateUi();
    restartAutoplay();
  }
})();
