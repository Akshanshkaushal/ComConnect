const fs = require("fs");
const admin = require("firebase-admin");

const getCredential = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }

  if (
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH &&
    fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  ) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")
    );
    return admin.credential.cert(serviceAccount);
  }

  return admin.credential.applicationDefault();
};

if (!admin.apps.length) {
  admin.initializeApp({ credential: getCredential() });
}

module.exports = admin;
