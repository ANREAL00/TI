import React, { useMemo, useState } from 'react';
import './index.css';

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

const MASK64 = (1n << 64n) - 1n;

function createKStream(p, kFirst) {
  const phi = p - 1n;
  const hi = p - 2n;
  if (hi < 1n) throw new Error('p слишком мало.');
  let state = (kFirst * 0x9e3779b97f4a7c15n + p * 0x85ebca6b2bd3e8d9n) & MASK64;
  if (state === 0n) state = 0xdeadbeef00000001n;

  function nextFromPrng() {
    const span = hi;
    for (let t = 0; t < 100000; t += 1) {
      state = (state * 6364136223846793005n + 1442695040888963407n) & MASK64;
      const cand = (state % span) + 1n;
      if (gcd(cand, phi) === 1n) return cand;
    }
    throw new Error('ГПСЧ не смог выдать k с gcd(k, p−1)=1.');
  }

  let first = true;
  return () => {
    if (first) {
      first = false;
      return kFirst;
    }
    return nextFromPrng();
  };
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
  let t = 0n,
    newT = 1n;
  let r = mod,
    newR = ((a % mod) + mod) % mod;
  while (newR !== 0n) {
    const q = r / newR;
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }
  if (r !== 1n) throw new Error('Обратного элемента не существует (gcd != 1).');
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

function factorize(n) {
  let x = n;
  const factors = new Map();
  let d = 2n;
  while (d * d <= x) {
    while (x % d === 0n) {
      factors.set(d, (factors.get(d) ?? 0n) + 1n);
      x /= d;
    }
    d = d === 2n ? 3n : d + 2n;
  }
  if (x > 1n) factors.set(x, (factors.get(x) ?? 0n) + 1n);
  return factors;
}

function primitiveRootCandidates(p) {
  const phi = p - 1n;
  const fac = factorize(phi);
  const primeFactors = [...fac.keys()];
  return { phi, primeFactors };
}

function isPrimitiveRoot(g, p, phi, primeFactors) {
  if (g <= 1n || g >= p) return false;
  for (const q of primeFactors) {
    if (modPow(g, phi / q, p) === 1n) return false;
  }
  return true;
}

function findAllPrimitiveRoots(p) {
  if (!isProbablePrime(p)) throw new Error('p должно быть простым числом.');
  const { phi, primeFactors } = primitiveRootCandidates(p);

  let g0 = null;
  for (let g = 2n; g < p; g += 1n) {
    if (isPrimitiveRoot(g, p, phi, primeFactors)) {
      g0 = g;
      break;
    }
  }
  if (g0 === null) return [];

  const roots = [];
  for (let t = 1n; t <= phi; t += 1n) {
    if (gcd(t, phi) === 1n) {
      roots.push(modPow(g0, t, p));
    }
  }
  const uniq = [...new Set(roots.map((r) => r.toString()))].map((s) => BigInt(s));
  uniq.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return uniq;
}

const U16_MAX = 65535;

function u16ToBytesLE(x) {
  const n = Number(x);
  return new Uint8Array([n & 255, (n >>> 8) & 255]);
}

function bytesToU16LE(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8)) >>> 0;
}

function bigintToU16Checked(x, label) {
  if (x < 0n || x > BigInt(U16_MAX)) {
    throw new Error(`${label} не помещается в 2 байта (нужно 0..65535); уменьши p.`);
  }
  return Number(x);
}

function makeEncryptedBlob(pairs) {
  const count = pairs.length;
  if (count > 0xffffffff) throw new Error('Файл слишком большой.');

  const out = new Uint8Array(count * 4);
  let off = 0;
  for (let i = 0; i < count; i += 1) {
    const { a, b } = pairs[i];
    out.set(u16ToBytesLE(bigintToU16Checked(a, 'a')), off);
    off += 2;
    out.set(u16ToBytesLE(bigintToU16Checked(b, 'b')), off);
    off += 2;
  }
  return new Blob([out], { type: 'application/octet-stream' });
}

function parseEncrypted(bytes) {
  if (bytes.length === 0) return [];
  if (bytes.length % 4 !== 0) {
    throw new Error('Неверная длина файла: ожидается 4·N байт (пары a_i, b_i по 2 байта).');
  }
  const n = bytes.length / 4;
  const pairs = [];
  for (let i = 0; i < n; i += 1) {
    const base = i * 4;
    pairs.push({
      a: BigInt(bytesToU16LE(bytes, base)),
      b: BigInt(bytesToU16LE(bytes, base + 2)),
    });
  }
  return pairs;
}

