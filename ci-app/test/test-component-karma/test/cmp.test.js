
import { fixture, assert, html } from '@open-wc/testing';
import '../test-component.js';

describe('a test', () => {
  async function basicFixture() {
    return await fixture(html `
      <test-component></test-component>
    `);
  }

  it('is a test', async () => {
    const element = await basicFixture();
    assert.ok(element);
  });
});
