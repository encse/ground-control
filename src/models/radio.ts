import { LookAngles } from 'satellite.js';
import { Observer } from './observer';
import { Satellite } from './satellite';

const bufferLengthSeconds = 1;
export class Radio {
    satellite: Satellite;
    audioContext: AudioContext | undefined;
    audioEndSeconds: number = 0;
    observer: Observer;
    antennaGainDb: number;
    noiseDbfv: number;

    audio: AudioBuffer | undefined;

    antennaPowerW: number;
    frequencyMhz: number;
    sampleStart = 0
    epoch: Date;

    constructor(
        observer: Observer,
        satellite: Satellite,
        antennaPowerW: number,
        frequencyMhz: number,
        antennaGainDb: number,
        noiseDb: number,
        audioUrl: string,
        epoch: Date,
    ) {
        this.satellite = satellite;
        this.observer = observer;
        this.antennaGainDb = antennaGainDb;
        this.noiseDbfv = this.toDbfv(noiseDb);
        this.antennaPowerW = antennaPowerW;
        this.frequencyMhz = frequencyMhz;
        this.epoch = epoch;
        this.loadAudio(audioUrl);
    }

    async loadAudio(url: string) {
        const result = await fetch(url);
        const arrayBuffer = await result.arrayBuffer();

        this.audio = await new Promise((resolve, reject) => {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });

        this.adjustSampleStartToEpoch();
    }

    adjustSampleStartToEpoch() {
        if (this.audio != null) {
            const msSinceEpoch = new Date().getTime() - this.epoch.getTime();
            this.sampleStart = Math.floor(msSinceEpoch / 1000 * this.audio.sampleRate);
            this.sampleStart %= this.audio.getChannelData(0).length;
        }
    }

    getSampleRate(audio: AudioBuffer | undefined) {
        return audio?.sampleRate ?? 22000;
    }

    getSample(audio: AudioBuffer | undefined, signalLengthSeconds: number): Float32Array {

        if (!audio) {
            return new Float32Array(signalLengthSeconds * this.getSampleRate(audio));
        }
        
        const samplesRequired = Math.floor(signalLengthSeconds * audio.sampleRate);

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

    private generateWhiteNoise(sampleRate: number, seconds: number): Float32Array {
        const noise = new Float32Array(seconds * sampleRate);
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

        // lookAngles.rangeSat = 600;
        // lookAngles.elevation = 2;
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
        
        if (!turnedOn) {
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = undefined;
            }
            return;
        }

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.audioEndSeconds = 0;
            this.adjustSampleStartToEpoch();
        }

        let bufferedSeconds = Math.max(0, this.audioEndSeconds - this.audioContext.currentTime);
        let generateSeconds = bufferLengthSeconds - bufferedSeconds;
        //  generate chunks rounded to 10ms, otherwise floating point errors will generate skew in the image.
        generateSeconds = Math.floor(generateSeconds * 100) / 100;
        if (generateSeconds <= 0) {
            return;
        }

        const sampleRate = this.getSampleRate(this.audio)

        const noise = this.generateWhiteNoise(sampleRate, generateSeconds);

        // when calculating the look angles we need to check the position of the
        // satellite at the end of the buffer
        const signal = this.getSample(this.audio, generateSeconds);
        let signalDbfv = -Infinity;
        now.setSeconds(now.getSeconds() + bufferedSeconds);
        const lookAngles = this.satellite.getLookAngles(now, this.observer)
        if (lookAngles) {
            signalDbfv = this.getSignalStrength(this.antennaPowerW, this.frequencyMhz, lookAngles)
        }
        
        let mixed = this.mixSignals(20, signal, noise, signalDbfv, this.noiseDbfv);

        const source = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, mixed.length, sampleRate);
        buffer.getChannelData(0).set(mixed);
        source.buffer = buffer;
        source.start(this.audioEndSeconds);
        source.connect(this.audioContext.destination);

        this.audioEndSeconds += generateSeconds;
    }
}

