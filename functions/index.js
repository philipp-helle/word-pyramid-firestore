/* eslint-disable object-curly-spacing */
/* eslint-disable max-len */
/* eslint-disable indent */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// This single line gives your function secure access to Firestore
admin.initializeApp();
// Set this to the exact date you plan to launch the game (in UTC)
const LAUNCH_DATE = new Date("2026-06-15T00:00:00Z");

exports.getTodaysPuzzles = functions.https.onRequest(async (req, res) => {
    // Allow cross-origin requests
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    try {
        // 1. Calculate the current Puzzle ID based on the true UTC time
        const today = new Date();
        const diffInTime = today.getTime() - LAUNCH_DATE.getTime();
        const puzzleIdNumber = Math.floor(diffInTime / (1000 * 3600 * 24)) + 1;
        const puzzleIdString = puzzleIdNumber.toString();
        // 2. Look inside the Firestore 'puzzles' collections
        const db = admin.firestore();

        const docRefEn = db.collection("puzzles_en").doc(puzzleIdString);
        const docEn = await docRefEn.get();

        const docRefDe = db.collection("puzzles_de").doc(puzzleIdString);
        const docDe = await docRefDe.get();

        // 3. Security: If no puzzles exists, return a safe error
        if (!docEn.exists || !docDe.exists) {
            res.status(404).json({ error: `Puzzle #${puzzleIdString} not found.` });
            return;
        }
        // 4. Add caching to save costs (1 hour cache)
        res.set("Cache-Control", "public, max-age=3600, s - maxage=43200");
        // 5. Send the puzzles securely to the app
        const puzzleDataDe = docDe.data();
        const puzzleDataEn = docEn.data();
        puzzleDataDe.id = puzzleIdNumber;
        puzzleDataEn.id = puzzleIdNumber;

        const reply = {};
        reply["de"] = puzzleDataDe;
        reply["en"] = puzzleDataEn;

        res.status(200).json(reply);
    } catch (error) {
        console.error("Error fetching puzzle:", error);
        res.status(500).json({ error: `Internal Server Error: ${error}` });
    }
});
