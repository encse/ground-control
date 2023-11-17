import { LookAngles } from 'satellite.js';
import { Clock } from './clock';
import { Observer } from './observer';
import { Satellite } from './satellite';

const bufferLengthMs = 1000;

export class Radio {
    satellite: Satellite;
    audioLengthMs: number = 0;
    audioStart: Date | undefined;
    audioContext: AudioContext | undefined;
    observer: Observer;
    sampleRate: number;
    antennaGainDb: number;
    noiseDbfv: number;

    constructor(observer: Observer, satellite: Satellite, sampleRate: number, antennaGainDb: number, noiseDb: number) {
        this.satellite = satellite;
        this.observer = observer;
        this.sampleRate = sampleRate;
        this.antennaGainDb = antennaGainDb;
        this.noiseDbfv = this.toDbfv(noiseDb);
    }


    turnedOn() {
        return this.audioContext;
    }
    
    async toggle() {
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = undefined;
            this.audioLengthMs = 0;
            this.audioStart = undefined;
        } else {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }

    private generateWhiteNoise(ms: number): Float32Array {
        const noise = new Float32Array(ms / 1000 * this.sampleRate);
        for (let i = 0; i < noise.length; i++) {
            noise[i] = (Math.random() * 2 - 1);
        }
        return noise;
    }


    public getSignalStrength(
        originalPowerW: number,
        frequencyMhz: number,
        lookAngles: LookAngles,
    ): number {

        if (lookAngles.elevation < 0) {
            return -Infinity;
        }

        const powerDb = 10 * Math.log10(originalPowerW * 1000);
        // Free Space Path Loss https://en.wikipedia.org/wiki/Free-space_path_loss
        // see also https://www.ieice.org/cs/isap/ISAP_Archives/2020/pdf/4G2-6.pdf
        const fspl = 92.45 +
            + 20 * Math.log10(lookAngles.rangeSat)
            + 20 * Math.log10(frequencyMhz / 1000);
        const dbm = powerDb + this.antennaGainDb - fspl; 
        return this.toDbfv(dbm);
        
    }

    toDbfv(db:number) {
        const srcMin = -120;
        const srcMax = -60;

        const min = -100;
        const max = 0;

        if (db > srcMax) {
            return max;
        } else if (db < srcMin) {
            return min;
        } else {
            return (max - min) / (srcMax - srcMin) * (db - srcMin) + min;
        }
    }
    private mixSignals(
        volume: number,
        signal: Float32Array,
        noise: Float32Array,
        signalDbfv: number,
        noiseDbfv: number,
    ): Float32Array {
        
        let scalingFactorSignal = isFinite(signalDbfv) ?  10 ** (signalDbfv / 20) : 0;
        let scalingFactorNoise = isFinite(noiseDbfv) ?  10 ** (noiseDbfv / 20) : 0;
        
        const mixedSignal = new Float32Array(signal.length);
        for (let i = 0; i < signal.length; i++) {
            mixedSignal[i] = volume * (scalingFactorSignal * signal[i] + scalingFactorNoise * noise[i]);
        }

        return mixedSignal;
    }

    tick(clock: Clock) {

        if (!this.audioContext) {
            return;
        }

        let now = new Date();

        if (!this.audioStart) {
            this.audioStart = now;
            this.audioLengthMs = 0;
        }

        let inBufferMs = Math.max(0, this.audioLengthMs - (now.getTime() - this.audioStart.getTime()));

        const generateMs = bufferLengthMs - inBufferMs;
        if (generateMs <= 0) {
            return;
        }

        const noise = this.generateWhiteNoise(generateMs);
        const signal = this.satellite.getSample(clock.getTime(inBufferMs / 1000), generateMs);

        let signalDbfv = -Infinity;
        const lookAngles = this.satellite.getLookAngles(clock.getTime(inBufferMs / 1000), this.observer)
        if (lookAngles) {
            signalDbfv = this.getSignalStrength(this.satellite.antennaPowerW, this.satellite.frequencyMhz, lookAngles)
        }

        let mixed = this.mixSignals(20, signal, noise, signalDbfv, this.noiseDbfv);

        const source = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, mixed.length, this.sampleRate);
        buffer.getChannelData(0).set(mixed);
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(this.audioLengthMs/1000);
        this.audioLengthMs += generateMs;
    }
}

