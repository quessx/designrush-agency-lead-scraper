import type { AgencyLead, SocialLinks } from './types.js';
import { normalizeUrl } from './utils.js';

export interface CreateAgencyLeadParams {
    name: string;
    sourceStartUrl: string;
    profileUrl: string;
    website: string | null;
    email: string | null;
    logoUrl: string | null;
    location: string | null;
    hourlyRate: string | null;
    minProjectSize: string | null;
    employees: string | null;
    yearFounded: string | null;
    rating: number | null;
    reviewsCount: number | null;
    services: string[];
    industries: string[];
    socialLinks: SocialLinks;
    portfolioCount: number | null;
    scrapedAt?: string;
}

export function createAgencyLead(params: CreateAgencyLeadParams): AgencyLead {
    const {
        name,
        sourceStartUrl,
        profileUrl,
        website,
        email,
        logoUrl,
        location,
        hourlyRate,
        minProjectSize,
        employees,
        yearFounded,
        rating,
        reviewsCount,
        services,
        industries,
        socialLinks,
        portfolioCount,
        scrapedAt = new Date().toISOString(),
    } = params;

    return {
        name,
        sourceStartUrl,
        profileUrl: normalizeUrl(profileUrl),
        website,
        email,
        logoUrl,
        location,
        hourlyRate,
        minProjectSize,
        employees,
        yearFounded,
        rating,
        reviewsCount,
        services,
        industries,
        socialLinks,
        portfolioCount,
        scrapedAt,
    };
}