function ciphertextPairsDecimalPreview(bytes, limitPairs = 512) {
  if (bytes.length === 0) return '';
  if (bytes.length % 4 !== 0) return '';
  const n = bytes.length / 4;
  const parts = [];
  const show = Math.min(n, limitPairs);
  for (let i = 0; i < show; i += 1) {
    const base = i * 4;
    parts.push(`${bytesToU16LE(bytes, base)} ${bytesToU16LE(bytes, base + 2)}`);
  }
  const suffix = n > limitPairs ? ` ... (показано ${limitPairs} пар из ${n})` : '';
  return parts.join('  ') + suffix;
}

export default function App() {
  const [pStr, setPStr] = useState('');
  const [xStr, setXStr] = useState('');
  const [kStr, setKStr] = useState('');
  const [roots, setRoots] = useState([]);
  const [gStr, setGStr] = useState('');
  const [fileEncIn, setFileEncIn] = useState(null);
  const [fileDecIn, setFileDecIn] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const pVal = useMemo(() => {
    try {
      return pStr.trim() ? toBigIntStrict(pStr) : null;
    } catch {
      return null;
    }
  }, [pStr]);

  const validateEncryptParams = () => {
    const p = toBigIntStrict(pStr);
    const x = toBigIntStrict(xStr);
    const k = toBigIntStrict(kStr);
    const g = toBigIntStrict(gStr);

    if (!isProbablePrime(p)) throw new Error('p должно быть простым числом.');
    if (p <= 257n) throw new Error('p должно быть > 257 (чтобы шифровать байты 0..255).');
    if (p > 65536n) {
      throw new Error('p должно быть ≤ 65536: a и b кодируются по 2 байта (0..65535).');
    }
    if (x < 2n || x > p - 2n) {
      throw new Error('x по методичке: целое, 1 < x < p−1, т.е. 2 ≤ x ≤ p−2.');
    }
    if (k <= 0n || k >= p - 1n) throw new Error('k должно быть в диапазоне 1..p-2.');
    if (gcd(k, p - 1n) !== 1n) throw new Error('k должно быть взаимно простым с (p−1).');
    if (g <= 1n || g >= p) throw new Error('g должно быть в диапазоне 2..p-1.');

    const { phi, primeFactors } = primitiveRootCandidates(p);
    if (!isPrimitiveRoot(g, p, phi, primeFactors)) {
      throw new Error('Выбранный g не является первообразным корнем по модулю p.');
    }

    return { p, x, k, g };
  };

  const handleFindRoots = () => {
    try {
      const p = toBigIntStrict(pStr);
      if (!isProbablePrime(p)) throw new Error('p должно быть простым числом.');
      setLoading(true);
      setTimeout(() => {
        try {
          const all = findAllPrimitiveRoots(p);
          setRoots(all);
          if (all.length > 0) setGStr(all[0].toString());
        } catch (e) {
          alert(e.message || 'Ошибка поиска корней.');
        } finally {
          setLoading(false);
        }
      }, 10);
    } catch (e) {
      alert(e.message || 'Ошибка.');
    }
  };

  const encryptFile = async () => {
    if (!fileEncIn) return alert('Выберите файл для шифрования.');
    let params;
    try {
      params = validateEncryptParams();
    } catch (e) {
      return alert(e.message || 'Ошибка параметров.');
    }

    setLoading(true);
    try {
      const buffer = await fileEncIn.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      const { p, x, k, g } = params;
      const y = modPow(g, x, p);
      const nextK = createKStream(p, k);

      const pairs = [];
      for (let i = 0; i < bytes.length; i += 1) {
        const ki = nextK();
        const ai = modPow(g, ki, p);
        const yk = modPow(y, ki, p);
        const m = BigInt(bytes[i]);
        const bi = (m * yk) % p;
        pairs.push({ a: ai, b: bi });
      }

      const blob = makeEncryptedBlob(pairs);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(`${fileEncIn.name || 'file'}.enc`);

      const encBytes = new Uint8Array(await blob.arrayBuffer());
      setPreview(ciphertextPairsDecimalPreview(encBytes));
    } catch (e) {
      alert(e.message || 'Ошибка шифрования.');
    } finally {
      setLoading(false);
    }
  };

  const decryptFile = async () => {
    if (!fileDecIn) return alert('Выберите файл шифротекста (.enc).');
    let p, x;
    try {
      p = toBigIntStrict(pStr);
      x = toBigIntStrict(xStr);
      if (!isProbablePrime(p)) throw new Error('p должно быть простым числом.');
      if (p <= 257n || p > 65536n) {
        throw new Error('p должно быть в диапазоне простых: > 257 и ≤ 65536 (формат 2 байта на число).');
      }
      if (x < 2n || x > p - 2n) {
        throw new Error('x: по методичке 2 ≤ x ≤ p−2 (x ≠ 1).');
      }
    } catch (e) {
      return alert(e.message || 'Ошибка параметров.');
    }

    setLoading(true);
    try {
      const buffer = await fileDecIn.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setPreview(ciphertextPairsDecimalPreview(bytes));

      if (bytes.length === 0) {
        const blob = new Blob([]);
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(URL.createObjectURL(blob));
        setDownloadName((fileDecIn.name || 'file').replace(/\.enc$/i, '') || 'decrypted.bin');
        setLoading(false);
        return;
      }

      const pairs = parseEncrypted(bytes);
      const out = new Uint8Array(pairs.length);
      for (let i = 0; i < pairs.length; i += 1) {
        const { a, b } = pairs[i];
        if (a <= 0n || a >= p) throw new Error(`a[${i}] вне диапазона [1, p-1].`);
        if (b < 0n || b >= p) throw new Error(`b[${i}] вне диапазона [0, p-1].`);
        const ax = modPow(a, x, p);
        const invAx = modInv(ax, p);
        const m = (b * invAx) % p;
        if (m < 0n || m > 255n) {
          throw new Error('Расшифровка дала байт вне диапазона 0..255 (проверь x/p).');
        }
        out[i] = Number(m);
      }

      const blob = new Blob([out], { type: 'application/octet-stream' });
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName((fileDecIn.name || 'file').replace(/\.enc$/i, '') || 'decrypted.bin');
    } catch (e) {
      alert(e.message || 'Ошибка расшифрования.');
    } finally {
      setLoading(false);
    }
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
        <h1>Лабораторная работа 3</h1>
      </div>

      <div className="main-card">
        <div className="form-group">
          <label>Параметры p, x, k (10-я система)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <input
              type="text"
              placeholder="p (простое, 258..65536)"
              value={pStr}
              onChange={(e) => setPStr(e.target.value.replace(/[^\d]/g, ''))}
            />
            <input
              type="text"
              placeholder="x (секретный ключ, 2..p−2)"
              value={xStr}
              onChange={(e) => setXStr(e.target.value.replace(/[^\d]/g, ''))}
            />
            <input
              type="text"
              placeholder="k для 1-го байта (1..p−2, gcd(k,p−1)=1)"
              value={kStr}
              onChange={(e) => setKStr(e.target.value.replace(/[^\d]/g, ''))}
            />
          </div>
          <button className="btn-primary" onClick={handleFindRoots} disabled={loading || !pVal}>
            {loading ? 'Поиск...' : 'Найти все первообразные корни g для p'}
          </button>
        </div>

        {roots.length > 0 && (
          <div className="form-group">
            <label>Выбор первообразного корня g по модулю p</label>
            <p
              style={{
                margin: '0 0 0.75rem',
                fontSize: '1.05rem',
                color: 'var(--text)',
              }}
            >
              Количество первообразных корней:{' '}
              <strong style={{ color: 'var(--accent)' }}>{roots.length}</strong>
            </p>
            <select
              value={gStr}
              onChange={(e) => setGStr(e.target.value)}
              aria-label="Первообразный корень g"
            >
              {roots.map((r) => {
                const v = r.toString();
                return (
                  <option key={v} value={v}>
                    g = {v}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Шифрование файла</label>
          <input type="file" onChange={(e) => setFileEncIn(e.target.files?.[0] || null)} />
          <button className="btn-primary" onClick={encryptFile} disabled={loading}>
            {loading ? 'Обработка...' : 'Зашифровать (только шифротекст, .enc)'}
          </button>
        </div>

        <div className="form-group">
          <label>Дешифрование файла</label>
          <input type="file" onChange={(e) => setFileDecIn(e.target.files?.[0] || null)} />
          <button
            className="btn-primary"
            style={{ background: 'var(--secondary)' }}
            onClick={decryptFile}
            disabled={loading}
          >
            {loading ? 'Обработка...' : 'Расшифровать (.enc → исходный файл)'}
          </button>
        </div>

        {downloadUrl && (
          <div className="form-group">
            <label>Результат</label>
            <button className="btn-primary" style={{ background: 'var(--accent)' }} onClick={handleDownload}>
              Скачать файл ({downloadName})
            </button>
          </div>
        )}
      </div>

      {preview && (
        <div className="visual-section">
          <h2>Содержимое шифротекста в 10-й системе (пары a₁ b₁, a₂ b₂, …)</h2>
          <textarea rows="6" readOnly value={preview} />
        </div>
      )}
    </div>
  );
}

