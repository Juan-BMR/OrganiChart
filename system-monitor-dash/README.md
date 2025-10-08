# System Monitor Dash

A minimal live system monitoring dashboard built with Dash + Plotly.

## Quickstart

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The app runs at http://localhost:8050.

## Config

- `MAX_POINTS` (default 120): number of points retained per series
- `REFRESH_MS` (default 1000): update interval in milliseconds

## Production

```bash
gunicorn -w 2 -b 0.0.0.0:8050 app:server
```