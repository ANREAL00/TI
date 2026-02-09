const ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
const ALPHABET_MAP = {};
for (let i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET[i]] = i;
}

const cleanInput = (text) => {
    if (!text) return '';
    return String(text).toUpperCase().split('').filter(char => ALPHABET.includes(char)).join('');
};

const encryptVigenere = (text, key) => {
    const cleanedText = cleanInput(text);
    const cleanedKey = cleanInput(key);
    if (!cleanedKey) return cleanedText;

    let result = '';
    for (let i = 0; i < cleanedText.length; i++) {
        const pIdx = ALPHABET_MAP[cleanedText[i]];
        const kIdx = ALPHABET_MAP[cleanedKey[i % cleanedKey.length]];
        const cIdx = (pIdx + kIdx) % ALPHABET.length;
        result += ALPHABET[cIdx];
    }
    return result;
};

const decryptVigenere = (text, key) => {
    const cleanedText = cleanInput(text);
    const cleanedKey = cleanInput(key);
    if (!cleanedKey) return cleanedText;

    let result = '';
    for (let i = 0; i < cleanedText.length; i++) {
        const cIdx = ALPHABET_MAP[cleanedText[i]];
        const kIdx = ALPHABET_MAP[cleanedKey[i % cleanedKey.length]];
        const pIdx = (cIdx - kIdx + ALPHABET.length) % ALPHABET.length;
        result += ALPHABET[pIdx];
    }
    return result;
};

module.exports = { encryptVigenere, decryptVigenere };
