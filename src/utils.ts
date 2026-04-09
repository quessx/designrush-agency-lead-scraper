import type { Page } from 'puppeteer';

import { DATA_PATTERNS, PROFILE_SELECTORS } from './selectors.js';
import type { AgencyLead, RequiredField, SocialLinks } from './types.js';

type UnknownRecord = Record<string, unknown>;

export async function sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringProp(obj: UnknownRecord, key: string): string | null {
    const value = obj[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function getJsonLdScriptContents(page: Page): Promise<string[]> {
    try {
        return await page.$$eval('script[type="application/ld+json"]', (elements) =>
            elements
                .map((el) => el.textContent)
                .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
                .map((text) => text.trim()),
        );
    } catch {
        return [];
    }
}

function extractEmailFromJsonLdObject(json: unknown): string | null {
    const stack: unknown[] = [json];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;

        if (Array.isArray(current)) {
            for (const item of current) stack.push(item);
            continue;
        }

        if (!isRecord(current)) continue;

        // Prefer direct email field if present
        const email = getStringProp(current, 'email');
        if (email && DATA_PATTERNS.EMAIL.test(email)) return email;

        // Sometimes JSON-LD is wrapped in @graph
        const graph = current['@graph'];
        if (graph) stack.push(graph);

        // Walk all values for nested email occurrences
        for (const value of Object.values(current)) {
            if (typeof value === 'string') {
                const match = value.match(DATA_PATTERNS.EMAIL);
                if (match) return match[0];
                continue;
            }
            stack.push(value);
        }
    }

    return null;
}

async function extractEmailFromJsonLd(page: Page): Promise<string | null> {
    const scriptContents = await getJsonLdScriptContents(page);
    for (const content of scriptContents) {
        try {
            const parsed: unknown = JSON.parse(content);
            const email = extractEmailFromJsonLdObject(parsed);
            if (email) return email;
        } catch {
            // Ignore invalid JSON-LD blocks
        }
    }
    return null;
}

/**
 * Safely extract text content from an element
 */
export async function getTextContent(page: Page, selector: string): Promise<string | null> {
    try {
        const element = await page.$(selector);
        if (!element) return null;
        return await page.evaluate((el) => el.textContent?.trim() || null, element);
    } catch {
        return null;
    }
}

/**
 * Safely extract href attribute from a link element
 */
export async function getHref(page: Page, selector: string): Promise<string | null> {
    try {
        const element = await page.$(selector);
        if (!element) return null;
        return await page.evaluate((el) => {
            const link = el.closest('a') || (el.tagName === 'A' ? el : null);
            return (link as HTMLAnchorElement)?.href || null;
        }, element);
    } catch {
        return null;
    }
}

/**
 * Safely extract src attribute from an image element
 */
export async function getImgSrc(page: Page, selector: string): Promise<string | null> {
    try {
        const element = await page.$(selector);
        if (!element) return null;
        return await page.evaluate((el) => {
            const img = el.tagName === 'IMG' ? el : el.querySelector('img');
            return (img as HTMLImageElement)?.src || null;
        }, element);
    } catch {
        return null;
    }
}

/**
 * Extract all text contents from multiple elements matching a selector
 */
export async function getAllTextContents(page: Page, selector: string): Promise<string[]> {
    try {
        const elements = await page.$$(selector);
        if (!elements.length) return [];

        const texts = await Promise.all(
            elements.map(
                async (element): Promise<string> => page.evaluate((el) => el.textContent?.trim() || '', element),
            ),
        );
        return texts.filter((text: string) => text.length > 0);
    } catch {
        return [];
    }
}

function uniqueNonEmpty(items: string[]): string[] {
    const normalized = items.map((s) => s.trim()).filter((s) => s.length > 0);
    return [...new Set(normalized)];
}

/**
 * Extract services from the dedicated services block on profile page.
 */
export async function extractServices(page: Page): Promise<string[]> {
    const selectors = [
        '#services .profile-services ul li a',
        '#services .profile-services ul li',
        '#services .profile-services li a',
        '#services .profile-services li',
    ];

    for (const selector of selectors) {
        try {
            const items = await page.$$eval(selector, (elements) =>
                elements.map((el) => (el as HTMLElement).textContent?.trim() || '').filter((text) => text.length > 0),
            );
            const unique = [...new Set(items)];
            if (unique.length > 0) return unique;
        } catch {
            // continue
        }
    }

    // Fallback to generic selector
    return uniqueNonEmpty(await getAllTextContents(page, PROFILE_SELECTORS.SERVICES));
}

/**
 * Extract industries from the dedicated industries block on profile page.
 */
export async function extractIndustries(page: Page): Promise<string[]> {
    const selectors = ['.profile-block.industries ul li', '.profile-block.industries li'];

    for (const selector of selectors) {
        try {
            const items = await page.$$eval(selector, (elements) =>
                elements.map((el) => (el as HTMLElement).textContent?.trim() || '').filter((text) => text.length > 0),
            );
            const unique = [...new Set(items)];
            if (unique.length > 0) return unique;
        } catch {
            // continue
        }
    }

    // Fallback to generic selector
    return uniqueNonEmpty(await getAllTextContents(page, PROFILE_SELECTORS.INDUSTRIES));
}

/**
 * Extract email from page content or mailto links
 */
export async function extractEmail(page: Page): Promise<string | null> {
    try {
        // First try mailto links
        const mailtoHref = await getHref(page, PROFILE_SELECTORS.EMAIL);
        if (mailtoHref) {
            const email = mailtoHref.replace('mailto:', '').split('?')[0];
            if (DATA_PATTERNS.EMAIL.test(email)) {
                return email;
            }
        }

        // Then try JSON-LD (application/ld+json) which often contains stable contact fields
        const jsonLdEmail = await extractEmailFromJsonLd(page);
        if (jsonLdEmail) return jsonLdEmail;

        // Then try to find email in page content
        const pageContent = await page.evaluate(() => document.body.innerText);
        const match = pageContent.match(DATA_PATTERNS.EMAIL);
        return match ? match[0] : null;
    } catch {
        return null;
    }
}

/**
 * Extract phone from page content or tel links
 */
export async function extractPhone(page: Page): Promise<string | null> {
    try {
        // First try tel links
        const telHref = await getHref(page, PROFILE_SELECTORS.PHONE);
        if (telHref) {
            return telHref.replace('tel:', '').trim();
        }

        // Then try to find phone in page content with specific patterns
        const phoneElements = await page.$$('[class*="phone"], [class*="Phone"], [data-testid="phone"]');
        for (const el of phoneElements) {
            const text = await page.evaluate((e) => e.textContent?.trim(), el);
            if (text && DATA_PATTERNS.PHONE.test(text)) {
                const match = text.match(DATA_PATTERNS.PHONE);
                return match ? match[0] : null;
            }
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Extract website URL from page
 */
export async function extractWebsite(page: Page): Promise<string | null> {
    try {
        // Look for explicit website links
        const websiteSelectors = [
            'a[data-testid="website"]',
            'a[class*="website"]',
            'a[class*="Website"]',
            'a[rel="nofollow"][target="_blank"]:not([href*="linkedin"]):not([href*="facebook"]):not([href*="twitter"]):not([href*="instagram"]):not([href*="designrush"])',
        ];

        for (const selector of websiteSelectors) {
            const href = await getHref(page, selector);
            if (href && !href.includes('designrush.com')) {
                return href;
            }
        }

        // Look for website in stats/info section
        const statsSection = await page.$('[class*="stats"], [class*="Stats"], [class*="company-info"]');
        if (statsSection) {
            const links = await statsSection.$$('a[href^="http"]');
            for (const link of links) {
                const href = await page.evaluate((el) => (el as HTMLAnchorElement).href, link);
                if (
                    href &&
                    !href.includes('designrush.com') &&
                    !href.includes('linkedin') &&
                    !href.includes('facebook') &&
                    !href.includes('twitter') &&
                    !href.includes('instagram')
                ) {
                    return href;
                }
            }
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Extract social media links from page
 */
export async function extractSocialLinks(page: Page): Promise<SocialLinks> {
    const socialLinks: SocialLinks = {
        linkedin: null,
        facebook: null,
        twitter: null,
        instagram: null,
    };

    try {
        socialLinks.linkedin = await getHref(page, PROFILE_SELECTORS.SOCIAL_LINKEDIN);
        socialLinks.facebook = await getHref(page, PROFILE_SELECTORS.SOCIAL_FACEBOOK);
        socialLinks.twitter = await getHref(page, PROFILE_SELECTORS.SOCIAL_TWITTER);
        socialLinks.instagram = await getHref(page, PROFILE_SELECTORS.SOCIAL_INSTAGRAM);
    } catch {
        // Return partial results
    }

    return socialLinks;
}

/**
 * Extract rating from page
 */
export async function extractRating(page: Page): Promise<{ rating: number | null; reviewsCount: number | null }> {
    try {
        const ratingElements = await page.$$('[class*="rating"], [class*="Rating"], [class*="review"]');

        for (const el of ratingElements) {
            const text = await page.evaluate((e) => e.textContent?.trim(), el);
            if (!text) continue;

            const ratingMatch = text.match(DATA_PATTERNS.RATING);
            const reviewsMatch = text.match(DATA_PATTERNS.REVIEWS_COUNT);

            if (ratingMatch || reviewsMatch) {
                return {
                    rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
                    reviewsCount: reviewsMatch ? parseInt(reviewsMatch[1], 10) : null,
                };
            }
        }

        return { rating: null, reviewsCount: null };
    } catch {
        return { rating: null, reviewsCount: null };
    }
}

/**
 * Extract company stats (hourly rate, employees, min project, year founded)
 */
export async function extractCompanyStats(page: Page): Promise<{
    hourlyRate: string | null;
    minProjectSize: string | null;
    employees: string | null;
    yearFounded: string | null;
}> {
    const stats = {
        hourlyRate: null as string | null,
        minProjectSize: null as string | null,
        employees: null as string | null,
        yearFounded: null as string | null,
    };

    try {
        // Get all text from stats-like containers
        const statsContainers = await page.$$(
            '[class*="stats"], [class*="Stats"], [class*="info"], [class*="Info"], [class*="detail"], [class*="Detail"]',
        );

        for (const container of statsContainers) {
            const text = await page.evaluate((el) => el.textContent || '', container);

            // Hourly rate
            if (!stats.hourlyRate) {
                const hourlyMatch = text.match(DATA_PATTERNS.HOURLY_RATE);
                if (hourlyMatch) {
                    stats.hourlyRate = hourlyMatch[0];
                }
            }

            // Min project size
            if (!stats.minProjectSize) {
                const projectMatch = text.match(DATA_PATTERNS.MIN_PROJECT_SIZE);
                if (projectMatch) {
                    stats.minProjectSize = projectMatch[0];
                }
            }

            // Employees
            if (!stats.employees && text.toLowerCase().includes('employee')) {
                const employeesMatch = text.match(DATA_PATTERNS.EMPLOYEES);
                if (employeesMatch) {
                    stats.employees = employeesMatch[0];
                }
            }

            // Year founded
            if (!stats.yearFounded) {
                const foundedMatch = text.match(DATA_PATTERNS.YEAR_FOUNDED);
                if (foundedMatch) {
                    stats.yearFounded = foundedMatch[1];
                }
            }
        }

        return stats;
    } catch {
        return stats;
    }
}

/**
 * Check if a lead meets the required fields criteria
 */
export function leadMeetsRequirements(lead: AgencyLead, requiredFields: RequiredField[]): boolean {
    if (!requiredFields || requiredFields.length === 0) {
        return true;
    }

    for (const field of requiredFields) {
        switch (field) {
            case 'email':
                if (!lead.email) return false;
                break;
            case 'website':
                if (!lead.website) return false;
                break;
            case 'linkedin':
                if (!lead.socialLinks.linkedin) return false;
                break;
            case 'facebook':
                if (!lead.socialLinks.facebook) return false;
                break;
            case 'twitter':
                if (!lead.socialLinks.twitter) return false;
                break;
            case 'instagram':
                if (!lead.socialLinks.instagram) return false;
                break;
            default:
                return false;
        }
    }

    return true;
}

/**
 * Clean and normalize URL
 */
export function normalizeUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        // Remove trailing slashes and normalize
        return urlObj.origin + urlObj.pathname.replace(/\/+$/, '');
    } catch {
        return url;
    }
}

/**
 * Extract portfolio count
 */
export async function extractPortfolioCount(page: Page): Promise<number | null> {
    try {
        const portfolioItems = await page.$$(PROFILE_SELECTORS.PORTFOLIO_ITEMS);
        return portfolioItems.length > 0 ? portfolioItems.length : null;
    } catch {
        return null;
    }
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page, timeout = 10000): Promise<void> {
    try {
        await page.waitForFunction(() => document.readyState === 'complete', { timeout });
        // Additional wait for dynamic content
        await sleep(1000);
    } catch {
        // Continue even if timeout
    }
}
