import * as satellite from 'satellite.js';
import { Observer } from './observer';
import { earthRadius } from './map';

type LookAnglesDeg = {
    azimuth: satellite.Degrees;
    elevation: satellite.Degrees;
    rangeSat: satellite.Kilometer;
}
export class Satellite {

    satelliteRecord: satellite.SatRec;
    audio: AudioBuffer;

    antennaPowerW: number;
    frequencyMhz: number;

    constructor(tle1: string, tle2: string, audio: AudioBuffer, antennaPowerW: number, frequencyMhz: number) {
        this.satelliteRecord = satellite.twoline2satrec(tle1, tle2);
        this.audio = audio;
        this.antennaPowerW = antennaPowerW;
        this.frequencyMhz = frequencyMhz;
    }

    getLookAngles(time: Date, observer: Observer): LookAnglesDeg | null {
        const posAndVelocity = satellite.propagate(this.satelliteRecord, time);
        if (!(posAndVelocity.position instanceof Object)) {
            return null;
        }

        const positionEcf = satellite.eciToEcf(posAndVelocity.position, satellite.gstime(time))

        const res = satellite.ecfToLookAngles(
            {
                height: 0,
                latitude: satellite.degreesToRadians(observer.lat),
                longitude: satellite.degreesToRadians(observer.lng)
            },
            positionEcf
        );

        if (res == null) {
            return res
        }
        return {
            azimuth: res.azimuth / Math.PI * 180,
            elevation: res.elevation / Math.PI * 180,
            rangeSat: res.rangeSat,
        }

    }

    
    sampleStart  = 0
    getSample(time: Date, signalLengthMs: number): Float32Array {

        const samplesRequired = Math.floor(signalLengthMs / 1000 * this.audio.sampleRate);

        const part1 = this.audio.getChannelData(0).subarray(
            this.sampleStart,
            this.sampleStart + samplesRequired
        )

        this.sampleStart += samplesRequired;
        this.sampleStart %= this.audio.getChannelData(0).length;

        const samplesCaptured =  part1.length
        if (samplesCaptured == samplesRequired) {
            return part1;
        }

        // wrap around
        const samplesMissing = samplesRequired - samplesCaptured;
        const res = new Float32Array(samplesRequired);
        res.set(part1)
        res.set(this.audio.getChannelData(0).subarray(0, samplesMissing), part1.length);
        return res;
    }

    getSatPos(time: Date): [number, number] | null {
        const positionEci = satellite.propagate(this.satelliteRecord, time);
        if (!(positionEci.position instanceof Object)) {
            return null;
        }

        const positionGd = satellite.eciToGeodetic(
            positionEci.position,
            satellite.gstime(time)
        );
        return [satellite.degreesLat(positionGd.latitude), satellite.degreesLong(positionGd.longitude)];
    }

    getElevation(time: Date): number | null {
        const positionEci = satellite.propagate(this.satelliteRecord, time);
        if (!(positionEci.position instanceof Object)) {
            return null;
        }
        return Math.sqrt(
            positionEci.position.x * positionEci.position.x +
            positionEci.position.y * positionEci.position.y +
            positionEci.position.z * positionEci.position.z) - earthRadius;
    }
}
