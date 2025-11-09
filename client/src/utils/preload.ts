export function preloadImage(src: string) {
    return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = src;
    });
}
