#!/bin/bash

# Configuration
INTERVAL=60 # Seconds
PROJECT_DIR="/home/msharma/yajur_ai"
LOG_FILE="$PROJECT_DIR/sync_log.txt"

cd "$PROJECT_DIR"

echo "[$(date)] Auto-sync script started." | tee -a "$LOG_FILE"

while true; do
  # Check for changes (untracked or modified files)
  if [[ -n $(git status --porcelain) ]]; then
    echo "[$(date)] Changes detected. Synchronizing..." | tee -a "$LOG_FILE"
    
    # Git operations
    git add .
    git commit -m "Auto-sync: $(date)"
    git push origin main
    
    if [ $? -eq 0 ]; then
      echo "[$(date)] Successfully synchronized." | tee -a "$LOG_FILE"
    else
      echo "[$(date)] Synchronization failed. Check Git configuration." | tee -a "$LOG_FILE"
    fi
  fi
  
  sleep $INTERVAL
done
