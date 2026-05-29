#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 24
export PATH=$PATH:~/.local/bin
cd /home/user/Flying_Class/backend/v16-bench

# The previous app creation might have left a partial folder
rm -rf apps/flying_class

echo -e "Flying Class\nSchool Management System\nYour Organization\nadmin@yourorg.com\nmit\nN\n" | bench new-app flying_class
bench --site flyingclass.localhost install-app flying_class
