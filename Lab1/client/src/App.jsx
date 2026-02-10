import React, { useState } from 'react';
import axios from 'axios';
import './index.css';
import FourSquareVisualizer from './components/FourSquareVisualizer';
import VigenereVisualizer from './components/VigenereVisualizer';

function App() {
  const [activeTab, setActiveTab] = useState('fourSquare');
  const [text, setText] = useState('');
  const [keys, setKeys] = useState(['', '', '', '']);
  const [vigenereKey, setVigenereKey] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');

  React.useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target.result.slice(0, 1000)); // First 1KB for visualizer
      };
      reader.readAsText(file);
    } else {
      setFilePreview('');
    }
  }, [file]);

  const handleProcess = async (type) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('algorithm', activeTab);
      formData.append('type', type);
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('text', text);
      }

      const currentKeys = activeTab === 'fourSquare' ? keys : [vigenereKey];
      currentKeys.forEach(k => formData.append('keys', k));

      const res = await axios.post('http://localhost:3001/api/encrypt', formData);
      setResult(res.data.result);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      alert('Ошибка: ' + msg);
    }
    setLoading(false);
  };

  const downloadResult = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `result_${activeTab}.txt`;
    a.click();
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Лабораторная работа 1</h1>
        <p>Редько Антон Михайлович</p>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'fourSquare' ? 'active' : ''}`}
          onClick={() => setActiveTab('fourSquare')}
        >
          Four-Square (En)
        </button>
        <button
          className={`tab-btn ${activeTab === 'vigenere' ? 'active' : ''}`}
          onClick={() => setActiveTab('vigenere')}
        >
          Vigenere (Ru)
        </button>
      </div>

      <div className="main-card">
        <div className="form-group">
          <label>Ключ(и)</label>
          {activeTab === 'fourSquare' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '30px' }}>
              {keys.map((k, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ключ {i + 1}</span>
                  <input
                    type="text"
                    placeholder={`Key ${i + 1}`}
                    value={k}
                    onChange={(e) => {
                      const newKeys = [...keys];
                      newKeys[i] = e.target.value;
                      setKeys(newKeys);
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <input
              type="text"
              placeholder="Введите ключ на русском"
              value={vigenereKey}
              onChange={(e) => setVigenereKey(e.target.value)}
            />
          )}
        </div>

        <div className="form-group">
          <label>Текст для обработки {file && <span style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>(будет игнорироваться, т.к. выбран файл)</span>}</label>
          <textarea
            rows="5"
            placeholder="Введите текст здесь..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!!file}
            style={{ opacity: file ? 0.5 : 1 }}
          />
        </div>

        <div className="form-group">
          <label>Или загрузите файл</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="file"
              id="file-input"
              onChange={(e) => setFile(e.target.files[0])}
            />
            {file && (
              <button
                className="step-btn"
                style={{ background: 'var(--secondary)', padding: '0.4rem 0.8rem' }}
                onClick={() => {
                  setFile(null);
                  document.getElementById('file-input').value = '';
                }}
              >
                Очистить файл
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={() => handleProcess('encrypt')} disabled={loading}>
            {loading ? 'Обработка...' : 'Зашифровать'}
          </button>
          <button className="btn-primary" style={{ background: 'var(--secondary)' }} onClick={() => handleProcess('decrypt')} disabled={loading}>
            {loading ? 'Обработка...' : 'Расшифровать'}
          </button>
        </div>

        {result && (
          <div className="form-group" style={{ marginTop: '2rem' }}>
            <label>Результат</label>
            <textarea rows="5" readOnly value={result} />
            <button className="btn-primary" style={{ background: 'var(--accent)' }} onClick={downloadResult}>
              Скачать файл
            </button>
          </div>
        )}
      </div>

      <div className="visual-section">
        <h2>Визуализация</h2>
        {activeTab === 'fourSquare' ? (
          <FourSquareVisualizer keys={keys} text={file ? filePreview : text} result={result} />
        ) : (
          <VigenereVisualizer keyStr={vigenereKey} text={file ? filePreview : text} result={result} />
        )}
      </div>
    </div>
  );
}

export default App;
