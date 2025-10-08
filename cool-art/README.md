# Generative Kaleidoscope

A minimal static web app that renders a live kaleidoscope using the HTML5 Canvas 2D API.

## Run locally

Any static server will do. Two easy options:

- Python 3: `python3 -m http.server 5173`
- Node: `npx serve@latest -l 5173 --single`

Then open `http://localhost:5173`.

## Controls

- Symmetry: number of mirrored slices
- Speed: animation speed
- Palette: color scheme
- Pause/Play: toggle animation
- Snapshot: save current frame as PNG

## Notes

- Canvas auto-scales to device pixel ratio for crisp output.
- Rendering is purely client-side; no dependencies required.

License: MIT