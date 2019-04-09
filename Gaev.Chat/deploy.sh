#!/bin/bash
ssh root@app.gaevoy.com 'bash -s' <<'ENDSSH'
printf "Stopping service...\n"
systemctl stop GaevChat
printf "Service is "
systemctl is-active GaevChat
mkdir -p /apps/GaevChat
ENDSSH

printf "Uploading new version of service...\n"
rsync -v -a ./bin/Release/netcoreapp2.2/ubuntu.16.04-x64/publish/ root@app.gaevoy.com:/apps/GaevChat/

ssh root@app.gaevoy.com 'bash -s' <<'ENDSSH'
chmod 777 /apps/GaevChat/Gaev.Chat
if [[ ! -e /etc/systemd/system/GaevChat.service ]]; then
    printf "Installing service...\n"
    cat > /etc/systemd/system/GaevChat.service <<'EOF'
    [Unit]
    Description=GaevChat
    After=network.target
    
    [Service]
    WorkingDirectory=/apps/GaevChat
    ExecStart=/apps/GaevChat/Gaev.Chat
    Restart=always
    KillSignal=SIGINT
    
    [Install]
    WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable GaevChat
fi
printf "Starting service...\n"
systemctl start GaevChat
printf "Service is "
systemctl is-active GaevChat
ENDSSH