#!/usr/bin/env node
// Genererar en bcrypt-hash för FEED_ADMIN_PASSWORD_HASH i .env.
// Användning: node scripts/hash-password.js "mitt-starka-lösenord"
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error('Användning: node scripts/hash-password.js "mitt-starka-lösenord"');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 12));
