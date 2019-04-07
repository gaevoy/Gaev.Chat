function enterChat(onDone) {
    let room = window.location.hash.startsWith('#room/')
        ? window.decodeURI(window.location.hash.substr(6))
        : (10000 + Math.random() * 10000).toFixed(0).substr(1);
    let nickname = 'Anonymous' + (Math.random() * 100).toFixed(0);
    let roomInput = document.querySelector('.lobby .room');
    let nicknameInput = document.querySelector('.lobby .nickname');
    roomInput.value = room;
    nicknameInput.value = nickname;
    roomInput.select();
    document.querySelector('.lobby .join-form').addEventListener('submit', evt => {
        evt.preventDefault();
        room = roomInput.value;
        nickname = nicknameInput.value;
        if (room.length && nickname.length) {
            document.querySelector('.lobby .join-form').innerText = 'Generating cryptographic key...';
            PgpKey.generate(nickname, myKey => {
                document.querySelector('.lobby').classList.add('hidden');
                window.history.pushState(null, null, '#room/' + window.encodeURI(room));
                onDone(room, nickname, myKey);
            });
        }
    });
}

function joinChat(room, nickname, myKey) {
    let logs = document.querySelector(".chat .logs");
    let newMessage = document.querySelector('.chat .new-message');
    let chatApi = new ChatApi();
    let keys = {};
    document.querySelector('.chat .new-message-form').addEventListener('submit', evt => {
        evt.preventDefault();
        Object.keys(keys).forEach(keyId =>
            keys[keyId].encrypt(newMessage.value, cipher =>
                chatApi.sendMessage(room, {sender: myKey.id(), recipient: keyId, text: cipher})));
        newMessage.value = '';
    });
    chatApi.listenToMessages(room,
        message => {
            let sender = keys[message.sender];
            let recipient = message.recipient && keys[message.recipient];
            if (message.publicKey) {
                if (sender) return;
                PgpKey.load(message.publicKey, key => {
                    let isMyKey = myKey.id() === key.id();
                    keys[key.id()] = isMyKey ? myKey : key;
                    renderMessage(key.nickname() + ' joined', '');
                    if (!isMyKey)
                        chatApi.sendMessage(room, {sender: myKey.id(), publicKey: myKey.public()});
                });
            } else if (sender && recipient && recipient.canDecrypt()) {
                recipient.decrypt(message.text, text =>
                    renderMessage(sender.nickname(), text));
            }
        },
        () => chatApi.sendMessage(room, {sender: myKey.id(), publicKey: myKey.public()}));
    document.querySelector('.chat').classList.remove('hidden');
    newMessage.select();

    function renderMessage(from, message) {
        let messageEl = createElement('message', message);
        messageEl.prepend(createElement('from', from));
        logs.append(messageEl);
        logs.scrollTop = logs.scrollHeight; // scroll to bottom
    }
}

function createElement(className, text) {
    let el = document.createElement('div');
    el.classList.add(className);
    el.innerText = text || '';
    return el;
}

class ChatApi {
    listenToMessages(room, onMessageReceived, onConnected) {
        let source = new EventSource('api/rooms/' + room);
        source.addEventListener('connected', () => onConnected());
        source.addEventListener('message', evt => {
            let message = JSON.parse(evt.data);
            console.log('Message received', message);
            onMessageReceived(message);
        });
    }

    sendMessage(room, message) {
        let req = new XMLHttpRequest();
        req.open('POST', 'api/rooms/' + room + '/messages/');
        req.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
        req.send(JSON.stringify(JSON.stringify(message)));
        console.log('Message sent', message);
    }
}

class PgpKey {
    constructor(key) {
        this._key = key;
        if (this.canDecrypt()) {
            this._ring = new kbpgp.keyring.KeyRing();
            this._ring.add_key_manager(key);
        }
    }

    public() {
        return this._key.armored_pgp_public;
    }

    id() {
        return this._key.get_pgp_short_key_id();
    }

    nickname() {
        return this._key.userids[0].get_username();
    }

    encrypt(text, onDone) {
        kbpgp.box({msg: text, encrypt_for: this._key}, (_, cipher) =>
            onDone(cipher));
    }

    canDecrypt() {
        return this._key.can_decrypt();
    }

    decrypt(cipher, onDone) {
        kbpgp.unbox({keyfetch: this._ring, armored: cipher, progress_hook: null}, (_, literals) =>
            onDone(literals[0].toString()));
    }

    static generate(nickname, onDone) {
        let opt = {userid: nickname, primary: {nbits: 1024}, subkeys: []};
        kbpgp.KeyManager.generate(opt, (_, key) =>
            key.sign({}, () =>
                key.export_pgp_public({}, () =>
                    onDone(new PgpKey(key)))));
    }

    static load(publicKey, onDone) {
        kbpgp.KeyManager.import_from_armored_pgp({armored: publicKey}, (_, key) =>
            onDone(new PgpKey(key)));
    }
}