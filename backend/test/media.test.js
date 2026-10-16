process.env.JWT_SECRET = 'test-secret';
const test = require('node:test');
const assert = require('node:assert/strict');
const { signUrl, verify } = require('../src/services/media');

test('a signed link verifies, and only for its own file', () => {
  const u = new URL(signUrl('https://api.example.com/media/t1/photo.jpg'));
  assert.equal(verify('t1/photo.jpg', u.searchParams.get('exp'), u.searchParams.get('sig')), true);
  assert.equal(verify('t1/other.jpg', u.searchParams.get('exp'), u.searchParams.get('sig')), false);
});
test('an expired or tampered link is refused', () => {
  const u = new URL(signUrl('https://api.example.com/media/t1/photo.jpg', -10));
  assert.equal(verify('t1/photo.jpg', u.searchParams.get('exp'), u.searchParams.get('sig')), false);
  const v = new URL(signUrl('https://api.example.com/media/t1/photo.jpg'));
  assert.equal(verify('t1/photo.jpg', v.searchParams.get('exp'), 'x'.repeat(32)), false);
});
test('links to other hosts and data URLs are left alone', () => { assert.equal(signUrl('https://res.cloudinary.com/x/image/upload/a.jpg'), 'https://res.cloudinary.com/x/image/upload/a.jpg'); });
