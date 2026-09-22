const crypto = require("crypto");
const bcrypt = require("bcryptjs");

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Jämför ändå mot en lika lång buffer så längden inte läcker via timing.
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * HTTP Basic Auth mot FEED_ADMIN_USER/FEED_ADMIN_PASSWORD_HASH - enda
 * inloggningen appen har. Lösenordet lagras som en bcrypt-hash (se
 * scripts/hash-password.js), aldrig i klartext i .env.
 */
function basicAuth(req, res, next) {
  const expectedUser = process.env.FEED_ADMIN_USER;
  const expectedHash = process.env.FEED_ADMIN_PASSWORD_HASH;

  if (!expectedUser || !expectedHash) {
    res
      .status(500)
      .send("Servern är inte konfigurerad (FEED_ADMIN_USER/FEED_ADMIN_PASSWORD_HASH saknas).");
    return;
  }

  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme === "Basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const separatorIdx = decoded.indexOf(":");
    const user = decoded.slice(0, separatorIdx);
    const password = decoded.slice(separatorIdx + 1);

    if (timingSafeEqualStr(user, expectedUser) && bcrypt.compareSync(password, expectedHash)) {
      next();
      return;
    }
  }

  res.set("WWW-Authenticate", 'Basic realm="Produktfeed"');
  res.status(401).send("Inloggning krävs.");
}

module.exports = { basicAuth };
