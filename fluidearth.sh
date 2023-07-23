#!/bin/bash

# Define the commands to run in each pane
tera_="pnpm run tera"
preview_="pnpm run build && sleep 10 && pnpm run preview"
tmux new-session -d -s fluidearth "$tera_"
tmux split-window -v -t fluidearth:0 "$preview_"
tmux swap-pane -U
tmux attach-session -t fluidearth
