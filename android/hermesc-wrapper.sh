#!/bin/sh
# Wrapper to invoke hermesc even when it lacks execute permission (EAS build env)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HERMESC="$PROJECT_ROOT/node_modules/react-native/sdks/hermesc/linux64-bin/hermesc"

chmod +x "$HERMESC" 2>/dev/null

if [ -x "$HERMESC" ]; then
    exec "$HERMESC" "$@"
fi

# chmod failed — use ELF dynamic linker to run non-executable binary
for LOADER in /lib64/ld-linux-x86-64.so.2 /lib/x86_64-linux-gnu/ld-linux-x86-64.so.2; do
    if [ -f "$LOADER" ]; then
        exec "$LOADER" "$HERMESC" "$@"
    fi
done

echo "hermesc-wrapper: cannot execute hermesc" >&2
exit 1
