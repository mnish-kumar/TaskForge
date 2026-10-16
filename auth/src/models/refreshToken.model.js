const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    familyId: {
        type: String,
        required: true,
        index: true,
    },
    sessionId: {
        type: String,
        required: true,
    },
    revokeAt: {
        type: Date,
        default: null,
    },
    replacedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "refreshToken",
        default: null,
    }
}, {
    timestamps: true,
});

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.index({ userId: 1, sessionId: 1, revokeAt: 1 });

refreshTokenSchema.index({ familyId: 1, revokeAt: 1 });

const refreshTokenModel = mongoose.model("refreshToken", refreshTokenSchema);

module.exports = refreshTokenModel;
