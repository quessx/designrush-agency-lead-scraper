/**
 * DesignRush Agency Lead Scraper
 *
 * This Actor scrapes company/agency leads from DesignRush platform.
 * It navigates through category pages and extracts detailed information
 * from each agency profile.
 *
 * @see https://www.designrush.com/agency/web-development-companies
 */
import { PuppeteerCrawler } from '@crawlee/puppeteer';
import { Actor } from 'apify';
import log from '@apify/log';

import { router, initializeState } from './routes.js';
import type { ScraperInput, CategoryUserData } from './types.js';
import { RouteLabel } from './types.js';
import { toProxyConfigurationOptions } from './proxy.js';

// Initialize the Actor
await Actor.init();

log.info('DesignRush Agency Lead Scraper started');

// Get input configuration
const input = await Actor.getInput<ScraperInput>();

if (!input) {
    throw new Error('Input is required. Please provide at least startUrls.');
}

const {
    startUrls = [{ url: 'https://www.designrush.com/agency/web-development-companies' }],
    maxItems = 50,
    startPage = 1,
    maxPages = 0,
    requiredFields = [],
    proxyConfiguration: proxyConfig,
} = input;

// Validate input
if (!startUrls || startUrls.length === 0) {
    throw new Error('At least one start URL is required.');
}

if (startPage < 1) {
    throw new Error('startPage must be at least 1.');
}

if (maxPages < 0) {
    throw new Error('maxPages cannot be negative.');
}

log.info('Input configuration:', {
    startUrls: startUrls.map((s) => s.url),
    maxItems: maxItems === 0 ? 'unlimited' : maxItems,
    startPage,
    maxPages: maxPages === 0 ? 'unlimited' : maxPages,
    requiredFields: requiredFields.length > 0 ? requiredFields : 'none',
    useProxy: Boolean(proxyConfig),
});

// Initialize the crawler state
await initializeState({
    maxItems,
    requiredFields,
    startPage,
    maxPages,
});

// Create proxy configuration
const proxyConfigurationOptions = toProxyConfigurationOptions(proxyConfig);
const proxyConfiguration = proxyConfigurationOptions
    ? await Actor.createProxyConfiguration(proxyConfigurationOptions)
    : undefined;

// Create the Puppeteer crawler
const crawler = new PuppeteerCrawler({
    proxyConfiguration,
    requestHandler: router,

    // Puppeteer launch options
    launchContext: {
        launchOptions: {
            args: [
                '--disable-gpu',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
            ],
        },
    },

    // Retry failed requests
    maxRequestRetries: 3,

    // Timeout settings
    navigationTimeoutSecs: 60,
    requestHandlerTimeoutSecs: 120,

    // Concurrency - keep low to avoid rate limiting
    maxConcurrency: 3,
    minConcurrency: 1,

    // Pre-navigation hooks for setting up the page
    preNavigationHooks: [
        async ({ page }) => {
            // Set a realistic viewport
            await page.setViewport({ width: 1920, height: 1080 });

            // Set user agent to a recent Chrome version
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            );

            // Block unnecessary resources to speed up crawling
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                const blockedTypes = ['image', 'stylesheet', 'font', 'media'];

                if (blockedTypes.includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
        },
    ],

    // Failed request handler
    failedRequestHandler: async ({ request }, error) => {
        log.error(`Request failed: ${request.url}`, { error: String(error) });
    },
});

/**
 * Build URL with page parameter if startPage > 1
 */
function buildStartUrl(baseUrl: string, pageNum: number): string {
    if (pageNum <= 1) return baseUrl;

    const url = new URL(baseUrl);
    url.searchParams.set('page', String(pageNum));
    return url.toString();
}

// Prepare start requests with proper labels and pagination
const requests = startUrls.map((startUrl) => {
    const isProfile = startUrl.url.includes('/agency/profile/');

    // For category pages, apply startPage parameter
    const url = isProfile ? startUrl.url : buildStartUrl(startUrl.url, startPage);

    return {
        url,
        userData: isProfile
            ? { label: RouteLabel.PROFILE }
            : {
                label: RouteLabel.CATEGORY,
                pageNumber: startPage,
            } as CategoryUserData,
    };
});

log.info(`Starting crawl with ${requests.length} URL(s)`);

// Run the crawler
await crawler.run(requests);

// Get final stats
interface FinalState {
    processedCount: number;
    pagesProcessed: number;
    currentPage: number;
}
const state = await Actor.getValue<FinalState>('STATE');
log.info('Crawl completed', {
    processedItems: state?.processedCount ?? 0,
    maxItems: maxItems === 0 ? 'unlimited' : maxItems,
    pagesProcessed: state?.pagesProcessed ?? 0,
    maxPages: maxPages === 0 ? 'unlimited' : maxPages,
    lastPage: state?.currentPage ?? startPage,
});

// Gracefully exit
await Actor.exit();
