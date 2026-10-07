const request = require('supertest');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/user.model');

let mongoServer;

jest.setTimeout(1000);

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
    await User.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe('POST /auth/api/login', () => {
    it('logs in with valid credentials and sets authentication cookies', async () => {
        const password = await bcrypt.hash('password123', 10);
        await User.create({
            username: 'test-user',
            email: 'test@example.com',
            password,
        });

        const response = await request(app)
            .post('/auth/api/login')
            .send({
                email: 'test@example.com',
                password: 'password123',
            });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            user: {
                id: expect.any(String),
                username: 'test-user',
                email: 'test@example.com',
            },
        });
        expect(response.headers['set-cookie']).toEqual(
            expect.arrayContaining([
                expect.stringMatching(/^refreshToken=/),
            ]),
        );

        const user = await User.findOne({ email: 'test@example.com' });
        expect(user.lastLogin).toEqual(expect.any(Date));
    });

    it('rejects invalid credentials', async () => {
        await User.create({
            username: 'test-user',
            email: 'test@example.com',
            password: await bcrypt.hash('password123', 10),
        });

        const response = await request(app)
            .post('/auth/api/login')
            .send({
                email: 'test@example.com',
                password: 'wrong-password',
            });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            success: false,
            message: 'Invalid email/password.',
        });
    });
});
