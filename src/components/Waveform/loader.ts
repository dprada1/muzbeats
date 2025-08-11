import WaveSurfer from 'wavesurfer.js';

/**
 * Create a WaveSurfer instance with customized beat‐player settings.
 */
export function createWaveSurfer(container: HTMLElement): WaveSurfer {
    const isPhone = typeof window !== "undefined" &&
        window.matchMedia('(max-width: 480px)').matches;

    return WaveSurfer.create({
        container,
        waveColor:     '#888',
        progressColor: '#fff',
        cursorColor:   'transparent',
        barWidth:      2,
        barRadius:     2,
        barGap:        1,
        height:        container.clientHeight || (isPhone ? 48 : 64), //isPhone ? 48 : (container.clientHeight || 64),
        interact:      true,
        normalize:     true,
    });
}
