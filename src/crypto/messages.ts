// crypto/messages.ts
// Per-message AES-GCM encryption/decryption.
// Each message gets a fresh random AES key and IV.

import { bufToB64, b64ToBuf, importPublicKey } from './keys'

export interface EncryptedPayload {
  ciphertext: string           // base64 AES-GCM ciphertext
  iv: string                   // base64 96-bit IV
  encryptedKey: string         // base64 AES key encrypted with recipient RSA public key
  encryptedKeyForSelf: string  // base64 AES key encrypted with sender RSA public key
}

// ── Encrypt a plaintext message ───────────────────────
export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
  senderPublicKeyB64: string
): Promise<EncryptedPayload> {
  const enc = new TextEncoder()

  // 1. Generate ephemeral AES-GCM key for this message
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,  // extractable so we can wrap it
    ['encrypt', 'decrypt']
  )

  // 2. Generate random 96-bit IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // 3. Encrypt the plaintext
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(plaintext)
  )

  // 4. Export raw AES key bytes so we can RSA-encrypt them
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey)

  // 5. Encrypt AES key with recipient's RSA public key
  const recipientPubKey = await importPublicKey(recipientPublicKeyB64)
  const encryptedKeyBuf = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPubKey,
    rawAesKey
  )

  // 6. Encrypt AES key with sender's own RSA public key
  //    (so sender can decrypt their own sent messages)
  const senderPubKey = await importPublicKey(senderPublicKeyB64)
  const encryptedKeyForSelfBuf = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    senderPubKey,
    rawAesKey
  )

  return {
    ciphertext: bufToB64(ciphertextBuf),
    iv: bufToB64(iv.buffer),
    encryptedKey: bufToB64(encryptedKeyBuf),
    encryptedKeyForSelf: bufToB64(encryptedKeyForSelfBuf),
  }
}

// ── Decrypt a received message ────────────────────────
export async function decryptMessage(
  payload: EncryptedPayload,
  privateKey: CryptoKey,
  isSentByMe: boolean
): Promise<string> {
  const dec = new TextDecoder()

  // 1. Choose which encrypted key to use
  //    If I sent this message, use encryptedKeyForSelf
  //    If I received it, use encryptedKey
  const encKeyB64 = isSentByMe ? payload.encryptedKeyForSelf : payload.encryptedKey
  const encKeyBuf = b64ToBuf(encKeyB64)

  // 2. Decrypt the AES key using our RSA private key
  const rawAesKeyBuf = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    new Uint8Array(encKeyBuf)
  )

  // 3. Import the raw AES key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawAesKeyBuf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  // 4. Decrypt the ciphertext
  const ivBuf = b64ToBuf(payload.iv)
  const ciphertextBuf = b64ToBuf(payload.ciphertext)

  const plaintextBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
    aesKey,
    new Uint8Array(ciphertextBuf)
  )

  return dec.decode(plaintextBuf)
}