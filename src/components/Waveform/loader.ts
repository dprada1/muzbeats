import WaveSurfer from 'wavesurfer.js';

/**
 * Create a WaveSurfer instance with customized beat‐player settings.
 */
export function createWaveSurfer(container: HTMLElement): WaveSurfer {
    return WaveSurfer.create({
        container,
        waveColor:     '#888',
        progressColor: '#fff',
        cursorColor:   'transparent',
        barWidth:      2,
        barRadius:     2,
        barGap:        1,
        height:        container.clientHeight,
        fillParent:    true,
        interact:      true,
        normalize:     true,
    });
}
