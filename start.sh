#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Starting Postgres and Redis..."
echo user | sudo -S service postgresql start
echo user | sudo -S service redis-server start

echo "Starting Backend (Frappe)..."
cd /home/user/Flying_Class/backend/v16-bench
nohup bench start > bench.log 2>&1 &

echo "Starting Frontend (React)..."
nvm use 24
cd /home/user/Flying_Class/frontend
npm run dev
