const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

let client;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.post('/start-session', upload.single('creds'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No creds.json file uploaded!');
    }

    client = new Client({
        authStrategy: new LocalAuth({ clientId: "whatsapp-session" })
    });

    client.on('qr', qr => {
        console.log('Scan QR code:', qr);
    });

    client.on('ready', () => {
        console.log('Client is ready!');
    });

    client.initialize();
    res.send('Session started! Scan the QR code in terminal.');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});