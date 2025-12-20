import { createPuppeteerRouter, Dataset } from '@crawlee/puppeteer';
import { Actor } from 'apify';
import log from '@apify/log';

import type { AgencyLead, CategoryUserData, ProfileUserData, RequiredField } from './types.js';
import { RouteLabel } from './types.js';
import { CATEGORY_SELECTORS, PROFILE_SELECTORS } from './selectors.js';
import {
    getTextContent,
    getImgSrc,
    extractEmail,
    extractWebsite,
    extractSocialLinks,
    extractRating,
    extractCompanyStats,
    extractServices,
    extractIndustries,
    extractPortfolioCount,
    waitForPageLoad,
    leadMeetsRequirements,
    normalizeUrl,
} from './utils.js';

/**
 * State to track the number of processed items and pagination
 */
interface CrawlerState {
    /** Number of profiles processed */
    processedCount: number;
    /** Maximum profiles to process (0 = unlimited) */
    maxItems: number;
    /** Required fields filter */
    requiredFields: RequiredField[];
    /** Page number to start scraping from (1-based) */
    startPage: number;
    /** Current page being processed (1-based) */
    currentPage: number;
    /** Maximum pages to process (0 = unlimited) */
    maxPages: number;
    /** Number of pages processed so far */
    pagesProcessed: number;
}

/**
 * Get the current crawler state from the Actor's key-value store
 */
async function getState(): Promise<CrawlerState> {
    const state = await Actor.getValue<CrawlerState>('STATE');
    return state || {
        processedCount: 0,
        maxItems: 0,
        requiredFields: [],
        startPage: 1,
        currentPage: 1,
        maxPages: 0,
        pagesProcessed: 0,
    };
}

/**
 * Update the crawler state
 */
async function updateState(updates: Partial<CrawlerState>): Promise<CrawlerState> {
    const currentState = await getState();
    const newState = { ...currentState, ...updates };
    await Actor.setValue('STATE', newState);
    return newState;
}

/**
 * Check if we've reached the maximum number of items
 */
async function hasReachedMaxItems(): Promise<boolean> {
    const state = await getState();
    if (state.maxItems === 0) return false; // 0 means unlimited
    return state.processedCount >= state.maxItems;
}

/**
 * Increment the processed count
 */
async function incrementProcessedCount(): Promise<number> {
    const state = await getState();
    const newCount = state.processedCount + 1;
    await updateState({ processedCount: newCount });
    return newCount;
}

/**
 * Check if we've reached the maximum number of pages
 */
async function hasReachedMaxPages(): Promise<boolean> {
    const state = await getState();
    if (state.maxPages === 0) return false; // 0 means unlimited
    return state.pagesProcessed >= state.maxPages;
}

/**
 * Increment pages processed and update current page
 */
async function incrementPagesProcessed(pageNumber: number): Promise<number> {
    const state = await getState();
    const newCount = state.pagesProcessed + 1;
    await updateState({
        pagesProcessed: newCount,
        currentPage: pageNumber,
    });
    log.info(`Page ${pageNumber} processed (${newCount}/${state.maxPages === 0 ? '∞' : state.maxPages} pages)`);
    return newCount;
}

/**
 * Check if a page number should be processed based on startPage
 */
function shouldProcessPage(pageNumber: number, startPage: number): boolean {
    return pageNumber >= startPage;
}

/**
 * Build paginated URL for a category
 */
function buildPaginatedUrl(baseUrl: string, pageNumber: number): string {
    const url = new URL(baseUrl);
    if (pageNumber > 1) {
        url.searchParams.set('page', String(pageNumber));
    } else {
        url.searchParams.delete('page');
    }
    return url.toString();
}

/**
 * Extract page number from URL
 */
function getPageNumberFromUrl(url: string): number {
    try {
        const urlObj = new URL(url);
        const pageParam = urlObj.searchParams.get('page');
        return pageParam ? parseInt(pageParam, 10) : 1;
    } catch {
        return 1;
    }
}

export const router = createPuppeteerRouter();

/**
 * Handler for category/listing pages
 * Extracts links to agency profiles and enqueues them
 */
