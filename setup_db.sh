#!/bin/bash
# Start postgresql
echo user | sudo -S service postgresql start || echo user | sudo -S /etc/init.d/postgresql start

# Create Frappe superuser and databases
# We use IF NOT EXISTS equivalents or ignore errors if they exist.
echo user | sudo -S -u postgres psql -c "CREATE USER frappe WITH SUPERUSER CREATEDB CREATEROLE PASSWORD 'frappe123456';" || true
echo user | sudo -S -u postgres psql -c "CREATE DATABASE flying_class_db OWNER frappe ENCODING 'UTF8' TEMPLATE template0;" || true
echo user | sudo -S -u postgres psql -c "CREATE DATABASE flying_class_test OWNER frappe ENCODING 'UTF8' TEMPLATE template0;" || true
echo user | sudo -S -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE flying_class_db TO frappe;"
echo user | sudo -S -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE flying_class_test TO frappe;"
