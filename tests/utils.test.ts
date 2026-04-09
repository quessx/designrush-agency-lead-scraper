import assert from 'node:assert/strict';
import test from 'node:test';

import type { AgencyLead, SocialLinks } from '../src/types.js';
import { leadMeetsRequirements, normalizeUrl } from '../src/utils.js';

function createSocialLinks(overrides: Partial<SocialLinks> = {}): SocialLinks {
    return {
        linkedin: null,
        facebook: null,
        twitter: null,
        instagram: null,
        ...overrides,
    };
}

function createLead(overrides: Partial<AgencyLead> = {}): AgencyLead {
    return {
        name: 'Duck Design',
        sourceStartUrl: 'https://www.designrush.com/agency/web-development-companies',
        profileUrl: 'https://www.designrush.com/agency/profile/duck-design',
        website: 'https://duck.design',
        email: 'team@duck.design',
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
        scrapedAt: '2026-04-10T00:00:00.000Z',
        ...overrides,
    };
}

void test('leadMeetsRequirements returns true when no required fields are specified', () => {
    const lead = createLead();

    assert.equal(leadMeetsRequirements(lead, []), true);
});

void test('leadMeetsRequirements returns false when a required social field is missing', () => {
    const lead = createLead({
        socialLinks: createSocialLinks({
            linkedin: null,
        }),
    });

    assert.equal(leadMeetsRequirements(lead, ['linkedin']), false);
});

void test('leadMeetsRequirements returns true when all required fields are present', () => {
    const lead = createLead({
        socialLinks: createSocialLinks({
            linkedin: 'https://linkedin.com/company/duck-design',
            instagram: 'https://instagram.com/duck-design',
        }),
    });

    assert.equal(leadMeetsRequirements(lead, ['email', 'website', 'linkedin', 'instagram']), true);
});

void test('normalizeUrl removes query parameters and trailing slashes', () => {
    const normalizedUrl = normalizeUrl('https://www.designrush.com/agency/profile/duck-design///?ref=listing');

    assert.equal(normalizedUrl, 'https://www.designrush.com/agency/profile/duck-design');
});

void test('normalizeUrl returns original value for invalid urls', () => {
    assert.equal(normalizeUrl('not a url'), 'not a url');
});
