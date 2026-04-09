/**
 * Proxy configuration as provided by Apify input schema (\"proxy\" editor).
 *
 * Apify UI may include fields that are not part of the SDK types, so we allow
 * arbitrary keys while keeping values unknown (no `any`).
 */
export type ProxyConfigurationInput = Record<string, unknown>;

/**
 * Required fields that can be used to filter leads
 * Only leads with ALL selected fields filled will be pushed to the dataset
 */
export type RequiredField = 'email' | 'website' | 'linkedin' | 'facebook' | 'twitter' | 'instagram';

export interface ScraperStartUrl {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    userData?: Record<string, unknown>;
}

/**
 * Original start URL from Actor input.
 * Preserved through pagination/profile requests and saved to output items.
 */
export interface StartUrlReference {
    sourceStartUrl: string;
}

/**
 * Input parameters for the DesignRush Agency Lead Scraper
 */
export interface ScraperInput {
    /** Category URL(s) to start scraping from */
    startUrls: ScraperStartUrl[];
    /** Maximum number of company profiles to process (0 = unlimited) */
    maxItems?: number;
    /** Page number to start scraping from (1-based) */
    startPage?: number;
    /** Maximum number of pages to process (0 = unlimited) */
    maxPages?: number;
    /** Only push leads that have ALL selected fields filled */
    requiredFields?: RequiredField[];
    /** Proxy configuration for the crawler */
    proxyConfiguration?: ProxyConfigurationInput;
}

/**
 * Social media links for an agency
 */
export interface SocialLinks {
    linkedin: string | null;
    facebook: string | null;
    twitter: string | null;
    instagram: string | null;
}

/**
 * Agency lead data structure
 */
export interface AgencyLead extends StartUrlReference {
    /** Company name */
    name: string;
    /** Original start URL from the input that produced this lead */
    sourceStartUrl: string;
    /** DesignRush profile URL */
    profileUrl: string;
    /** Company website */
    website: string | null;
    /** Contact email */
    email: string | null;
    /** Company logo URL */
    logoUrl: string | null;
    /** Company location (city, country) */
    location: string | null;
    /** Hourly rate range (e.g., "$100 - $149/hr") */
    hourlyRate: string | null;
    /** Minimum project size */
    minProjectSize: string | null;
    /** Number of employees */
    employees: string | null;
    /** Year founded */
    yearFounded: string | null;
    /** Average rating (e.g., 4.9) */
    rating: number | null;
    /** Number of reviews */
    reviewsCount: number | null;
    /** List of services offered */
    services: string[];
    /** List of industries served */
    industries: string[];
    /** Social media links */
    socialLinks: SocialLinks;
    /** Portfolio projects count */
    portfolioCount: number | null;
    /** Timestamp when the data was scraped */
    scrapedAt: string;
}

/**
 * Route labels for the crawler
 */
export enum RouteLabel {
    CATEGORY = 'CATEGORY',
    PROFILE = 'PROFILE',
}

/**
 * User data passed between routes
 */
export interface CategoryUserData extends StartUrlReference {
    label: RouteLabel.CATEGORY;
    /** Page number for this category request (1-based) */
    pageNumber: number;
}

export interface ProfileUserData extends StartUrlReference {
    label: RouteLabel.PROFILE;
    agencyName?: string;
}

export type RouteUserData = CategoryUserData | ProfileUserData;
