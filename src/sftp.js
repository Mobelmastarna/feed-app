const SftpClient = require("ssh2-sftp-client");

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Miljövariabeln ${name} saknas (SFTP-uppladdning till OpenAI).`);
  }
  return value;
}

function optionalEnv(name) {
  return process.env[name] || null;
}

function joinRemotePath(remoteDir, filename) {
  const dir = remoteDir.endsWith("/") ? remoteDir : `${remoteDir}/`;
  return `${dir}${filename}`;
}

/** Laddar upp CSV-innehållet till OpenAIs SFTP-mottagning. Stödjer SSH-nyckel eller lösenord. */
async function uploadCsvViaSftp(csv, filename) {
  const host = requiredEnv("OPENAI_FEED_SFTP_HOST");
  const port = Number(process.env.OPENAI_FEED_SFTP_PORT || "22");
  const username = requiredEnv("OPENAI_FEED_SFTP_USERNAME");
  const remoteDir = process.env.OPENAI_FEED_SFTP_REMOTE_PATH || "/";

  const fs = require("fs");

  // Stödja både SSH-nyckel och lösenord
  const privateKeyPath = optionalEnv("OPENAI_FEED_SFTP_PRIVATE_KEY_PATH");
  const password = optionalEnv("OPENAI_FEED_SFTP_PASSWORD");

  if (!privateKeyPath && !password) {
    throw new Error(
      "Måste ange antingen OPENAI_FEED_SFTP_PRIVATE_KEY_PATH (SSH-nyckel) eller OPENAI_FEED_SFTP_PASSWORD."
    );
  }

  const connectOptions = {
    host,
    port,
    username,
    readyTimeout: 30000,
    algorithms: { serverHostKey: ["ssh-ed25519", "ecdsa-sha2-nistp256"] },
    strictHostKey: true,
  };

  if (privateKeyPath) {
    connectOptions.privateKey = fs.readFileSync(privateKeyPath, "utf-8");
  } else if (password) {
    connectOptions.password = password;
  }

  const client = new SftpClient();
  try {
    await client.connect(connectOptions);
    const remotePath = joinRemotePath(remoteDir, filename);
    await client.put(Buffer.from(csv, "utf-8"), remotePath);
  } finally {
    try {
      await client.end();
    } catch {
    }
  }
}

module.exports = { uploadCsvViaSftp };
