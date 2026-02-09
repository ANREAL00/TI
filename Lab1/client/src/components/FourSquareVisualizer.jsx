import React from 'react';

const createMatrix = (key) => {
    const alphabet = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
    let matrixString = '';
    const cleanKey = key.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    for (let char of cleanKey) if (!matrixString.includes(char)) matrixString += char;
    for (let char of alphabet) if (!matrixString.includes(char)) matrixString += char;
    const matrix = [];
    for (let i = 0; i < 5; i++) matrix.push(matrixString.slice(i * 5, i * 5 + 5).split(''));
    return matrix;
};

const findPosition = (matrix, char) => {
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (matrix[r][c] === char) return { r, c };
        }
    }
    return null;
};

const FourSquareVisualizer = ({ keys, text, result }) => {
    const [step, setStep] = React.useState(0);
    const matrices = keys.map(k => createMatrix(k || ''));
    const cleanText = text.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');

    // Split text into pairs
    const pairs = [];
    for (let i = 0; i < cleanText.length; i += 2) {
        pairs.push(cleanText.slice(i, i + 2).padEnd(2, 'X'));
    }

    const currentPair = pairs[step] || ['?', '?'];
    const pos1 = findPosition(matrices[0], currentPair[0]);
    const pos2 = findPosition(matrices[3], currentPair[1]);

    const c1Pos = pos1 && pos2 ? { r: pos1.r, c: pos2.c } : null;
    const c2Pos = pos1 && pos2 ? { r: pos2.r, c: pos1.c } : null;

    const renderGrid = (matrix, gridIdx, highlightPos, highlightType) => (
        <div key={gridIdx} className="cipher-grid-wrapper">
            <h4 style={{ textAlign: 'center', marginBottom: '5px' }}>Грид {gridIdx + 1}</h4>
            <div className="cipher-grid">
                {matrix.map((row, r) => row.map((char, c) => {
                    let className = 'grid-cell';
                    if (highlightPos && highlightPos.r === r && highlightPos.c === c) {
                        className += ` highlight-${highlightType}`;
                    }
                    return <div key={`${r}-${c}`} className={className}>{char === 'I' ? 'I/J' : char}</div>;
                }))}
            </div>
        </div>
    );

    if (pairs.length === 0) return <p>Введите текст для визуализации</p>;

    return (
        <div className="visualizer">
            <div className="visual-controls">
                <button className="step-btn" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Назад</button>
                <span>Пара {step + 1} из {pairs.length}: <strong>{currentPair[0]} + {currentPair[1]}</strong></span>
                <button className="step-btn" onClick={() => setStep(s => Math.min(pairs.length - 1, s + 1))} disabled={step === pairs.length - 1}>Вперед</button>
            </div>
            <div className="foursquare-grid-container">
                {renderGrid(matrices[0], 0, pos1, 'p')}
                {renderGrid(matrices[1], 1, c1Pos, 'c')}
                {renderGrid(matrices[2], 2, c2Pos, 'c')}
                {renderGrid(matrices[3], 3, pos2, 'p')}
            </div>
            <div style={{ marginTop: '1.5rem', fontSize: '0.95rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}><span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>■</span> Исходные буквы: {currentPair[0]} (в Грид 1) и {currentPair[1]} (в Грид 4)</p>
                <p style={{ margin: 0 }}><span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>■</span> Результат: {matrices[1][c1Pos?.r][c1Pos?.c]} (Грид 2) + {matrices[2][c2Pos?.r][c2Pos?.c]} (Грид 3)</p>
            </div>
        </div>
    );
};

export default FourSquareVisualizer;
