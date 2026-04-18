const crypto = require('crypto');

const ITERATIONS = 120000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');

  return { hash, salt };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const hashBuffer = Buffer.from(hash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (hashBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, expectedBuffer);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
