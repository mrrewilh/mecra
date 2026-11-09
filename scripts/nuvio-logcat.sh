#!/usr/bin/env sh
# Real Nuvio plugin logs from an attached Android device.
# Usage: ./scripts/nuvio-logcat.sh
adb logcat -v time | grep -E 'PluginRuntime|PluginManager|StreamRepository|Plugin:'
