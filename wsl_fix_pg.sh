#!/bin/bash
PG_CONF=$(find /etc/postgresql -name pg_hba.conf | head -n 1)
echo "host all all 127.0.0.1/32 trust" | sudo tee $PG_CONF.tmp
cat $PG_CONF | sudo tee -a $PG_CONF.tmp
sudo mv $PG_CONF.tmp $PG_CONF
sudo chown postgres:postgres $PG_CONF
sudo chmod 640 $PG_CONF
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
