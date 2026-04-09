import assert from 'node:assert/strict';
import test from 'node:test';

import { createAgencyLead } from '../src/agency-lead.js';
import type { SocialLinks } from '../src/types.js';

function createSocialLinks(): SocialLinks {
    return {
        linkedin: 'https://linkedin.com/company/example',
        facebook: null,
        twitter: null,
        instagram: null,
    };
}

void test('createAgencyLead preserves sourceStartUrl and normalizes profileUrl', () => {
    const lead = createAgencyLead({
        name: 'Duck Design',
        sourceStartUrl: 'https://www.designrush.com/agency/web-development-companies?category=design',
        profileUrl: 'https://www.designrush.com/agency/profile/duck-design/?ref=listing',
        website: 'https://duck.design',
        email: 'team@duck.design',
        logoUrl: 'https://cdn.example.com/logo.png',
        location: 'London, UK',
        hourlyRate: '$100 - $149/hr',
        minProjectSize: '$10,000+',
        employees: '10 - 49',
        yearFounded: '2017',
        rating: 4.9,
        reviewsCount: 12,
        services: ['Web Design'],
        industries: ['SaaS'],
        socialLinks: createSocialLinks(),
        portfolioCount: 4,
        scrapedAt: '2026-04-10T00:00:00.000Z',
    });

    assert.equal(lead.sourceStartUrl, 'https://www.designrush.com/agency/web-development-companies?category=design');
    assert.equal(lead.profileUrl, 'https://www.designrush.com/agency/profile/duck-design');
    assert.equal(lead.scrapedAt, '2026-04-10T00:00:00.000Z');
});

void test('createAgencyLead generates scrapedAt when it is not provided', () => {
    const lead = createAgencyLead({
        name: 'Duck Design',
        sourceStartUrl: 'https://www.designrush.com/agency/profile/duck-design',
        profileUrl: 'https://www.designrush.com/agency/profile/duck-design/',
        website: null,
        email: null,
        logoUrl: null,
        location: null,
        hourlyRate: null,
        minProjectSize: null,
        employees: null,
        yearFounded: null,
        rating: null,
        reviewsCount: null,
        services: [],
        industries: [],
        socialLinks: createSocialLinks(),
        portfolioCount: null,
    });

    assert.match(lead.scrapedAt, /^\d{4}-\d{2}-\d{2}T/);
});
