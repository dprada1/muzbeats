import WaveSurfer from 'wavesurfer.js';

/**
 * Create a WaveSurfer instance with customized beat‐player settings.
 */
export function createWaveSurfer(
    container: HTMLElement
): WaveSurfer {
    return WaveSurfer.create({
        container,
        waveColor:     '#888',
        progressColor: '#fff',
        cursorColor:   'transparent',
        barWidth:      2,
        height:        container.clientHeight || 64,
        interact:      true,
        normalize:     true,
    });
}
