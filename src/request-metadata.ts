import type { CategoryUserData, ProfileUserData, RouteUserData, ScraperStartUrl } from './types.js';
import { RouteLabel } from './types.js';

export interface StartCrawlerRequest {
    url: string;
    method?: ScraperStartUrl['method'];
    headers?: ScraperStartUrl['headers'];
    userData: RouteUserData;
}

export function isProfileUrl(url: string): boolean {
    return url.includes('/agency/profile/');
}

export function buildPaginatedUrl(baseUrl: string, pageNumber: number): string {
    if (pageNumber <= 1) {
        return baseUrl;
    }

    const url = new URL(baseUrl);
    url.searchParams.set('page', String(pageNumber));
    return url.toString();
}

export function createCategoryUserData(pageNumber: number, sourceStartUrl: string): CategoryUserData {
    return {
        label: RouteLabel.CATEGORY,
        pageNumber,
        sourceStartUrl,
    };
}

export function createProfileUserData(sourceStartUrl: string): ProfileUserData {
    return {
        label: RouteLabel.PROFILE,
        sourceStartUrl,
    };
}

export function resolveSourceStartUrl(sourceStartUrl: string | undefined, fallbackUrl: string): string {
    if (!sourceStartUrl) {
        return fallbackUrl;
    }

    const trimmedSourceStartUrl = sourceStartUrl.trim();
    return trimmedSourceStartUrl.length > 0 ? trimmedSourceStartUrl : fallbackUrl;
}

export function createStartRequests(startUrls: ScraperStartUrl[], startPage: number): StartCrawlerRequest[] {
    return startUrls.map((startUrl) => {
        const sourceStartUrl = startUrl.url;

        if (isProfileUrl(sourceStartUrl)) {
            return {
                url: sourceStartUrl,
                method: startUrl.method,
                headers: startUrl.headers,
                userData: createProfileUserData(sourceStartUrl),
            };
        }

        return {
            url: buildPaginatedUrl(sourceStartUrl, startPage),
            method: startUrl.method,
            headers: startUrl.headers,
            userData: createCategoryUserData(startPage, sourceStartUrl),
        };
    });
}
