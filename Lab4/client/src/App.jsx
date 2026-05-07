import React, { useState } from 'react';
import './index.css';

const H0 = 100n;

const CYRILLIC_ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

function toBigIntStrict(str) {
  const s = (str ?? '').trim();
  if (!/^\d+$/.test(s)) throw new Error('Введите целое число в 10-й системе.');
  return BigInt(s);
}

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function modPow(base, exp, mod) {
  if (mod === 1n) return 0n;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  let result = 1n;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

function modInv(a, mod) {
  let t = 0n;
  let newT = 1n;
  let r = mod;
  let newR = ((a % mod) + mod) % mod;
  while (newR !== 0n) {
    const q = r / newR;
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }
  if (r !== 1n) throw new Error('Обратного элемента не существует (gcd ≠ 1).');
  if (t < 0n) t += mod;
  return t;
}

function isProbablePrime(n) {
  if (n < 2n) return false;
  const small = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  if (small.includes(n)) return true;
  for (const p of small) {
    if (n % p === 0n) return false;
  }

  let d = n - 1n;
  let s = 0n;
  while ((d & 1n) === 0n) {
    d >>= 1n;
    s += 1n;
  }

  const bases = [2n, 325n, 9375n, 28178n, 450775n, 9780504n, 1795265022n];
  for (const a0 of bases) {
    const a = a0 % n;
    if (a === 0n) continue;
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let cont = false;
    for (let r = 1n; r < s; r += 1n) {
      x = (x * x) % n;
      if (x === n - 1n) {
        cont = true;
        break;
      }
    }
    if (cont) continue;
    return false;
  }
  return true;
}

function charToMi(ch) {
  const upRu = ch.toLocaleUpperCase('ru-RU');
  const idxCyr = CYRILLIC_ALPHABET.indexOf(upRu);
  if (idxCyr >= 0) {
    return BigInt(idxCyr + 1);
  }
  const cp = ch.codePointAt(0);
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) {
    const upLat = cp >= 0x61 ? cp - 0x20 : cp;
    return BigInt(upLat - 0x40);
  }
  return BigInt(cp);
}

function hashMessage32(text, n) {
  if (n <= 100n) throw new Error('Модуль n = p·q должен быть > 100.');
  if (text.length === 0) {
    return H0;
  }
  let h = H0;
  for (const ch of text) {
    const Mi = charToMi(ch);
    const t = (h + Mi) % n;
    h = (t * t) % n;
  }
  return h;
}

function validateParams(pStr, qStr, dStr) {
  const p = toBigIntStrict(pStr);
  const q = toBigIntStrict(qStr);
  const d = toBigIntStrict(dStr);

  if (p < 3n) throw new Error('p должно быть простым и не меньше 3.');
  if (q < 3n) throw new Error('q должно быть простым и не меньше 3.');
  if (!isProbablePrime(p)) throw new Error('p не является простым.');
  if (!isProbablePrime(q)) throw new Error('q не является простым.');
  if (p === q) throw new Error('p и q должны быть различными простыми.');

  const r = p * q;
  const phi = (p - 1n) * (q - 1n);

  if (d <= 1n || d >= phi) {
    throw new Error(`d должно быть в диапазоне 2..φ(r)-1, где φ(r) = ${phi.toString()}.`);
  }
  if (gcd(d, phi) !== 1n) {
    throw new Error(`d должно быть взаимно простым с φ(r) = ${phi.toString()}.`);
  }

  let e;
  try {
    e = modInv(d, phi);
  } catch {
    throw new Error('Не удалось вычислить открытую экспоненту e = d⁻¹ mod φ(r).');
  }
  if ((e * d) % phi !== 1n) {
    throw new Error('Внутренняя ошибка: e·d ≢ 1 (mod φ(r)).');
  }

  return { p, q, d, r, phi, e };
}

function splitSignedText(full) {
  const normalized = full.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  if (lines.length < 2) {
    throw new Error('Файл должен заканчиваться строкой с подписью (целое число в 10-й с.с.).');
  }
  const last = lines[lines.length - 1].trim();
  if (!/^\d+$/.test(last)) {
    throw new Error('Последняя строка файла должна содержать только цифры подписи.');
  }
  const message = lines.slice(0, -1).join('\n');
  return { message, signature: BigInt(last) };
}

