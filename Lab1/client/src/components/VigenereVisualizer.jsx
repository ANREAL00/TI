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

    const currentStep = steps[step];

    const renderRecta = () => {
        const alphaArr = ALPHABET.split('');
        return (
            <div className="vigenere-recta-container">
                <table className="recta-table">
                    <thead>
                        <tr>
                            <th className="corner"></th>
                            {alphaArr.map((c, i) => (
                                <th key={i} className={currentStep?.pIdx === i ? 'highlight-active' : ''}>
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {alphaArr.map((rowChar, rIdx) => (
                            <tr key={rIdx} className={currentStep?.kIdx === rIdx ? 'highlight-row' : ''}>
                                <th className={currentStep?.kIdx === rIdx ? 'highlight-active' : ''}>
                                    {rowChar}
                                </th>
                                {alphaArr.map((_, cIdx) => {
                                    const char = ALPHABET[(rIdx + cIdx) % ALPHABET.length];
                                    let className = '';
                                    if (currentStep?.cIdx === (rIdx + cIdx) % ALPHABET.length &&
                                        currentStep?.pIdx === cIdx &&
                                        currentStep?.kIdx === rIdx) {
                                        className = 'highlight-active';
                                    } else if (currentStep?.pIdx === cIdx) {
                                        className = 'highlight-col';
                                    }
                                    return <td key={cIdx} className={className}>{char}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="visualizer">
            <h3 style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem', color: 'var(--secondary)' }}>Таблица Виженера</h3>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{renderRecta()}</div>

            <h3 style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>Пошаговое выполнение</h3>
            <div className="visual-controls">
                <button className="step-btn" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Назад</button>
                <span>Символ {step + 1} из {steps.length}: <strong>{steps[step]?.char} → {steps[step]?.cChar}</strong></span>
                <button className="step-btn" onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1}>Вперед</button>
            </div>

            <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <table className="vigenere-stats-table">
                    <tbody>
                        <tr>
                            <th className="sticky-col">#</th>
                            {steps.map((_, i) => (
                                <td key={i} className={i === step ? 'active' : ''}>{i + 1}</td>
                            ))}
                        </tr>
                        <tr>
                            <th className="sticky-col">Текст</th>
                            {steps.map((s, i) => (
                                <td key={i} className={i === step ? 'active' : ''}>{s.char}</td>
                            ))}
                        </tr>
                        <tr>
                            <th className="sticky-col">Ключ</th>
                            {steps.map((s, i) => (
                                <td key={i} className={i === step ? 'active' : ''}>{s.kChar}</td>
                            ))}
                        </tr>
                        <tr>
                            <th className="sticky-col">P (idx)</th>
                            {steps.map((s, i) => (
                                <td key={i} className={i === step ? 'active' : ''}>{s.pIdx}</td>
                            ))}
                        </tr>
                        <tr>
                            <th className="sticky-col">K (idx)</th>
                            {steps.map((s, i) => (
                                <td key={i} className={i === step ? 'active' : ''}>{s.kIdx}</td>
                            ))}
                        </tr>
                        <tr>
                            <th className="sticky-col">(P+K)%33</th>
                            {steps.map((s, i) => (
                                <td key={i} className={i === step ? 'active' : ''}>{s.cIdx}</td>
                            ))}
                        </tr>
                        <tr>
                            <th className="sticky-col">Шифр</th>
                            {steps.map((s, i) => (
                                <td key={i} className={i === step ? 'active' : (s.cChar ? 'filled' : '')}>
                                    <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{s.cChar}</span>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VigenereVisualizer;
