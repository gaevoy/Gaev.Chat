#!/bin/bash
ssh root@app.gaevoy.com 'bash -s' <<'ENDSSH'
systemctl stop GaevChat
systemctl disable GaevChat 
rm /etc/systemd/system/GaevChat.service 
systemctl daemon-reload
systemctl reset-failed
rm -rf /apps/GaevChat
ENDSSH