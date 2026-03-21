#!/bin/bash
# Choco Box Startup Script

echo "Starting Choco Box Web Application..."

# Go to API directory
cd "$(dirname "$0")/api"

# Try to activate virtual environment if it exists
if [ -f "/run/media/saleem/New Volume/AI_Models/my_ai_env/bin/activate" ]; then
    source "/run/media/saleem/New Volume/AI_Models/my_ai_env/bin/activate"
fi

# Seed the database
python3 seed_db.py

# Start the server
python3 main.py
