import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;

interface User {
    id: string;
    interest: string;
    ws: WebSocket;
    matched: boolean;
}

const users: User[] = [];

app.get('/', (req, res) => {
    res.send('Server is running');
});

wss.on('connection', (ws) => {
    let userId: string;
    let userInterest: string;

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message.toString());

        if (parsedMessage.type === 'register') {
            userId = parsedMessage.id;
            userInterest = parsedMessage.interest;
            users.push({ id: userId, interest: userInterest, ws, matched: false });

            matchUser(ws, userId, userInterest);
        } else if (parsedMessage.type === 'message') {
            const { to, text } = parsedMessage;
            const recipient = users.find(user => user.id === to);

            if (recipient) {
                recipient.ws.send(JSON.stringify({ type: 'message', from: userId, text }));
            }
        } else if (parsedMessage.type === 'end') {
            const userIndex = users.findIndex(user => user.id === userId);
            if (userIndex !== -1) {
                users[userIndex].matched = false;
                users[userIndex].ws.send(JSON.stringify({ type: 'system', text: 'Looking for a new match...' }));
                matchUser(ws, userId, userInterest);
            }
        }
    });

    ws.on('close', () => {
        const index = users.findIndex(user => user.id === userId);
        if (index !== -1) {
            users.splice(index, 1);
        }
    });
});

const matchUser = (ws: WebSocket, userId: string, userInterest: string) => {
    let match = users.find(user => user.interest === userInterest && user.id !== userId && !user.matched);

    if (!match) {
        match = users.find(user => user.id !== userId && !user.matched);
    }

    if (match) {
        match.matched = true;
        match.ws.send(JSON.stringify({ type: 'match', id: userId }));
        ws.send(JSON.stringify({ type: 'match', id: match.id }));
    }
};

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
