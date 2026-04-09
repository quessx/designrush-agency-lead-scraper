import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildPaginatedUrl,
    createCategoryUserData,
    createProfileUserData,
    createStartRequests,
    resolveSourceStartUrl,
} from '../src/request-metadata.js';
import { RouteLabel } from '../src/types.js';

void test('buildPaginatedUrl appends page query for paginated category requests', () => {
    const result = buildPaginatedUrl('https://www.designrush.com/agency/web-development-companies?sort=reviews', 3);

    assert.equal(result, 'https://www.designrush.com/agency/web-development-companies?sort=reviews&page=3');
});

void test('createCategoryUserData stores pageNumber and sourceStartUrl', () => {
    const userData = createCategoryUserData(2, 'https://www.designrush.com/agency/web-development-companies');

    assert.deepEqual(userData, {
        label: RouteLabel.CATEGORY,
        pageNumber: 2,
        sourceStartUrl: 'https://www.designrush.com/agency/web-development-companies',
    });
});

void test('createProfileUserData stores sourceStartUrl for direct profile requests', () => {
    const userData = createProfileUserData('https://www.designrush.com/agency/profile/duck-design');

    assert.deepEqual(userData, {
        label: RouteLabel.PROFILE,
        sourceStartUrl: 'https://www.designrush.com/agency/profile/duck-design',
    });
});

void test('resolveSourceStartUrl falls back to the current request url for blank values', () => {
    const result = resolveSourceStartUrl('   ', 'https://www.designrush.com/agency/profile/duck-design');

    assert.equal(result, 'https://www.designrush.com/agency/profile/duck-design');
});

void test('createStartRequests preserves sourceStartUrl for category urls', () => {
    const requests = createStartRequests(
        [{ url: 'https://www.designrush.com/agency/web-development-companies', method: 'GET' }],
        4,
    );

    assert.deepEqual(requests, [
        {
            url: 'https://www.designrush.com/agency/web-development-companies?page=4',
            method: 'GET',
            headers: undefined,
            userData: {
                label: RouteLabel.CATEGORY,
                pageNumber: 4,
                sourceStartUrl: 'https://www.designrush.com/agency/web-development-companies',
            },
        },
    ]);
});

void test('createStartRequests creates profile requests without pagination', () => {
    const requests = createStartRequests(
        [{ url: 'https://www.designrush.com/agency/profile/duck-design', headers: { 'x-test': '1' } }],
        5,
    );

    assert.deepEqual(requests, [
        {
            url: 'https://www.designrush.com/agency/profile/duck-design',
            method: undefined,
            headers: { 'x-test': '1' },
            userData: {
                label: RouteLabel.PROFILE,
                sourceStartUrl: 'https://www.designrush.com/agency/profile/duck-design',
            },
        },
    ]);
});
