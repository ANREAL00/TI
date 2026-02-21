const createMatrix = (key) => {
    const alphabet = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // J is omitted, treated as I
    let matrixString = '';
    const k = String(key || '');
    const cleanKey = k.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');

    for (let char of cleanKey) {
        if (!matrixString.includes(char)) {
            matrixString += char;
        }
    }

    for (let char of alphabet) {
        if (!matrixString.includes(char)) {
            matrixString += char;
        }
    }

    const matrix = [];
    for (let i = 0; i < 5; i++) {
        matrix.push(matrixString.slice(i * 5, i * 5 + 5).split(''));
    }
    return matrix;
};

const findPosition = (matrix, char) => {
    if (!matrix || !char) return null;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (matrix[r][c] === char) return { r, c };
        }
    }
    return null;
};

const encryptFourSquare = (text, keys) => {
    const matrices = (keys || []).map(k => createMatrix(k));
    let cleanText = String(text || '').toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    if (!cleanText) return "";

    let paddedText = '';
    for (let i = 0; i < cleanText.length; i++) {
        paddedText += cleanText[i];
        if (i < cleanText.length - 1 && cleanText[i] === cleanText[i + 1] && cleanText[i] !== 'X') {
            paddedText += 'X';
        } else if (i < cleanText.length - 1 && cleanText[i] === 'X' && cleanText[i + 1] === 'X') {
            paddedText += 'Q';
        }
    }

    if (paddedText.length % 2 !== 0) {
        paddedText += 'X';
    }

    let result = '';
    for (let i = 0; i < paddedText.length; i += 2) {
        const char1 = paddedText[i];
        const char2 = paddedText[i + 1];

        const pos1 = findPosition(matrices[0], char1);
        const pos2 = findPosition(matrices[3], char2);

        if (pos1 && pos2) {
            result += matrices[1][pos1.r][pos2.c];
            result += matrices[2][pos2.r][pos1.c];
        } else {
            result += char1 + char2;
        }
    }
    return result;
};

const decryptFourSquare = (text, keys) => {
    const matrices = (keys || []).map(k => createMatrix(k));
    let cleanText = String(text || '').toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    if (!cleanText) return "";

    let result = '';
    for (let i = 0; i < cleanText.length; i += 2) {
        const char1 = cleanText[i];
        const char2 = cleanText[i + 1];

        if (char2 === undefined) return result + char1;

        const pos1 = findPosition(matrices[1], char1);
        const pos2 = findPosition(matrices[2], char2);

        if (pos1 && pos2) {
            result += matrices[0][pos1.r][pos2.c];
            result += matrices[3][pos2.r][pos1.c];
        } else {
            result += char1;
        }
    }
    return result;
};

module.exports = { encryptFourSquare, decryptFourSquare, createMatrix };
