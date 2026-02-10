const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { encryptFourSquare, decryptFourSquare } = require('./algorithms/fourSquare');
const { encryptVigenere, decryptVigenere } = require('./algorithms/vigenere');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.post('/api/encrypt', upload.single('file'), (req, res) => {
    const { algorithm, keys, text, type } = req.body;
    let input = text || '';

    if (req.file) {
        input = req.file.buffer.toString('utf-8');
    }

    if (!input) {
        return res.json({ result: '' });
    }

    try {
        let result = '';
        if (algorithm === 'fourSquare') {
            const keyArray = Array.isArray(keys) ? keys : [keys || ''];
            const paddedKeys = (keyArray.concat(['', '', '', ''])).slice(0, 4);
            result = type === 'encrypt'
                ? encryptFourSquare(input, paddedKeys)
                : decryptFourSquare(input, paddedKeys);
        } else if (algorithm === 'vigenere') {
            const vKey = Array.isArray(keys) ? (keys[0] || '') : (keys || '');
            result = type === 'encrypt'
                ? encryptVigenere(input, vKey)
                : decryptVigenere(input, vKey);
        }
        res.json({ result });
    } catch (err) {
        console.error('Processing error:', err);
        res.status(500).json({ error: err.message || 'Algorithm error' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
