#!/bin/bash
PG_CONF=$(find /etc/postgresql -name pg_hba.conf)
sudo sed -i 's/peer/md5/g' $PG_CONF
sudo sed -i 's/scram-sha-256/md5/g' $PG_CONF
sudo service postgresql restart

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm use 24
export PATH=$PATH:~/.local/bin

cd /home/user/Flying_Class/backend/v16-bench

export PGPASSWORD='frappe123456'

bench drop-site flyingclass.localhost --root-login frappe --root-password frappe123456 --force || true

bench new-site flyingclass.localhost \
    --db-type postgres \
    --db-root-username frappe \
    --db-root-password frappe123456 \
    --admin-password admin123456

bench --site flyingclass.localhost enable-scheduler
bench set-config -g developer_mode 1
echo "flyingclass.localhost" > sites/currentsite.txt
bench --site flyingclass.localhost clear-cache
