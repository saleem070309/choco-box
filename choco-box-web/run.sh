#!/bin/bash
# Choco Box — Local Development Server
# Run this script to start the website locally

cd "$(dirname "$0")"
echo "🍫 Choco Box — Starting local server..."
echo "📍 Open in browser: http://localhost:8090"
echo "🔧 Admin panel: http://localhost:8090/admin.html"
echo "   Password: choco2026"
echo ""
echo "Press Ctrl+C to stop the server"
python3 -m http.server 8090
