import crypto from "node:crypto";

import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const KEY_SALT = "codesense:github:token:v1";

let key: Buffer | null = null;

function getKey(): Buffer {
  if (key === null) {
    key = crypto.scryptSync(env.JWT_SECRET, KEY_SALT, 32);
  }

  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted]
    .map((buffer) => buffer.toString("base64url"))
    .join(".");
}

export function decryptSecret(payload: string): string {
  const [iv, authTag, encrypted] = payload
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8"
  );
}
