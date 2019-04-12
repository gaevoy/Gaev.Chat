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
            document.querySelector('.lobby').classList.add('hidden');
            window.history.pushState(null, null, '#room/' + window.encodeURI(room));
            onDone(room, nickname);
        }
    });
}

function joinChat(room, nickname) {
    let logs = document.querySelector(".chat .logs");
    let newMessage = document.querySelector('.chat .new-message');
    let chatApi = new ChatApi();
    document.querySelector('.chat .new-message-form').addEventListener('submit', evt => {
        evt.preventDefault();
        chatApi.sendMessage(room, {sender: nickname, text: newMessage.value});
        newMessage.value = '';
    });
    chatApi.listenToMessages(room,
        message => {
            renderMessage(message.sender, message.text);
        },
        () => chatApi.sendMessage(room, {sender: nickname + ' joined', text: '',}));
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