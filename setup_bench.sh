#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm use 24
export PATH=$PATH:~/.local/bin

mkdir -p /home/user/Flying_Class/backend
cd /home/user/Flying_Class/backend

# Clean up broken bench if it doesn't have apps.txt
if [ -d "v16-bench" ] && [ ! -f "v16-bench/sites/apps.txt" ]; then
    echo "Found broken bench installation. Removing..."
    rm -rf v16-bench
fi

if [ ! -d "v16-bench" ]; then
    echo "Initializing Frappe Bench v16..."
    bench init v16-bench --frappe-branch version-16 --python python3
else
    echo "v16-bench already exists."
fi

cd v16-bench

export PGPASSWORD='frappe123456'

if [ ! -d "sites/flyingclass.localhost" ]; then
    echo "Creating new site flyingclass.localhost..."
    bench new-site flyingclass.localhost \
        --db-type postgres \
        --db-root-username frappe \
        --db-root-password frappe123456 \
        --admin-password admin123456
else
    echo "Site flyingclass.localhost already exists."
fi

echo "Configuring site..."
bench --site flyingclass.localhost enable-scheduler
bench set-config -g developer_mode 1
echo "flyingclass.localhost" > sites/currentsite.txt
bench --site flyingclass.localhost clear-cache
