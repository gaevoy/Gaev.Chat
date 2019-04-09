#!/bin/bash
ssh root@app.gaevoy.com 'bash -s' <<'ENDSSH'
systemctl stop GaevCryptoChat
systemctl disable GaevCryptoChat 
rm /etc/systemd/system/GaevCryptoChat.service 
systemctl daemon-reload
systemctl reset-failed
rm -rf /apps/GaevCryptoChat
ENDSSH