# Karussell

Ein animiertes Karussell (Slider) mit der [Motion](https://motion.dev)-Bibliothek – ohne Build-Schritt.

## Starten

`index.html` einfach im Browser öffnen. Motion wird per CDN geladen (Internetverbindung nötig).

## Funktionen

- Federnde Übergänge (Spring-Animation via `animate()` von Motion)
- Pfeil-Buttons, Punkte-Navigation und Pfeiltasten
- Ziehen mit Maus/Finger inkl. Gummiband-Effekt an den Rändern und Wisch-Geschwindigkeit
- Autoplay, pausiert bei Hover oder Fokus
- Responsiv, Dark Mode, respektiert „Bewegung reduzieren“

## Anpassen

- **Folien:** in `index.html` die `<li class="carousel__slide">`-Elemente bearbeiten, hinzufügen oder entfernen (z. B. ein `<img>` hineinlegen).
- **Verhalten:** oben in `carousel.js` – `AUTOPLAY_MS` (0 = aus), `SPRING` (Federhärte/Dämpfung), Wisch-Schwellen.
- **Aussehen:** `style.css`.
