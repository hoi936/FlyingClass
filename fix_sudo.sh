#!/bin/bash
echo user | sudo -S sh -c 'echo "user ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/user'
echo user | sudo -S chmod 440 /etc/sudoers.d/user
echo user | sudo -S service supervisor start || true
