/**
 * DesignRush Agency Lead Scraper
 *
 * This Actor scrapes company/agency leads from DesignRush platform.
 * It navigates through category pages and extracts detailed information
 * from each agency profile.
 *
 * @see https://www.designrush.com/agency/web-development-companies
 */
import { Configuration, PuppeteerCrawler } from '@crawlee/puppeteer';
import { Actor } from 'apify';

import log from '@apify/log';

import { toProxyConfigurationOptions } from './proxy.js';
import { createStartRequests } from './request-metadata.js';
import { initializeState, router } from './routes.js';
import type { ScraperInput } from './types.js';

// Initialize the Actor
await Actor.init();

// Reduce noisy Crawlee internal INFO logs (AutoscaledPool/Statistics) on Apify runs.
// This also affects @apify/log global level.
Configuration.getGlobalConfig().set('logLevel', 'WARNING');

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
            args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
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
        async ({ page }, gotoOptions) => {
            const navigationOptions = gotoOptions;

            // Faster navigation: don't wait for all network activity.
            if (navigationOptions) {
                navigationOptions.waitUntil = 'domcontentloaded';
            }

            // Set a realistic viewport
            await page.setViewport({ width: 1920, height: 1080 });

            // For this site we can extract required data from HTML + JSON-LD.
            // Disabling JS drastically reduces CPU usage on Apify containers.
            await page.setJavaScriptEnabled(false);

            // Set user agent to a recent Chrome version
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            );

            // Block unnecessary resources to speed up crawling
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                const blockedTypes = ['image', 'stylesheet', 'font', 'media', 'script'];

                if (blockedTypes.includes(resourceType)) {
                    void req.abort();
                } else {
                    void req.continue();
                }
            });
        },
    ],

    // Failed request handler
    failedRequestHandler: async ({ request }, error) => {
        log.error(`Request failed: ${request.url}`, { error: String(error) });
    },
});

// Prepare start requests with proper labels, pagination, and source URL metadata.
const requests = createStartRequests(startUrls, startPage);

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
