import React, { useState } from 'react';
import './index.css';

const LFSR_BITS = 36;
const TAP_DEGREE = 11; // polynomial x^36 + x^11 + 1

function sanitizeStateInput(value) {
  return value.replace(/[^01]/g, '').slice(0, LFSR_BITS);
}

function createInitialState(bitsStr) {
  const clean = sanitizeStateInput(bitsStr);
  if (clean.length !== LFSR_BITS) {
    throw new Error(`Длина состояния регистра должна быть ровно ${LFSR_BITS} бит.`);
  }
  if (!/[1]/.test(clean)) {
    throw new Error('Начальное состояние регистра не должно состоять только из нулей.');
  }
  return clean.split('').map((b) => (b === '1' ? 1 : 0));
}

function generateKeyStreamBits(initialBits, bitCount) {
  const state = [...initialBits];
  const tapsIndex = LFSR_BITS - TAP_DEGREE; // 36 - 11 = 25
  const bits = [];

  for (let i = 0; i < bitCount; i += 1) {
    const outputBit = state[0];
    bits.push(outputBit);
    const feedback = state[0] ^ state[tapsIndex];
    for (let j = 0; j < LFSR_BITS - 1; j += 1) {
      state[j] = state[j + 1];
    }
    state[LFSR_BITS - 1] = feedback;
  }

  return bits;
}

function processFileWithLfsr(file, initStateStr, mode, onDone, onError) {
  if (!file) {
    onError(new Error('Сначала выберите файл.'));
    return;
  }

  let initialState;
  try {
    initialState = createInitialState(initStateStr);
  } catch (e) {
    onError(e);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const buffer = e.target.result;
      const bytes = new Uint8Array(buffer);
      const totalBits = bytes.length * 8;

      const keyBits = generateKeyStreamBits(initialState, totalBits);
      const resultBytes = new Uint8Array(bytes.length);

      let plainBitsStr = '';
      let cipherBitsStr = '';
      let keyBitsStr = '';

      let bitIndex = 0;
      for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
        const plainByte = bytes[byteIndex];
        let keyByte = 0;
        let cipherByte = 0;

        for (let bitPos = 7; bitPos >= 0; bitPos -= 1) {
          const plainBit = (plainByte >> bitPos) & 1;
          const keyBit = keyBits[bitIndex];
          const cipherBit = plainBit ^ keyBit;

          keyByte |= keyBit << bitPos;
          cipherByte |= cipherBit << bitPos;

          plainBitsStr += plainBit.toString();
          cipherBitsStr += cipherBit.toString();
          keyBitsStr += keyBit.toString();

          bitIndex += 1;
        }

        resultBytes[byteIndex] = cipherByte;
      }

      const blob = new Blob([resultBytes], { type: file.type || 'application/octet-stream' });
      const suggestedName =
        mode === 'encrypt'
          ? `${file.name || 'file'}.enc`
          : (file.name || 'file').replace(/\.enc$/i, '') || `${file.name || 'file'}.dec`;

      onDone({
        keyBits: keyBitsStr,
        plainBits: plainBitsStr,
        cipherBits: cipherBitsStr,
        blob,
        suggestedName,
      });
    } catch (err) {
      onError(err);
    }
  };

  reader.onerror = () => {
    onError(new Error('Ошибка чтения файла.'));
  };

  reader.readAsArrayBuffer(file);
}

function App() {
  const [file, setFile] = useState(null);
  const [initState, setInitState] = useState('');
  const [keyBits, setKeyBits] = useState('');
  const [plainBits, setPlainBits] = useState('');
  const [cipherBits, setCipherBits] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStateChange = (e) => {
    setInitState(sanitizeStateInput(e.target.value));
  };

  const handleProcess = (mode) => {
    if (!file) {
      alert('Пожалуйста, выберите файл.');
      return;
    }

    setLoading(true);
    processFileWithLfsr(
      file,
      initState,
      mode,
      ({ keyBits: k, plainBits: p, cipherBits: c, blob, suggestedName }) => {
        if (downloadUrl) {
          URL.revokeObjectURL(downloadUrl);
        }
        const url = URL.createObjectURL(blob);
        setKeyBits(k);
        setPlainBits(p);
        setCipherBits(c);
        setDownloadUrl(url);
        setDownloadName(suggestedName);
        setLoading(false);
      },
      (err) => {
        alert(err.message || 'Ошибка при обработке файла.');
        setLoading(false);
      },
    );
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = downloadName || 'result.bin';
    a.click();
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Лабораторная работа 2</h1>
        <p>Потоковое шифрование на основе LFSR (m = 36)</p>
      </div>

      <div className="main-card">
        <div className="form-group">
          <label>
            Начальное состояние регистра (36 бит)
            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Поле принимает только символы 0 и 1
            </span>
          </label>
          <input
            type="text"
            placeholder="Например: 1010... (36 бит)"
            value={initState}
            onChange={handleStateChange}
            maxLength={LFSR_BITS}
          />
          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
            Текущая длина: {initState.length} / {LFSR_BITS}
          </div>
        </div>

        <div className="form-group">
          <label>Файл для шифрования/расшифрования</label>
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f || null);
              setKeyBits('');
              setPlainBits('');
              setCipherBits('');
              if (downloadUrl) {
                URL.revokeObjectURL(downloadUrl);
                setDownloadUrl('');
                setDownloadName('');
              }
            }}
          />
          {file && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Выбран файл: <span style={{ color: 'var(--text)' }}>{file.name}</span> (
              {file.size} байт)
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
          <button
            className="btn-primary"
            onClick={() => handleProcess('encrypt')}
            disabled={loading}
          >
            {loading ? 'Обработка...' : 'Зашифровать'}
          </button>
          <button
            className="btn-primary"
            style={{ background: 'var(--secondary)' }}
            onClick={() => handleProcess('decrypt')}
            disabled={loading}
          >
            {loading ? 'Обработка...' : 'Расшифровать'}
          </button>
        </div>

        {downloadUrl && (
          <div className="form-group" style={{ marginTop: '2rem' }}>
            <label>Результат</label>
            <button
              className="btn-primary"
              style={{ background: 'var(--accent)' }}
              onClick={handleDownload}
            >
              Скачать файл ({downloadName || 'result.bin'})
            </button>
          </div>
        )}
      </div>

      {(keyBits || plainBits || cipherBits) && (
        <div className="visual-section">
          <h2>Двоичное представление</h2>
          {keyBits && (
            <div className="form-group">
              <label>Сгенерированный ключ (поток 0/1)</label>
              <textarea rows="8" readOnly value={keyBits} />
            </div>
          )}
          {plainBits && (
            <div className="form-group">
              <label>Исходный файл (в двоичном виде)</label>
              <textarea rows="8" readOnly value={plainBits} />
            </div>
          )}
          {cipherBits && (
            <div className="form-group">
              <label>Зашифрованный/расшифрованный файл (в двоичном виде)</label>
              <textarea rows="8" readOnly value={cipherBits} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

