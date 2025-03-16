const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Endpoint pentru pagina principală
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Gestionarea încărcării fișierului și inițializarea sesiunii
app.post('/start-session', upload.single('creds'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No creds.json file uploaded!');
    }

    const credsPath = `${__dirname}/${req.file.path}`;

    try {
        const creds = JSON.parse(fs.readFileSync(credsPath));

        // Inițializează clientul pentru utilizator cu credențialele proprii
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: `user_${Date.now()}` }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            },
            session: creds // Folosește credențialele încărcate
        });

        client.on('qr', (qr) => {
            console.log('Scan QR code:', qr);
        });

        client.on('ready', () => {
            console.log('Client is ready!');
        });

        client.on('message', (msg) => {
            console.log(`Message received: ${msg.body}`);

            // Exemplu: trimite automat un răspuns
            if (msg.body === 'Hello') {
                client.sendMessage(msg.from, 'Hello! This is an automatic reply.');
            }
        });

        client.initialize();

        res.send('Session started! Check the terminal for the QR code.');
    } catch (err) {
        console.error('Error reading creds.json:', err);
        res.status(500).send('Failed to process creds.json file.');
    } finally {
        fs.unlinkSync(credsPath); // Șterge fișierul temporar
    }
});

// Pornește serverul
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
