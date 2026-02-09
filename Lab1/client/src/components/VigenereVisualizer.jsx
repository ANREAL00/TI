import React from 'react';

const ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

const VigenereVisualizer = ({ keyStr, text }) => {
    const [step, setStep] = React.useState(0);
    const cleanedText = text.toUpperCase().split('').filter(char => ALPHABET.includes(char)).join('');
    const cleanedKey = keyStr.toUpperCase().split('').filter(char => ALPHABET.includes(char)).join('');

    if (!cleanedKey) return <p>Введите ключ для визуализации</p>;
    if (!cleanedText) return <p>В образце текста не найдено русских букв для демонстрации</p>;

    const steps = cleanedText.split('').map((char, i) => {
        const kChar = cleanedKey[i % cleanedKey.length];
        const pIdx = ALPHABET.indexOf(char);
        const kIdx = ALPHABET.indexOf(kChar);
        const cIdx = (pIdx + kIdx) % ALPHABET.length;
        return { char, kChar, pIdx, kIdx, cIdx, cChar: ALPHABET[cIdx] };
    });

    return (
        <div className="visualizer">
            <div className="visual-controls">
                <button className="step-btn" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Назад</button>
                <span>Символ {step + 1} из {steps.length}: <strong>{steps[step]?.char} → {steps[step]?.cChar}</strong></span>
                <button className="step-btn" onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1}>Вперед</button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <table className="vigenere-table">
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
                        <tr>
                            <th>#</th>
                            <th>Текст</th>
                            <th>Ключ</th>
                            <th>P (idx)</th>
                            <th>K (idx)</th>
                            <th>(P+K)%33</th>
                            <th>Шифр</th>
                        </tr>
                    </thead>
                    <tbody>
                        {steps.map((s, i) => (
                            <tr key={i} className={i === step ? 'active' : ''}>
                                <td>{i + 1}</td>
                                <td>{s.char}</td>
                                <td>{s.kChar}</td>
                                <td>{s.pIdx}</td>
                                <td>{s.kIdx}</td>
                                <td>{s.cIdx}</td>
                                <td style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{s.cChar}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VigenereVisualizer;
