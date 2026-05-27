// E2E encryption utilities using Web Crypto API (available in browsers and Node 18+)
// Private keys are stored in IndexedDB and never leave the client.

const DB_NAME = 'pedigree-coins'
const STORE_NAME = 'keys'
const PRIVATE_KEY_NAME = 'pedigree-coins-pk'

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getFromDb(key: string): Promise<CryptoKey | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function setInDb(key: string, value: CryptoKey): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ── Key management ────────────────────────────────────────────────────────────

/**
 * Returns the user's RSA-OAEP key pair.
 * If no key pair exists in IndexedDB, generates a new one and stores the private key.
 * The public key JWK is returned so callers can save it to the server.
 */
export async function getOrCreateUserKeyPair(): Promise<{
  publicKeyJwk: JsonWebKey
  privateKey: CryptoKey
}> {
  const existingPrivateKey = await getFromDb(PRIVATE_KEY_NAME)

  if (existingPrivateKey) {
    // Derive the public key from the stored private key by re-exporting
    // We store both as separate keys but use the same naming convention
    const existingPublicKey = await getFromDb(`${PRIVATE_KEY_NAME}-pub`)
    if (existingPublicKey) {
      const publicKeyJwk = await exportPublicKeyJwk(existingPublicKey)
      return { publicKeyJwk, privateKey: existingPrivateKey }
    }
  }

  // Generate new RSA-OAEP 4096-bit key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable for public key export
    ['wrapKey', 'unwrapKey']
  )

  await setInDb(PRIVATE_KEY_NAME, keyPair.privateKey)
  await setInDb(`${PRIVATE_KEY_NAME}-pub`, keyPair.publicKey)

  const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey)
  return { publicKeyJwk, privateKey: keyPair.privateKey }
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['wrapKey']
  )
}

export async function exportPublicKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key)
}

// ── Conversation key operations ───────────────────────────────────────────────

/** Generates a new AES-256-GCM symmetric key for a conversation. */
export async function generateConversationKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable so it can be wrapped
    ['encrypt', 'decrypt']
  )
}

/** Wraps (encrypts) an AES key with an RSA public key. Returns base64 string. */
export async function wrapConversationKey(
  aesKey: CryptoKey,
  rsaPublicKey: CryptoKey
): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey('raw', aesKey, rsaPublicKey, {
    name: 'RSA-OAEP',
  })
  return btoa(String.fromCharCode(...new Uint8Array(wrapped)))
}

/** Unwraps (decrypts) an RSA-wrapped AES key using the private key. */
export async function unwrapConversationKey(
  wrappedB64: string,
  rsaPrivateKey: CryptoKey
): Promise<CryptoKey> {
  const wrappedBytes = Uint8Array.from(atob(wrappedB64), c => c.charCodeAt(0))
  return crypto.subtle.unwrapKey(
    'raw',
    wrappedBytes,
    rsaPrivateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ── Message operations ────────────────────────────────────────────────────────

/** Encrypts a plaintext string with AES-256-GCM. Returns base64 encrypted + base64 IV. */
export async function encryptMessage(
  plaintext: string,
  aesKey: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  const ivBytes = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    aesKey,
    encoded
  )
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...ivBytes)),
  }
}

/** Decrypts a base64 AES-GCM ciphertext with the given key and base64 IV. */
export async function decryptMessage(
  encryptedB64: string,
  ivB64: string,
  aesKey: CryptoKey
): Promise<string> {
  const ciphertextBytes = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0))
  const ivBytes = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    aesKey,
    ciphertextBytes
  )
  return new TextDecoder().decode(decrypted)
}
