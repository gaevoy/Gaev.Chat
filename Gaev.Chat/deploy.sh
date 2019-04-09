#!/bin/bash
ssh root@app.gaevoy.com 'bash -s' <<'ENDSSH'
printf "Stopping service...\n"
systemctl stop GaevCryptoChat
printf "Service is "
systemctl is-active GaevCryptoChat
mkdir -p /apps/GaevCryptoChat
ENDSSH

printf "Uploading new version of service...\n"
rsync -v -a ./bin/Release/netcoreapp2.2/ubuntu.16.04-x64/publish/ root@app.gaevoy.com:/apps/GaevCryptoChat/

ssh root@app.gaevoy.com 'bash -s' <<'ENDSSH'
chmod 777 /apps/GaevCryptoChat/Gaev.Chat
if [[ ! -e /etc/systemd/system/GaevCryptoChat.service ]]; then
    printf "Installing service...\n"
    cat > /etc/systemd/system/GaevCryptoChat.service <<'EOF'
    [Unit]
    Description=GaevCryptoChat
    After=network.target
    
    [Service]
    WorkingDirectory=/apps/GaevCryptoChat
    ExecStart=/apps/GaevCryptoChat/Gaev.Chat
    Restart=always
    KillSignal=SIGINT
    
    [Install]
    WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable GaevCryptoChat
fi
printf "Starting service...\n"
systemctl start GaevCryptoChat
printf "Service is "
systemctl is-active GaevCryptoChat
ENDSSH