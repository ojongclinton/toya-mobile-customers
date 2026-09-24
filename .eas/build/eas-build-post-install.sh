#!/bin/sh
# EAS Build post-install hook — runs after npm install, before Gradle
# Ensures hermesc binary is executable (EAS may install it without +x)
HERMESC="node_modules/react-native/sdks/hermesc/linux64-bin/hermesc"

if [ ! -f "$HERMESC" ]; then
    echo "[eas-hook] hermesc not found at $HERMESC, skipping"
    exit 0
fi

chmod +x "$HERMESC"
if [ $? -eq 0 ]; then
    echo "[eas-hook] hermesc chmod +x OK"
else
    echo "[eas-hook] chmod failed — trying stat to diagnose"
    ls -la "$HERMESC"
fi
