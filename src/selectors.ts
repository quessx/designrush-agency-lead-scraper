/**
 * CSS Selectors for DesignRush website
 * These selectors are used to extract data from the category and profile pages
 *
 * Note: These selectors may need to be updated if DesignRush changes their website structure
 */

/**
 * Selectors for the category/listing page
 */
export const CATEGORY_SELECTORS = {
    /**
     * Selector for agency cards/items in the listing
     * The listing page contains cards with agency information
     */
    AGENCY_CARD:
        '[data-testid="provider-card"], .provider-card, .agency-card, [class*="ProviderCard"], [class*="AgencyCard"]',

    /**
     * Selector for the link to agency profile within a card
     */
    PROFILE_LINK: 'a[href*="/agency/profile/"]',

    /**
     * Selector for agency name within a card (for pre-loading)
     */
    AGENCY_NAME: 'h2, h3, [class*="name"], [class*="title"]',

    /**
     * Selector for "Load More" or pagination buttons
     */
    LOAD_MORE_BUTTON: 'button[class*="load-more"], button[class*="LoadMore"], [data-testid="load-more"]',

    /**
     * Selector for pagination links
     */
    PAGINATION: 'a[href*="page="], nav[class*="pagination"] a, [class*="Pagination"] a',

    /**
     * Check if there are more results to load
     */
    HAS_MORE_RESULTS: '[class*="load-more"]:not([disabled]), [data-testid="load-more"]:not([disabled])',
} as const;

/**
 * Selectors for the agency profile page
 */
export const PROFILE_SELECTORS = {
    /**
     * Company name (usually in H1)
     */
    COMPANY_NAME: 'h1',

    /**
     * Company description/tagline
     */
    DESCRIPTION: '[class*="description"], [class*="tagline"], [class*="about"] p, meta[name="description"]',

    /**
     * Company logo
     */
    LOGO: '[class*="logo"] img, [class*="Logo"] img, .profile-header img, header img[alt*="logo"]',

    /**
     * Company website link
     */
    WEBSITE:
        'a[href^="http"]:not([href*="designrush"]):not([href*="linkedin"]):not([href*="facebook"]):not([href*="twitter"]):not([href*="instagram"])[class*="website"], a[data-testid="website"], a[rel="nofollow"][target="_blank"]',

    /**
     * Contact email
     */
    EMAIL: 'a[href^="mailto:"]',

    /**
     * Contact phone
     */
    PHONE: 'a[href^="tel:"]',

    /**
     * Location information
     */
    LOCATION: '[class*="location"], [class*="Location"], [data-testid="location"], address',

    /**
     * Hourly rate
     */
    HOURLY_RATE: '[class*="hourly"], [class*="Hourly"], [data-testid="hourly-rate"], :contains("$/hr")',

    /**
     * Minimum project size
     */
    MIN_PROJECT_SIZE:
        '[class*="project-size"], [class*="ProjectSize"], [data-testid="min-project"], :contains("Min. project")',

    /**
     * Number of employees
     */
    EMPLOYEES: '[class*="employees"], [class*="Employees"], [data-testid="employees"], :contains("employees")',

    /**
     * Year founded
     */
    YEAR_FOUNDED: '[class*="founded"], [class*="Founded"], [data-testid="founded"], :contains("Founded")',

    /**
     * Rating
     */
    RATING: '[class*="rating"], [class*="Rating"], [data-testid="rating"]',

    /**
     * Reviews count
     */
    REVIEWS_COUNT: '[class*="reviews"], [class*="Reviews"], [data-testid="reviews-count"]',

    /**
     * Services list
     */
    SERVICES: [
        // Primary (confirmed by provided HTML)
        '#services .profile-services li a',
        '#services .profile-services li',
        // Fallbacks (in case markup differs)
        '[id="services"] li a',
        '[id="services"] li',
        '[class*="profile-services"] li a',
        '[class*="profile-services"] li',
        '[class*="services"] li a',
        '[class*="services"] li',
        '[class*="service-tag"]',
        '[class*="ServiceTag"]',
        '[data-testid="services"] li a',
        '[data-testid="services"] li',
    ].join(', '),

    /**
     * Industries list
     */
    INDUSTRIES: [
        // Primary (confirmed by provided HTML)
        '.profile-block.industries li',
        '.profile-block.industries li a',
        // Fallbacks
        '[class*="profile-industries"] li',
        '[class*="profile-industries"] li a',
        '[class*="industries"] li',
        '[class*="industries"] li a',
        '[class*="Industries"] li',
        '[class*="Industries"] li a',
        '[class*="industry-tag"]',
        '[class*="IndustryTag"]',
        '[data-testid="industries"] li',
        '[data-testid="industries"] li a',
    ].join(', '),

    /**
     * Social media links
     */
    SOCIAL_LINKEDIN: 'a[href*="linkedin.com"]',
    SOCIAL_FACEBOOK: 'a[href*="facebook.com"]',
    SOCIAL_TWITTER: 'a[href*="twitter.com"], a[href*="x.com"]',
    SOCIAL_INSTAGRAM: 'a[href*="instagram.com"]',

    /**
     * Portfolio section
     */
    PORTFOLIO_ITEMS:
        '[class*="portfolio"] [class*="item"], [class*="Portfolio"] [class*="Item"], [class*="project-card"], [class*="ProjectCard"]',

    /**
     * Key stats container (often contains hourly rate, employees, etc.)
     */
    STATS_CONTAINER:
        '[class*="stats"], [class*="Stats"], [class*="key-facts"], [class*="KeyFacts"], [class*="company-info"], [class*="CompanyInfo"]',
} as const;

/**
 * Regular expressions for extracting data from text
 */
export const DATA_PATTERNS = {
    /**
     * Email pattern
     */
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,

    /**
     * Phone pattern (various formats)
     */
    PHONE: /(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}/,

    /**
     * Rating pattern (e.g., "4.9" or "4.9/5")
     */
    RATING: /(\d+\.?\d*)\s*(?:\/\s*5)?/,

    /**
     * Reviews count pattern (e.g., "123 reviews" or "(123)")
     */
    REVIEWS_COUNT: /\(?\s*(\d+)\s*\)?\s*(?:reviews?|отзыв)/i,

    /**
     * Hourly rate pattern (e.g., "$100 - $149/hr")
     */
    HOURLY_RATE: /\$\d+(?:\s*-\s*\$\d+)?(?:\s*\/\s*hr)?/i,

    /**
     * Employees pattern (e.g., "50-249 employees" or "50+")
     */
    EMPLOYEES: /(\d+(?:\s*[-+]\s*\d*)?)\s*(?:employees?)?/i,

    /**
     * Year founded pattern (e.g., "Founded 2015" or "Est. 2015")
     */
    YEAR_FOUNDED: /(?:founded|est\.?|established)\s*:?\s*(\d{4})/i,

    /**
     * Min project size pattern (e.g., "$10,000+" or "Min. project: $10,000")
     */
    MIN_PROJECT_SIZE: /(?:min\.?\s*(?:project)?:?\s*)?\$[\d,]+\+?/i,
} as const;

/**
 * Base URL for DesignRush
 */
export const BASE_URL = 'https://www.designrush.com';

/**
 * URL patterns for route matching
 */
export const URL_PATTERNS = {
    CATEGORY: /\/agency\/[^/]+(?:\/[a-z]{2})?$/,
    PROFILE: /\/agency\/profile\/[^/]+$/,
} as const;
