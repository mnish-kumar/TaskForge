const crypto = require("crypto");

const generateFamilyId = () => {
    return crypto.randomBytes(16).toString("hex");
}

const hashToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
}

const generateSessionId = () => {
    return crypto.randomBytes(16).toString("hex");
}

module.exports = {
    generateFamilyId,
    hashToken,
    generateSessionId,
};
