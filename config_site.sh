#!/bin/bash
cd /home/user/Flying_Class/backend/v16-bench

# Phase 5: Redis & Cache Config
echo user | sudo -S service redis-server start || true

cat << 'EOF' > update_site_config.py
import json

with open("sites/flyingclass.localhost/site_config.json", "r") as f:
    config = json.load(f)

config["redis_cache"] = "redis://localhost:6379/1"
config["redis_queue"] = "redis://localhost:6379/2"
config["redis_socketio"] = "redis://localhost:6379/3"

# Phase 5 & 6
config["google_map_key"] = ""
config["use_openstreetmap"] = True
config["mapbox_token"] = ""
config["cors"] = [
    {
        "allow_credentials": True,
        "allow_headers": ["Content-Type", "Authorization"],
        "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_origins": [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://flyingclass.localhost:3000"
        ],
        "expose_headers": ["Content-Range", "X-Content-Range"],
        "max_age": 86400
    }
]

with open("sites/flyingclass.localhost/site_config.json", "w") as f:
    json.dump(config, f, indent=4)
EOF

python3 update_site_config.py
rm update_site_config.py
