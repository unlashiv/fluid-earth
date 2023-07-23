#!/bin/bash

nohup pnpm run tera &
pid_tera="$!"

pnpm run build
pnpm run preview &
pid_preview="$!"

# If this script is killed, kill the `preview` and `tera` processes.
trap "kill $pid_preview $pid_tera 2> /dev/null" EXIT

# While copy is running...
while kill -0 $pid_preview 2> /dev/null; do
    # Do stuff
    sleep 1
done

echo "preview ended! Killing \'tera\' process too"
kill $pid_tera

# Disable the trap on a normal exit.
trap - EXIT
