import assert from 'node:assert/strict';
import test from 'node:test';

import { toProxyConfigurationOptions } from '../src/proxy.js';

void test('toProxyConfigurationOptions returns undefined for invalid input', () => {
    assert.equal(toProxyConfigurationOptions(null), undefined);
    assert.equal(toProxyConfigurationOptions('invalid'), undefined);
});

void test('toProxyConfigurationOptions disables proxy when useApifyProxy is false and no custom proxy exists', () => {
    const options = toProxyConfigurationOptions({
        useApifyProxy: false,
    });

    assert.equal(options, undefined);
});

void test('toProxyConfigurationOptions keeps sanitized supported fields', () => {
    const options = toProxyConfigurationOptions({
        useApifyProxy: true,
        proxyUrls: [' https://proxy-1.example.com ', '', 'https://proxy-2.example.com'],
        groups: [' RESIDENTIAL ', ''],
        countryCode: ' US ',
        checkAccess: true,
    });

    assert.deepEqual(options, {
        proxyUrls: ['https://proxy-1.example.com', 'https://proxy-2.example.com'],
        groups: ['RESIDENTIAL'],
        countryCode: 'US',
        checkAccess: true,
    });
});

void test('toProxyConfigurationOptions keeps custom proxy urls even when useApifyProxy is false', () => {
    const options = toProxyConfigurationOptions({
        useApifyProxy: false,
        proxyUrls: ['https://proxy-1.example.com'],
    });

    assert.deepEqual(options, {
        proxyUrls: ['https://proxy-1.example.com'],
    });
});
