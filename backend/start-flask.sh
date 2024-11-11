#!/bin/bash
while true; do
    python3 backend/main.py
    sleep 1                      # Avoid CPU spikes
done