/** Express route params may be string | string[] depending on @types/express version. */
export function getRouteParam(value: string | string[] | undefined): string | undefined {
    if (typeof value === 'string') {
        return value;
    }
    if (Array.isArray(value)) {
        return value[0];
    }
    return undefined;
}
