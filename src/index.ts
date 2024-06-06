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
}

const users: User[] = [];

app.get('/', (req, res) => {
    res.send('Server is running lol ');
});

wss.on('connection', (ws) => {
    let userId: string;
    let userInterest: string;

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message.toString());

        if (parsedMessage.type === 'register') {
            userId = parsedMessage.id;
            userInterest = parsedMessage.interest;
            users.push({ id: userId, interest: userInterest, ws });

           
            const match = users.find(user => user.interest === userInterest && user.id !== userId);

            if (match) {
                ws.send(JSON.stringify({ type: 'match', id: match.id }));
                match.ws.send(JSON.stringify({ type: 'match', id: userId }));
            }
        } else if (parsedMessage.type === 'message') {
            const { to, text } = parsedMessage;
            const recipient = users.find(user => user.id === to);

            if (recipient) {
                recipient.ws.send(JSON.stringify({ type: 'message', from: userId, text }));
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

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
