import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { testContext } from './helpers.js';

const ctx = testContext();
const app = createApp(ctx);
const token = ctx.tokens.signAccess({ sub: 'user-1', role: 'CUSTOMER' });
const auth = { Authorization: `Bearer ${token}` };

const validBody = {
  policyTypeCode: 'ENDOWMENT',
  dob: '1990-06-15',
  gender: 'MALE',
  sumAssured: 1_000_000,
  policyTerm: 20,
  premiumTerm: 10,
  frequency: 'ANNUAL',
  riderCodes: ['ADB'],
};

describe('authentication', () => {
  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/policy-types');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a forged token', async () => {
    const forged = testContext().tokens.signAccess({ sub: 'user-1', role: 'ADMIN' });
    const res = await request(app).get('/api/policy-types').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('rejects a refresh token used as an access token', async () => {
    const refresh = ctx.tokens.signRefresh({ sub: 'user-1', tv: 0 });
    const res = await request(app).get('/api/policy-types').set('Authorization', `Bearer ${refresh}`);
    expect(res.status).toBe(401);
  });

  it('validates the registration body before touching the database', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'R', email: 'nope', password: 'short', dob: '2000-02-30', mobile: '12345' });
    expect(res.status).toBe(400);
    expect([...new Set(res.body.error.details.map((d: { field: string }) => d.field))].sort()).toEqual(
      ['dob', 'email', 'fullName', 'mobile', 'password'],
    );
  });
});

describe('GET /api/policy-types', () => {
  it('lists products with riders, premium options and table columns', async () => {
    const res = await request(app).get('/api/policy-types').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.policyTypes.map((p: { code: string }) => p.code)).toEqual(['ENDOWMENT', 'MONEYBACK']);
    expect(res.body.policyTypes[0].riders).toHaveLength(3);
    expect(res.body.policyTypes[0].premiumOptions).toHaveLength(4);
    expect(res.body.columns[0]).toEqual({ key: 'policyYear', label: 'Policy Year', money: false });
  });
});

describe('POST /api/illustrations/preview', () => {
  it('returns the illustration with money as strings and the DOB masked', async () => {
    const res = await request(app).post('/api/illustrations/preview').set(auth).send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(20);
    expect(typeof res.body.rows[0].totalPremium).toBe('string');
    expect(res.body.input.dob).toBe('••/••/1990');
    expect(res.body.rateVersion).toBe('2026.1');
    expect(JSON.stringify(res.body)).not.toContain('1990-06-15');
  });

  it('reports every failed rule against its field', async () => {
    const res = await request(app)
      .post('/api/illustrations/preview')
      .set(auth)
      .send({ ...validBody, sumAssured: 50_000, premiumTerm: 25 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ field: 'sumAssured', code: 'SUM_ASSURED_RANGE' }),
      expect.objectContaining({ field: 'premiumTerm', code: 'PREMIUM_TERM_RANGE' }),
    ]);
  });

  it('rejects an unknown policy type', async () => {
    const res = await request(app).post('/api/illustrations/preview').set(auth).send({ ...validBody, policyTypeCode: 'NOPE' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('policyTypeCode');
  });

  it('rejects wrong types', async () => {
    const res = await request(app).post('/api/illustrations/preview').set(auth).send({ ...validBody, sumAssured: '1000000' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('sumAssured');
  });
});

describe('error handling', () => {
  it('rejects malformed JSON with a clean 400', async () => {
    const res = await request(app)
      .post('/api/illustrations/preview')
      .set(auth)
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
  });

  it('returns 404 in the standard shape for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('hides internal errors behind a generic 500', async () => {
    const res = await request(app).get('/api/me').set(auth);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
