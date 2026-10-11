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

## Reel: NoCarb-T „DISFRUTA“ (`reel/`)

Animiertes Instagram-Reel im Karussell-Stil (1080×1920, 30 fps, 20 s), gebaut mit Motion und getaktet auf 120 BPM.

- `reel/index.html` + `reel/reel.js`: Folien und Animation (im Browser öffnen = Live-Vorschau in Endlosschleife)
- `reel/render.mjs`: rendert Bild für Bild zu `reel/out/reel-beat.mp4` (mit Beat) und `reel/out/reel-stumm.mp4`
- `reel/beat.py`: erzeugt die 120-BPM-Beat-Spur

Bilder gehören nach `reel/assets/` (`pizza.jpg`, `wirkstoffe.jpg`, `frau.jpg`), sie sind nicht im Repo.

```bash
cd reel && npm install && npm run render
```
