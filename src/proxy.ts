import type { ProxyConfigurationOptions } from 'apify';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
}

function getString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const items = value
        .map(getString)
        .filter((v): v is string => typeof v === 'string');
    return items.length > 0 ? items : undefined;
}

function getNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Convert user-provided proxyConfiguration (which may contain unknown fields)
 * into ProxyConfigurationOptions accepted by Actor.createProxyConfiguration().
 *
 * Unknown fields are ignored.
 */
export function toProxyConfigurationOptions(input: unknown): ProxyConfigurationOptions | undefined {
    if (!isRecord(input)) return undefined;

    const options: ProxyConfigurationOptions = {};

    // Common fields from Apify proxy editor / SDK
    const useApifyProxy = getBoolean(input.useApifyProxy);
    if (typeof useApifyProxy === 'boolean') options.useApifyProxy = useApifyProxy;

    const proxyUrls = getStringArray(input.proxyUrls);
    if (proxyUrls) options.proxyUrls = proxyUrls;

    const groups = getStringArray(input.groups);
    if (groups) options.groups = groups;

    const apifyProxyGroups = getStringArray(input.apifyProxyGroups);
    if (apifyProxyGroups) options.apifyProxyGroups = apifyProxyGroups;

    const countryCode = getString(input.countryCode);
    if (countryCode) options.countryCode = countryCode;

    const password = getString(input.password);
    if (password) options.password = password;

    const hostname = getString(input.hostname);
    if (hostname) options.hostname = hostname;

    const port = getNumber(input.port);
    if (typeof port === 'number') options.port = port;

    const newUrlFunction = input.newUrlFunction;
    if (typeof newUrlFunction === 'function') {
        // If provided from code (not from JSON), allow it.
        options.newUrlFunction = newUrlFunction as ProxyConfigurationOptions['newUrlFunction'];
    }

    // If no known fields are present, return empty object (still valid)
    return options;
}


