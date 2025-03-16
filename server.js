const express = require("express");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const Pino = require("pino");

const app = express();
const PORT = process.env.PORT || 3000;

let socket; // Pentru conexiunea WhatsApp

// Middleware-uri pentru Express
app.use(bodyParser.json());
app.use(fileUpload()); // Permite încărcarea fișierelor
app.use(express.static("public")); // Servește fișierele statice din folderul 'public'

// Endpoint pentru încărcarea fișierului creds.json
app.post("/upload-creds", async (req, res) => {
    if (!req.files || !req.files.creds) {
        return res.status(400).send("Vă rugăm să încărcați fișierul creds.json!");
    }

    const credsFile = req.files.creds;
    const credsPath = "./auth_info/creds.json";

    if (!fs.existsSync("./auth_info")) {
        fs.mkdirSync("./auth_info");
    }

    credsFile.mv(credsPath, async (err) => {
        if (err) {
            return res.status(500).send("A apărut o eroare la salvarea fișierului creds.json.");
        }

        try {
            await startWhatsApp(); // Inițializează conexiunea după încărcare
            res.send("Fișierul creds.json a fost încărcat și conexiunea WhatsApp a fost inițializată!");
        } catch (error) {
            console.error("Eroare la inițializarea WhatsApp:", error);
            res.status(500).send("A apărut o eroare la inițializarea WhatsApp.");
        }
    });
});

// Endpoint pentru trimiterea mesajelor
app.post("/send-message", async (req, res) => {
    const { targets, message, delay } = req.body;

    if (!targets || !message || !delay) {
        return res.status(400).send('Câmpurile "targets", "message" și "delay" sunt obligatorii!');
    }

    const targetArray = targets.split(",").map((target) => target.trim() + "@s.whatsapp.net");

    try {
        for (const target of targetArray) {
            await socket.sendMessage(target, { text: message });
            console.log(`Mesaj trimis către: ${target}`);
            await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }
        res.send("Mesaje trimise cu succes!");
    } catch (error) {
        console.error("Eroare la trimiterea mesajelor:", error);
        res.status(500).send("A apărut o eroare la trimiterea mesajelor.");
    }
});

// Inițializarea conexiunii WhatsApp
const startWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

    socket = makeWASocket({
        auth: state,
        logger: Pino({ level: "silent" }),
    });

    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", (update) => {
        const { connection } = update;

        if (connection === "open") {
            console.log("Conectat la WhatsApp!");
        } else if (connection === "close") {
            console.error("Conexiunea s-a închis.");
        }
    });
};

// Pornește serverul
app.listen(PORT, () => {
    console.log(`Serverul rulează la http://localhost:${PORT}`);
});