export default function App() {
  const [pStr, setPStr] = useState('');
  const [qStr, setQStr] = useState('');
  const [dStr, setDStr] = useState('');
  const [hashDec, setHashDec] = useState('');
  const [signatureDec, setSignatureDec] = useState('');
  const [eDec, setEDec] = useState('');
  const [signFile, setSignFile] = useState(null);
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [loading, setLoading] = useState(false);

  const readTextFile = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
      r.onerror = () => reject(new Error('Ошибка чтения файла.'));
      r.readAsText(file, 'UTF-8');
    });

  const handleSign = async () => {
    if (!signFile) {
      alert('Выберите текстовый файл для подписи.');
      return;
    }
    let params;
    try {
      params = validateParams(pStr, qStr, dStr);
    } catch (e) {
      alert(e.message || 'Ошибка параметров.');
      return;
    }

    setLoading(true);
    try {
      const text = await readTextFile(signFile);
      const { d, r, e } = params;
      setEDec(e.toString(10));
      const m = hashMessage32(text, r);
      const mSign = ((m % r) + r) % r;

      if (gcd(mSign, r) !== 1n) {
        throw new Error(
          'gcd(h(M), r) ≠ 1 — для данного хеша стандартная RSA-подпись неприменима. Измените текст или p, q.',
        );
      }

      const S = modPow(mSign, d, r);
      const recovered = modPow(S, e, r);

      setHashDec(m.toString(10));
      setSignatureDec(S.toString(10));

      const signedContent = `${text}\n${S.toString(10)}`;
      const blob = new Blob([signedContent], { type: 'text/plain;charset=utf-8' });
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(`${signFile.name.replace(/\.[^.]+$/, '') || 'message'}_signed.txt`);

      if (recovered !== mSign) {
        alert('Внутренняя проверка: S^e mod r не совпало с h(M).');
      }
    } catch (e) {
      alert(e.message || 'Ошибка подписи.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyFile) {
      alert('Выберите файл с подписью.');
      return;
    }
    let params;
    try {
      params = validateParams(pStr, qStr, dStr);
    } catch (e) {
      alert(e.message || 'Ошибка параметров.');
      return;
    }

    setLoading(true);
    setVerifyResult(null);
    try {
      const full = await readTextFile(verifyFile);
      const { message, signature: S } = splitSignedText(full);
      const { r, e } = params;

      const mPrime = hashMessage32(message, r);
      const mPrimeSign = ((mPrime % r) + r) % r;
      const mFromSig = modPow(S, e, r);
      const ok = mPrimeSign === mFromSig;

      const rStr = r.toString(10);
      const mPrimeStr = mPrime.toString(10);
      const mSignStr = mPrimeSign.toString(10);
      const mFromSigStr = mFromSig.toString(10);

      let reason;
      if (ok) {
        reason =
          `Сравниваются величины из условия проверки ЭЦП RSA: h(M′) mod r и S^e mod r (r = p·q = ${rStr}). ` +
          `Они совпадают и равны ${mSignStr}. Значит, число S в конце файла соответствует восстановленному тексту сообщения ` +
          `и вашим параметрам p, q, d (через вычисленное e).`;
        if (mPrime !== mPrimeSign) {
          reason +=
            ` По формуле 3.2 h(M′) = ${mPrimeStr} (для пустого сообщения это может быть H₀ = 100); ` +
            `для сравнения с подписью используется остаток ${mPrimeStr} mod ${rStr} = ${mSignStr}.`;
        }
      } else {
        reason =
          `Сравниваются h(M′) mod r и S^e mod r при r = ${rStr}. Сейчас h(M′) mod r = ${mSignStr}, а S^e mod r = ${mFromSigStr} — ` +
          `они различаются, поэтому подпись не подтверждает это сообщение при данных ключах. ` +
          `Частые причины: изменили или подставили другой текст; в проверке введены другие p, q или d, чем при подписи; ` +
          `в последней строке файла ошибка в числе S или лишние символы.`;
        if (mPrime !== mPrimeSign) {
          reason += ` (h(M′) по формуле 3.2: ${mPrimeStr}.)`;
        }
      }

      setVerifyResult({
        ok,
        reason,
        mPrime: mPrimeStr,
        mPrimeSign: mSignStr,
        mFromSig: mFromSigStr,
        r: rStr,
        S: S.toString(10),
        e: e.toString(10),
      });
    } catch (e) {
      setVerifyResult({
        ok: false,
        error: e.message || 'Ошибка проверки.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = downloadName || 'signed.txt';
    a.click();
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Лабораторная работа 4</h1>
        <p>ЭЦП RSA, хеш по формуле 3.2 (H₀ = 100, n = p·q)</p>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            maxWidth: '42rem',
            margin: '0.5rem auto 0',
            lineHeight: 1.5,
          }}
        >
          Буквы в тексте: кириллица А…Я → 1…33; латиница A…Z (регистр не важен) → 1…26; прочие символы — их код Unicode.
        </p>
      </div>

      <div className="main-card">
        <div className="form-group">
          <label>Параметры RSA (10-я система)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <input type="text" placeholder="p (простое)" value={pStr} onChange={(e) => setPStr(e.target.value.replace(/[^\d]/g, ''))} />
            <input type="text" placeholder="q (простое)" value={qStr} onChange={(e) => setQStr(e.target.value.replace(/[^\d]/g, ''))} />
            <input type="text" placeholder="d (закрытая экспонента)" value={dStr} onChange={(e) => setDStr(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Открытая экспонента e вычисляется как e ≡ d⁻¹ (mod φ(r)), φ(r) = (p−1)(q−1). Возведение в степень — быстрый алгоритм (modPow).
          </span>
        </div>

        <div className="form-group">
          <label>Подпись текстового файла</label>
          <input type="file" accept="text/plain,.txt" onChange={(e) => setSignFile(e.target.files?.[0] || null)} />
          <button className="btn-primary" onClick={handleSign} disabled={loading}>
            {loading ? 'Обработка...' : 'Вычислить хеш и подпись'}
          </button>
        </div>

        {(hashDec || signatureDec) && (
          <div className="form-group">
            <label>Открытая экспонента e (вычислена из d и φ(r), 10-я с.с.)</label>
            <textarea rows="2" readOnly value={eDec} />
            <label>Хеш-образ сообщения h(M) (10-я с.с.)</label>
            <textarea rows="2" readOnly value={hashDec} />
            <label>ЭЦП S (целое число, 10-я с.с.)</label>
            <textarea rows="2" readOnly value={signatureDec} />
            <button className="btn-primary" style={{ background: 'var(--accent)' }} onClick={handleDownload}>
              Скачать файл: исходный текст + подпись в конце
            </button>
          </div>
        )}

        <div className="form-group" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <label>Проверка ЭЦП</label>
          <input type="file" accept="text/plain,.txt" onChange={(e) => setVerifyFile(e.target.files?.[0] || null)} />
          <button className="btn-primary" style={{ background: 'var(--secondary)' }} onClick={handleVerify} disabled={loading}>
            {loading ? 'Обработка...' : 'Проверить подпись'}
          </button>
        </div>
      </div>

      {verifyResult && (
        <div className="visual-section">
          <h2>Результат проверки</h2>
          {verifyResult.error ? (
            <p style={{ color: 'var(--secondary)' }}>{verifyResult.error}</p>
          ) : (
            <>
              <p style={{ fontSize: '1.2rem', fontWeight: 600, color: verifyResult.ok ? 'var(--accent)' : 'var(--secondary)' }}>
                {verifyResult.ok ? 'Подпись верна.' : 'Подпись неверна.'}
              </p>
              <p style={{ marginTop: '0.75rem', lineHeight: 1.55, color: 'var(--text-muted)' }}>{verifyResult.reason}</p>
              <div className="form-group">
                <label>r = p·q (модуль RSA)</label>
                <textarea rows="2" readOnly value={verifyResult.r} />
              </div>
              <div className="form-group">
                <label>h(M′) — хеш восстановленного сообщения (10-я с.с.)</label>
                <textarea rows="2" readOnly value={verifyResult.mPrime} />
              </div>
              <div className="form-group">
                <label>h(M′) mod r — с чем сравнивается S^e mod r</label>
                <textarea rows="2" readOnly value={verifyResult.mPrimeSign} />
              </div>
              <div className="form-group">
                <label>S^e mod r — значение, извлечённое из подписи (10-я с.с.)</label>
                <textarea rows="2" readOnly value={verifyResult.mFromSig} />
              </div>
              <div className="form-group">
                <label>Подпись S из файла</label>
                <textarea rows="2" readOnly value={verifyResult.S} />
              </div>
              <div className="form-group">
                <label>e (использовано при проверке S^e mod r)</label>
                <textarea rows="2" readOnly value={verifyResult.e} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
