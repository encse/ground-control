import { LookAngles } from 'satellite.js';
import { Observer } from './observer';
import { Satellite } from './satellite';

const bufferLengthMs = 1000;

export class Radio {
    satellite: Satellite;
    audioLengthMs: number = 0;
    audioStart: Date | undefined;
    audioContext: AudioContext | undefined;
    observer: Observer;
    antennaGainDb: number;
    noiseDbfv: number;

    audio: AudioBuffer | undefined;

    antennaPowerW: number;
    frequencyMhz: number;
    sampleStart = 0

    constructor(
        observer: Observer,
        satellite: Satellite,
        antennaPowerW: number,
        frequencyMhz: number,
        antennaGainDb: number,
        noiseDb: number,
        audioUrl:  string,
    ) {
        this.satellite = satellite;
        this.observer = observer;
        this.antennaGainDb = antennaGainDb;
        this.noiseDbfv = this.toDbfv(noiseDb);
        this.antennaPowerW = antennaPowerW;
        this.frequencyMhz = frequencyMhz;

        this.loadAudio(audioUrl);

    }

    async loadAudio(url: string) {
        const result = await fetch(url);
        const arrayBuffer = await result.arrayBuffer();

        this.audio = await new Promise((resolve, reject) => {
            const audioContext =
                new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });
    }


    getSample(audio: AudioBuffer, time: Date, signalLengthMs: number): Float32Array {

        const samplesRequired = Math.floor(signalLengthMs / 1000 * audio.sampleRate);

        const part1 = audio.getChannelData(0).subarray(
            this.sampleStart,
            this.sampleStart + samplesRequired
        )

        this.sampleStart += samplesRequired;
        this.sampleStart %= audio.getChannelData(0).length;

        const samplesCaptured = part1.length
        if (samplesCaptured == samplesRequired) {
            return part1;
        }

        // wrap around
        const samplesMissing = samplesRequired - samplesCaptured;
        const res = new Float32Array(samplesRequired);
        res.set(part1)
        res.set(this.audio!.getChannelData(0).subarray(0, samplesMissing), part1.length);
        return res;
    }

    private generateWhiteNoise(sampleRate: number, ms: number): Float32Array {
        const noise = new Float32Array(ms / 1000 * sampleRate);
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
        
        const mixedSignal = new Float32Array(noise.length);
        for (let i = 0; i < noise.length; i++) {
            mixedSignal[i] = volume * (scalingFactorSignal * signal[i] + scalingFactorNoise * noise[i]);
        }

        return mixedSignal;
    }

    tick(now: Date, turnedOn: boolean) {

        // 'now' is in simulation time but we generate audio in real time, so we need
        // to know how much time was spent since tick was last called, in order to
        // calculate when will the audio buffer run out
        let realNow = new Date();

        if (!turnedOn && this.audioContext) {
            this.audioContext.close();
            this.audioContext = undefined;
            this.audioLengthMs = 0;
            this.audioStart = undefined;
        } else if (turnedOn && !this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (!this.audioContext) {
            return;
        }

        if (!this.audioStart) {
            this.audioStart = realNow;
            this.audioLengthMs = 0;
        }

        let inBufferMs = Math.max(0, this.audioLengthMs - (realNow.getTime() - this.audioStart.getTime()));

        const generateMs = bufferLengthMs - inBufferMs;
        if (generateMs <= 0) {
            return;
        }

        let sampleRate = this.audio?.sampleRate ?? 22000;

        let noise: Float32Array
        let signalDbfv = -Infinity;
        let signal: Float32Array = new Float32Array(sampleRate * generateMs);
        
        noise = this.generateWhiteNoise(sampleRate, generateMs);

        if (this.audio != null) {
            // generate samples at the end of the buffer, so advance time by the buffered ms.
            now.setMilliseconds(now.getMilliseconds() + inBufferMs);

            signal = this.getSample(this.audio, now, generateMs);
            const lookAngles = this.satellite.getLookAngles(now, this.observer)
            if (lookAngles) {
                signalDbfv = this.getSignalStrength(this.antennaPowerW, this.frequencyMhz, lookAngles)
            }
        }

        let mixed = this.mixSignals(20, signal, noise, signalDbfv, this.noiseDbfv);

        const source = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, mixed.length, sampleRate);
        buffer.getChannelData(0).set(mixed);
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(this.audioLengthMs/1000);
        this.audioLengthMs += generateMs;
    }
}

