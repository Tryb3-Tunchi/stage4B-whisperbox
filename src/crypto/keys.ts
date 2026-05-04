// crypto/keys.ts
// All cryptographic key operations.
// Private key NEVER leaves this module as raw bytes.
// Only wrapped (encrypted) form is ever stored or transmitted.

const PBKDF2_ITERATIONS = 600_000
const PBKDF2_HASH = 'SHA-256'
const RSA_MODULUS = 2048
const RSA_HASH = 'SHA-256'

// ── Types ─────────────────────────────────────────────
export interface GeneratedKeyMaterial {
  publicKeyB64: string
  wrappedPrivateKeyB64: string
  pbkdf2SaltB64: string
  privateKey: CryptoKey  // stays in memory only
}

// ── Base64 helpers ────────────────────────────────────
export function bufToB64(buf: ArrayBuffer | ArrayBufferView): string {
  const uint8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  return btoa(String.fromCharCode(...uint8))
}

export function b64ToBuf(b64: string): Uint8Array {
  // Trim whitespace that might come from API responses
  const cleaned = b64.trim()
  const bin = atob(cleaned)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf
}

// ── PBKDF2 key derivation ─────────────────────────────
// Derives an AES-KW wrapping key from password + salt
async function deriveWrappingKey(
  password: string,
  saltBuf: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(saltBuf),
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )
}

// ── Key generation ────────────────────────────────────
// Called once at registration
export async function generateKeyMaterial(
  password: string
): Promise<GeneratedKeyMaterial> {
  // 1. Generate RSA-OAEP keypair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: RSA_MODULUS,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: RSA_HASH,
    },
    true,  // extractable — needed to wrap/export
    ['encrypt', 'decrypt']
  )

  // 2. Export public key as base64 (goes to server)
  const pubKeyBuf = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const publicKeyB64 = bufToB64(pubKeyBuf)

  // 3. Generate random 128-bit PBKDF2 salt
  const saltBuf = crypto.getRandomValues(new Uint8Array(16))

  // 4. Derive AES-KW wrapping key from password
  const wrappingKey = await deriveWrappingKey(password, saltBuf)

  // 5. Wrap (encrypt) private key with AES-KW
  const wrappedBuf = await crypto.subtle.wrapKey(
    'pkcs8',
    keyPair.privateKey,
    wrappingKey,
    'AES-KW'
  )

  return {
    publicKeyB64,
    wrappedPrivateKeyB64: bufToB64(wrappedBuf),
    pbkdf2SaltB64: bufToB64(saltBuf),
    privateKey: keyPair.privateKey,  // stays in memory only
  }
}

// ── Key unwrapping (login) ────────────────────────────
// Re-derives wrapping key from password, unwraps private key into memory
export async function unwrapPrivateKey(
  wrappedPrivateKeyB64: string,
  pbkdf2SaltB64: string,
  password: string
): Promise<CryptoKey> {
  // Trim whitespace from base64 strings (API responses may have trailing newlines)
  const cleanWrappedB64 = wrappedPrivateKeyB64.trim()
  const cleanSaltB64 = pbkdf2SaltB64.trim()

  const wrappedBuf = b64ToBuf(cleanWrappedB64)
  const saltBuf = b64ToBuf(cleanSaltB64)

  // Validate wrapped key length is multiple of 8 (AES-KW requirement)
  if (wrappedBuf.length % 8 !== 0) {
    throw new Error(
      `Invalid wrapped key length: ${wrappedBuf.length} bytes (must be multiple of 8)`
    )
  }

  const wrappingKey = await deriveWrappingKey(password, saltBuf)

  return crypto.subtle.unwrapKey(
    'pkcs8',
    new Uint8Array(wrappedBuf),
    wrappingKey,
    'AES-KW',
    { name: 'RSA-OAEP', hash: RSA_HASH },
    false,  // non-extractable once in memory
    ['decrypt']
  )
}

// ── Import public key from base64 ─────────────────────
export async function importPublicKey(publicKeyB64: string): Promise<CryptoKey> {
  const buf = b64ToBuf(publicKeyB64)
  return crypto.subtle.importKey(
    'spki',
    new Uint8Array(buf),
    { name: 'RSA-OAEP', hash: RSA_HASH },
    false,
    ['encrypt']
  )
}