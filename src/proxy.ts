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

/**
 * Convert user-provided proxyConfiguration (which may contain unknown fields)
 * into ProxyConfigurationOptions accepted by Actor.createProxyConfiguration().
 *
 * Unknown fields are ignored.
 */
export function toProxyConfigurationOptions(input: unknown): ProxyConfigurationOptions | undefined {
    if (!isRecord(input)) return undefined;

    /**
     * Apify UI proxy editor commonly includes `useApifyProxy` boolean.
     * This flag is NOT part of the SDK ProxyConfigurationOptions type in apify@3.5.2.
     *
     * Behavior we want:
     * - `useApifyProxy: false` AND no custom proxies configured => disable proxy (return undefined)
     * - otherwise => return options (can be empty object to use Apify Proxy smart defaults on platform)
     */
    const useApifyProxyFlag = getBoolean(input.useApifyProxy);

    const options: ProxyConfigurationOptions = {};

    // Common fields from Apify proxy editor / SDK
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

    // UI schema compatibility: apifyProxyCountry mirrors countryCode
    const apifyProxyCountry = getString(input.apifyProxyCountry);
    if (apifyProxyCountry) options.apifyProxyCountry = apifyProxyCountry;

    const checkAccess = getBoolean(input.checkAccess);
    if (typeof checkAccess === 'boolean') options.checkAccess = checkAccess;

    const newUrlFunction = input.newUrlFunction;
    if (typeof newUrlFunction === 'function') {
        // If provided from code (not from JSON), allow it.
        options.newUrlFunction = newUrlFunction as ProxyConfigurationOptions['newUrlFunction'];
    }

    // Explicit disable: if user says "do not use Apify proxy" and provides no custom proxy URLs,
    // then we disable proxy completely.
    if (useApifyProxyFlag === false && !options.proxyUrls) return undefined;

    // Empty options object is valid and means "use Apify Proxy smart defaults" on the platform.
    return options;
}


