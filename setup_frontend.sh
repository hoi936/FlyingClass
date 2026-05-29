#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 24

cd /home/user/Flying_Class

echo "Creating Vite Frontend..."
npx -y create-vite@latest frontend --template react-ts
cd frontend

echo "Installing dependencies..."
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install axios react-router-dom zustand @tanstack/react-query @heroicons/react
