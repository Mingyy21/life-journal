// 人生手记 - 客户端加密 (v0.2启用)
const ALG = "AES-GCM"; const KL = 256; const SL = 32; const IVL = 12; const ITER = 600000;

function rb(l: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(l)) as Uint8Array<ArrayBuffer>;
}
function b2b(b: ArrayBuffer): string {
  const a = new Uint8Array(b); let s = ""; for (let i=0;i<a.length;i++) s+=String.fromCharCode(a[i]); return btoa(s);
}
function b2a(b: string): ArrayBuffer {
  const s = atob(b); const a = new Uint8Array(s.length); for (let i=0;i<s.length;i++) a[i]=s.charCodeAt(i); return a.buffer as ArrayBuffer;
}

async function dk(pw: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name:"PBKDF2", salt, iterations:ITER, hash:"SHA-256" }, km, { name:ALG, length:KL }, false, ["encrypt","decrypt"]);
}

export async function encryptText(plaintext: string, password: string): Promise<{ciphertext:string; salt:string; iv:string}> {
  const salt = rb(SL); const iv = rb(IVL); const key = await dk(password, salt);
  const enc = await crypto.subtle.encrypt({ name:ALG, iv }, key, new TextEncoder().encode(plaintext));
  return { ciphertext: b2b(enc), salt: b2b(salt.buffer as ArrayBuffer), iv: b2b(iv.buffer as ArrayBuffer) };
}

export async function decryptText(ciphertext: string, password: string, salt: string, iv: string): Promise<string> {
  const key = await dk(password, new Uint8Array(b2a(salt)) as Uint8Array<ArrayBuffer>);
  const dec = await crypto.subtle.decrypt({ name:ALG, iv: b2a(iv) }, key, b2a(ciphertext));
  return new TextDecoder().decode(dec);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = rb(SL); const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name:"PBKDF2", salt, iterations:ITER, hash:"SHA-256" }, km, 256);
  return `${b2b(salt.buffer as ArrayBuffer)}:${b2b(hash)}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [s,h] = storedHash.split(":"); const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const nh = await crypto.subtle.deriveBits({ name:"PBKDF2", salt: new Uint8Array(b2a(s)) as Uint8Array<ArrayBuffer>, iterations:ITER, hash:"SHA-256" }, km, 256);
  return b2b(nh) === h;
}