router.addHandler(RouteLabel.CATEGORY, async ({ request, page, enqueueLinks }) => {
    const url = request.loadedUrl || request.url;
    const userData = request.userData as CategoryUserData;
    const currentPageNumber = userData?.pageNumber ?? getPageNumberFromUrl(url);

    log.info(`Processing category page ${currentPageNumber}: ${url}`);

    // Get state for pagination checks
    const state = await getState();

    // Check if we should skip this page based on startPage
    if (!shouldProcessPage(currentPageNumber, state.startPage)) {
        log.info(`Skipping page ${currentPageNumber} (startPage=${state.startPage})`);
        // Still enqueue next page if needed
        await enqueueNextPage(url, currentPageNumber, state, enqueueLinks);
        return;
    }

    // Check if we've reached the max pages
    if (await hasReachedMaxPages()) {
        log.info(`Maximum pages limit reached (${state.maxPages}), stopping pagination`);
        return;
    }

    // Check if we've reached the max items before processing
    if (await hasReachedMaxItems()) {
        log.info('Maximum items limit reached, skipping category page');
        return;
    }

    await waitForPageLoad(page);

    // Scroll to load more content if the page uses infinite scroll
    await autoScroll(page);

    // Find all profile links on the page
    const profileLinks = await page.$$eval(
        CATEGORY_SELECTORS.PROFILE_LINK,
        (links) => links
            .map((link) => (link as HTMLAnchorElement).href)
            .filter((href) => href.includes('/agency/profile/')),
    );

    const uniqueLinks = [...new Set(profileLinks)];
    log.info(`Found ${uniqueLinks.length} profile links on page ${currentPageNumber}`);

    // Get updated state to check max items
    const currentState = await getState();
    const remainingSlots = currentState.maxItems === 0
        ? uniqueLinks.length
        : Math.max(0, currentState.maxItems - currentState.processedCount);

    const linksToEnqueue = uniqueLinks.slice(0, remainingSlots);

    if (linksToEnqueue.length > 0) {
        await enqueueLinks({
            urls: linksToEnqueue,
            label: RouteLabel.PROFILE,
            transformRequestFunction: (req) => {
                req.userData = {
                    label: RouteLabel.PROFILE,
                } as ProfileUserData;
                return req;
            },
        });
        log.info(`Enqueued ${linksToEnqueue.length} profile links from page ${currentPageNumber}`);
    }

    // Mark this page as processed
    await incrementPagesProcessed(currentPageNumber);

    // Check for pagination or "Load More" button
    const hasMoreButton = await page.$(CATEGORY_SELECTORS.HAS_MORE_RESULTS);
    if (hasMoreButton && !await hasReachedMaxItems() && !await hasReachedMaxPages()) {
        // Click load more and wait for new content
        try {
            await hasMoreButton.click();
            await page.waitForTimeout(2000);
            log.debug('Clicked "Load More" button, waiting for new content...');
        } catch (error) {
            log.debug('Could not click load more button', { error: String(error) });
        }
    }

    // Enqueue next page if limits not reached
    await enqueueNextPage(url, currentPageNumber, await getState(), enqueueLinks);
});

/**
 * Helper to enqueue the next page in pagination
 */
async function enqueueNextPage(
    currentUrl: string,
    currentPageNumber: number,
    state: CrawlerState,
    enqueueLinks: Parameters<Parameters<typeof router.addHandler>[1]>[0]['enqueueLinks'],
): Promise<void> {
    // Check limits before enqueueing next page
    if (await hasReachedMaxItems()) {
        log.debug('Max items reached, not enqueueing next page');
        return;
    }

    if (await hasReachedMaxPages()) {
        log.debug('Max pages reached, not enqueueing next page');
        return;
    }

    const nextPageNumber = currentPageNumber + 1;

    // Calculate if we should enqueue based on maxPages
    if (state.maxPages > 0) {
        const pagesRemaining = state.maxPages - state.pagesProcessed;
        if (pagesRemaining <= 0) {
            log.debug('No more pages to process based on maxPages limit');
            return;
        }
    }

    // Build the next page URL
    const baseUrl = currentUrl.split('?')[0]; // Remove existing query params
    const nextPageUrl = buildPaginatedUrl(baseUrl, nextPageNumber);

    await enqueueLinks({
        urls: [nextPageUrl],
        label: RouteLabel.CATEGORY,
        transformRequestFunction: (req) => {
            req.userData = {
                label: RouteLabel.CATEGORY,
                pageNumber: nextPageNumber,
            } as CategoryUserData;
            return req;
        },
    });

    log.debug(`Enqueued next page: ${nextPageNumber}`);
}

/**
 * Handler for agency profile pages
 * Extracts detailed information about the agency
 */
