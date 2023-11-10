import { Clock } from './clock';
import { Observer } from './observer';
import { Satellite } from './satellite';

export const sampleRate = 44100; // Adjust as needed
export const antennaGainDb = 5; //for Yagi
export const noiseDb = -80; //for Yagi

export class Radio {
    satellite: Satellite;
    startAt: number = 0;
    audioContext: AudioContext | undefined;
    clock: Clock;
    observer: Observer;

    constructor( observer: Observer, satellite: Satellite, clock: Clock) {
        this.satellite = satellite;
        this.observer = observer;
        this.clock = clock;
    }

    async toggle() {
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = undefined;
            this.startAt = 0;
            return;
        } else {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.radioLoop();
        }
    }

    private generateWhiteNoise(length: number, amplitude: number): Float32Array {
        const noise = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            noise[i] = (Math.random() * 2 - 1) * amplitude; // Generate values between -amplitude and amplitude
        }
        return noise;
    }


    private calculateReceivedSignalStrength(
        originalPowerW: number,
        frequencyMhz: number,
        distanceKm: number,
        antennaGain: number
    ): number {
        return 10 * Math.log10(originalPowerW * 1000) - 20 * Math.log10(distanceKm) - 20 * Math.log10(frequencyMhz) + antennaGain;
    }

    private mixSignals(
        volume: number,
        originalSignal: Float32Array,
        noiseSignal: Float32Array,
        receivedStrength: number,
        noiseStrength: number
    ): Float32Array {
        const scalingFactorSignal = 10 ** (receivedStrength / 20);
        const scalingFactorNoise = 10 ** (noiseStrength / 20);

        const mixedSignal = new Float32Array(originalSignal.length);
        for (let i = 0; i < originalSignal.length; i++) {
            mixedSignal[i] = volume * (scalingFactorSignal * originalSignal[i] + scalingFactorNoise * noiseSignal[i]);
        }

        return mixedSignal;
    }

    private radioLoop() {
        if (!this.audioContext) {
            return;
        }

        this.startAt = Math.max(this.audioContext.currentTime, this.startAt);

        const noise = this.generateWhiteNoise(sampleRate, 1);
        const signal = this.satellite.getOneSecondSignalSample(this.startAt);

        let mixed = noise;

        const distanceKm = this.satellite.getDistanceKm(this.observer, this.startAt)
        if (distanceKm) {
            const signalDb = this.calculateReceivedSignalStrength(
                this.satellite.antennaPowerW,
                this.satellite.frequencyMhz,
                distanceKm,
                antennaGainDb,
            )

            console.log(distanceKm, signalDb)
            mixed = this.mixSignals(50, signal, noise, signalDb, noiseDb);
        }

        const source = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, mixed.length, sampleRate);
        buffer.getChannelData(0).set(mixed);
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(this.startAt);
        this.startAt += buffer.duration;

        setTimeout(() => { this.radioLoop(); }, 900);
    }
}
