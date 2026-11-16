import test from 'node:test';
import assert from 'node:assert/strict';
import { LoginResponseError, readLoginResponse } from '../lib/utils/login-response';

test('successful login requires an explicit successful JSON API response', async () => {
  assert.deepEqual(await readLoginResponse(Response.json({ success: true, role: 'admin' })), { success: true });
  await assert.rejects(readLoginResponse(Response.json({ error: 'Unexpected response' })), LoginResponseError);
});

test('HTML failures and login-page redirects show a retry message instead of a parser error', async () => {
  for (const status of [200, 404, 500, 502]) {
    await assert.rejects(
      readLoginResponse(new Response('<!DOCTYPE html><html>Server error</html>', { status, headers: { 'Content-Type': 'text/html' } })),
      { name: 'LoginResponseError', message: 'Sign-in is temporarily unavailable. Please try again.' },
    );
  }
});

test('malformed or non-object JSON cannot be mistaken for successful sign-in', async () => {
  for (const body of ['', '{', 'null', '[]', 'true']) {
    await assert.rejects(readLoginResponse(new Response(body)), LoginResponseError);
  }
});

test('credential errors keep the API message and never enable verification accidentally', async () => {
  assert.deepEqual(await readLoginResponse(Response.json({ error: 'Invalid email or password.', needsVerification: 'true' }, { status: 401 })), {
    success: false, error: 'Invalid email or password.', needsVerification: false,
  });
});

test('an unverified member retains the verification prompt', async () => {
  assert.deepEqual(await readLoginResponse(Response.json({ error: 'Please verify your email before logging in.', needsVerification: true }, { status: 403 })), {
    success: false, error: 'Please verify your email before logging in.', needsVerification: true,
  });
});

test('an API error without a message gets an appropriate retry or credentials fallback', async () => {
  assert.equal((await readLoginResponse(Response.json({}, { status: 429 })) as { error: string }).error,
    'Too many sign-in attempts. Please wait a few minutes and try again.');
  assert.equal((await readLoginResponse(Response.json({}, { status: 401 })) as { error: string }).error,
    'Invalid email or password.');
});