router.addHandler(RouteLabel.PROFILE, async ({ request, page }) => {
    const url = request.loadedUrl || request.url;

    // Check if we've reached the max items
    if (await hasReachedMaxItems()) {
        log.info('Maximum items limit reached, skipping profile');
        return;
    }

    // Keep as info, but avoid per-request noisy logs elsewhere
    log.info(`Processing profile: ${url}`);

    await waitForPageLoad(page);
    // Some sections (services/industries) may render below the fold; scroll a bit to trigger lazy render
    await autoScroll(page);
    // Try to wait briefly for industries section to appear (do not fail hard)
    try {
        await page.waitForSelector('.profile-block.industries', { timeout: 5000 });
    } catch {
        // ignore
    }

    // Extract company name
    const name = await getTextContent(page, PROFILE_SELECTORS.COMPANY_NAME);
    if (!name) {
        log.warning(`Could not extract company name from ${url}`);
        return;
    }

    // Extract all data in parallel where possible
    const [
        logoUrl,
        email,
        website,
        location,
        socialLinks,
        ratingData,
        companyStats,
        services,
        industries,
        portfolioCount,
    ] = await Promise.all([
        getImgSrc(page, PROFILE_SELECTORS.LOGO),
        extractEmail(page),
        extractWebsite(page),
        getTextContent(page, PROFILE_SELECTORS.LOCATION),
        extractSocialLinks(page),
        extractRating(page),
        extractCompanyStats(page),
        extractServices(page),
        extractIndustries(page),
        extractPortfolioCount(page),
    ]);

    // Build the lead object
    const lead: AgencyLead = {
        name,
        profileUrl: normalizeUrl(url),
        website,
        email,
        logoUrl,
        location,
        hourlyRate: companyStats.hourlyRate,
        minProjectSize: companyStats.minProjectSize,
        employees: companyStats.employees,
        yearFounded: companyStats.yearFounded,
        rating: ratingData.rating,
        reviewsCount: ratingData.reviewsCount,
        services,
        industries,
        socialLinks,
        portfolioCount,
        scrapedAt: new Date().toISOString(),
    };

    // Check if lead meets required fields
    const state = await getState();
    if (!leadMeetsRequirements(lead, state.requiredFields)) {
        log.debug(`Lead "${name}" does not meet requiredFields, skipping`);
        return;
    }

    // Push to dataset
    await Dataset.pushData(lead);
    const count = await incrementProcessedCount();

    log.info(`Saved lead: ${name} (${count}/${state.maxItems === 0 ? '∞' : state.maxItems})`);
});

/**
 * Default handler - determines the page type and routes accordingly
 */
router.addDefaultHandler(async ({ request, page, enqueueLinks }) => {
    const url = request.loadedUrl || request.url;
    log.debug(`Default handler: ${url}`);

    // Determine page type based on URL
    if (url.includes('/agency/profile/')) {
        // This is a profile page
        await router.getHandler(RouteLabel.PROFILE)!({
            request,
            page,
            enqueueLinks,
        } as Parameters<typeof router.addHandler>[1] extends (ctx: infer C) => unknown ? C : never);
    } else if (url.includes('/agency/')) {
        // This is a category page
        await router.getHandler(RouteLabel.CATEGORY)!({
            request,
            page,
            enqueueLinks,
        } as Parameters<typeof router.addHandler>[1] extends (ctx: infer C) => unknown ? C : never);
    } else {
        log.warning(`Unknown page type: ${url}`);
    }
});

/**
 * Auto-scroll the page to trigger lazy loading
 */
async function autoScroll(page: Parameters<Parameters<typeof router.addHandler>[1]>[0]['page']): Promise<void> {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const maxScrolls = 20;
            let scrollCount = 0;

            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                scrollCount++;

                if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
                    clearInterval(timer);
                    // Scroll back to top
                    window.scrollTo(0, 0);
                    resolve();
                }
            }, 200);
        });
    });
}

/**
 * Parameters for state initialization
 */
export interface InitializeStateParams {
    maxItems: number;
    requiredFields: RequiredField[];
    startPage: number;
    maxPages: number;
}

/**
 * Initialize the state with input parameters
 */
export async function initializeState(params: InitializeStateParams): Promise<void> {
    const { maxItems, requiredFields, startPage, maxPages } = params;

    await updateState({
        processedCount: 0,
        maxItems,
        requiredFields,
        startPage,
        currentPage: startPage,
        maxPages,
        pagesProcessed: 0,
    });

    log.info('Initialized state:', {
        maxItems: maxItems === 0 ? 'unlimited' : maxItems,
        startPage,
        maxPages: maxPages === 0 ? 'unlimited' : maxPages,
        requiredFields: requiredFields.length > 0 ? requiredFields : 'none',
    });
}

/**
 * Get the current page number from state (for resuming)
 */
export async function getCurrentPage(): Promise<number> {
    const state = await getState();
    return state.currentPage;
}
