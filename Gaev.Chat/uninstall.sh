#!/bin/bash
ssh root@192.168.2.4 'bash -s' <<'ENDSSH'
systemctl stop GaevChat
systemctl disable GaevChat 
rm /etc/systemd/system/GaevChat.service 
systemctl daemon-reload
systemctl reset-failed
rm -rf /apps/GaevChat
ENDSSH