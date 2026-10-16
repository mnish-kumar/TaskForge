const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/user.model');
const RefreshToken = require('../src/models/refreshToken.model');
const cookie = require('../src/utils/cookie');
const crypto = require('../src/utils/crypto');

let mongoServer;

jest.setTimeout(10000);

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
    await Promise.all([
        User.deleteMany({}),
        RefreshToken.deleteMany({}),
    ]);
});

afterAll(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe('POST /auth/api/logout', () => {
    it('revokes the current refresh token and clears its cookie', async () => {
        const user = await User.create({
            username: 'test-user',
            email: 'test@example.com',
            password: 'password123',
        });
        const accessToken = cookie.accessToken(user._id, user.username, user.email);
        const sessionId = crypto.generateSessionId();
        const refreshToken = cookie.refreshToken(
            user._id,
            user.username,
            user.email,
            crypto.generateFamilyId(),
            sessionId,
        );

        const refreshTokenDocument = await RefreshToken.create({
            userId: user._id,
            tokenHash: crypto.hashToken(refreshToken),
            familyId: crypto.generateFamilyId(),
            sessionId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const response = await request(app)
            .post('/auth/api/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Cookie', `refreshToken=${refreshToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Logged out successfully.',
        });
        expect(response.headers['set-cookie']).toEqual(
            expect.arrayContaining([
                expect.stringMatching(/^refreshToken=;/),
            ]),
        );

        const revokedToken = await RefreshToken.findById(refreshTokenDocument._id);
        expect(revokedToken.revokeAt).toEqual(expect.any(Date));
    });
});
