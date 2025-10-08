import os
import psutil
import datetime as dt
from collections import deque

import plotly.graph_objects as go
from dash import Dash, dcc, html, Input, Output


def create_time_series_figure(times, values, title, yaxis_title):
    fig = go.Figure(
        data=[go.Scatter(x=list(times), y=list(values), mode="lines", line=dict(color="#4f46e5", width=2))],
        layout=go.Layout(
            title=dict(text=title, x=0.02, xanchor="left"),
            margin=dict(l=40, r=20, t=40, b=40),
            template="plotly_white",
        ),
    )
    fig.update_yaxes(title_text=yaxis_title, rangemode="tozero")
    fig.update_xaxes(title_text="Time")
    return fig


def get_system_metrics():
    cpu_percent = psutil.cpu_percent(interval=None)
    virtual_mem = psutil.virtual_memory()
    mem_percent = virtual_mem.percent
    disk = psutil.disk_usage("/")
    disk_percent = disk.percent
    net = psutil.net_io_counters()
    return {
        "cpu_percent": cpu_percent,
        "mem_percent": mem_percent,
        "disk_percent": disk_percent,
        "bytes_sent": net.bytes_sent,
        "bytes_recv": net.bytes_recv,
    }


MAX_POINTS = int(os.environ.get("MAX_POINTS", "120"))
REFRESH_MS = int(os.environ.get("REFRESH_MS", "1000"))

times = deque(maxlen=MAX_POINTS)
cpu_values = deque(maxlen=MAX_POINTS)
mem_values = deque(maxlen=MAX_POINTS)
disk_values = deque(maxlen=MAX_POINTS)
net_sent_values = deque(maxlen=MAX_POINTS)
net_recv_values = deque(maxlen=MAX_POINTS)

app = Dash(__name__)
server = app.server

app.title = "System Monitor"

app.layout = html.Div(
    style={"fontFamily": "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif", "padding": "16px"},
    children=[
        html.Div(
            style={"display": "flex", "alignItems": "center", "gap": "12px", "marginBottom": "12px"},
            children=[
                html.Img(src="https://fav.farm/⚡", style={"width": "28px", "height": "28px"}),
                html.H2("Live System Monitor", style={"margin": 0}),
                html.Div(id="uptime", style={"marginLeft": "auto", "opacity": 0.8}),
            ],
        ),
        html.Div(
            style={"display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(320px, 1fr))", "gap": "16px"},
            children=[
                html.Div([
                    dcc.Graph(id="cpu-graph", config={"displayModeBar": False}),
                ], style={"border": "1px solid #e5e7eb", "borderRadius": "12px", "padding": "8px", "boxShadow": "0 1px 2px rgba(0,0,0,0.04)"}),
                html.Div([
                    dcc.Graph(id="mem-graph", config={"displayModeBar": False}),
                ], style={"border": "1px solid #e5e7eb", "borderRadius": "12px", "padding": "8px", "boxShadow": "0 1px 2px rgba(0,0,0,0.04)"}),
                html.Div([
                    dcc.Graph(id="disk-graph", config={"displayModeBar": False}),
                ], style={"border": "1px solid #e5e7eb", "borderRadius": "12px", "padding": "8px", "boxShadow": "0 1px 2px rgba(0,0,0,0.04)"}),
                html.Div([
                    dcc.Graph(id="net-graph", config={"displayModeBar": False}),
                ], style={"border": "1px solid #e5e7eb", "borderRadius": "12px", "padding": "8px", "boxShadow": "0 1px 2px rgba(0,0,0,0.04)"}),
            ],
        ),
        dcc.Interval(id="interval", interval=REFRESH_MS, n_intervals=0),
    ],
)


@app.callback(
    Output("cpu-graph", "figure"),
    Output("mem-graph", "figure"),
    Output("disk-graph", "figure"),
    Output("net-graph", "figure"),
    Output("uptime", "children"),
    Input("interval", "n_intervals"),
)
def update_metrics(_):
    now = dt.datetime.now()
    metrics = get_system_metrics()

    times.append(now)
    cpu_values.append(metrics["cpu_percent"])
    mem_values.append(metrics["mem_percent"])
    disk_values.append(metrics["disk_percent"])

    # Network: convert to MB and show deltas per second
    net_sent_values.append(metrics["bytes_sent"] / (1024 * 1024))
    net_recv_values.append(metrics["bytes_recv"] / (1024 * 1024))

    cpu_fig = create_time_series_figure(times, cpu_values, "CPU Usage %", "CPU %")
    cpu_fig.update_yaxes(range=[0, 100])

    mem_fig = create_time_series_figure(times, mem_values, "Memory Usage %", "Memory %")
    mem_fig.update_yaxes(range=[0, 100])

    disk_fig = create_time_series_figure(times, disk_values, "Disk Usage %", "Disk %")
    disk_fig.update_yaxes(range=[0, 100])

    # Network stacked area
    net_fig = go.Figure(
        data=[
            go.Scatter(x=list(times), y=list(net_sent_values), mode="lines", name="Sent MB", stackgroup="one", line=dict(width=0.5)),
            go.Scatter(x=list(times), y=list(net_recv_values), mode="lines", name="Recv MB", stackgroup="one", line=dict(width=0.5)),
        ],
        layout=go.Layout(title=dict(text="Network Traffic (MB total)", x=0.02, xanchor="left"), template="plotly_white", margin=dict(l=40, r=20, t=40, b=40)),
    )
    net_fig.update_yaxes(title_text="MB")

    uptime_seconds = int(psutil.boot_time())
    up_for = dt.datetime.now() - dt.datetime.fromtimestamp(uptime_seconds)
    uptime_str = f"Uptime: {str(up_for).split('.')[0]}"

    return cpu_fig, mem_fig, disk_fig, net_fig, uptime_str


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8050"))
    app.run_server(host="0.0.0.0", port=port, debug=False)

