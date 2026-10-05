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

describe('POST /auth/api/register', () => {
    it('registers a user in the in-memory database', async () => {
        const response = await request(app)
            .post('/auth/api/register')
            .send({
                username: 'test-user',
                email: 'test@example.com',
                password: 'password123',
            });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            success: true,
            user: {
                id: expect.any(String),
                username: 'test-user',
                email: 'test@example.com',
            },
        });

        const user = await User.findOne({ username: 'test-user' }).select('+password');
        expect(user).not.toBeNull();
        expect(user.email).toBe('test@example.com');
        expect(user.password).not.toBe('password123');
        await expect(bcrypt.compare('password123', user.password)).resolves.toBe(true);
    });

    it('rejects requests with missing registration fields', async () => {
        const response = await request(app)
            .post('/auth/api/register')
            .send({ email: 'test@example.com' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            success: false,
            message: 'Username, email, and password are required.',
        });
        await expect(User.countDocuments()).resolves.toBe(0);
    });

    it('rejects duplicate usernames or emails', async () => {
        await User.create({
            username: 'existing-user',
            email: 'existing@example.com',
            password: 'password123',
        });

        const response = await request(app)
            .post('/auth/api/register')
            .send({
                username: 'existing-user',
                email: 'new@example.com',
                password: 'password123',
            });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
            success: false,
            message: 'Username or email is already registered.',
        });
    });
});
