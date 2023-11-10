import * as satellite from 'satellite.js';
import { Clock } from './clock';
import { Observer } from './observer';
import { earthRadius } from './map';


export class Satellite {

    satelliteRecord: satellite.SatRec;
    audio: AudioBuffer;

    antennaPowerW = 5;
    frequencyMhz = 137.5;
    clock: Clock;

    constructor(tle1: string, tle2: string, audio: AudioBuffer, clock: Clock) {
        this.satelliteRecord = satellite.twoline2satrec(tle1, tle2);
        this.audio = audio;
        this.clock = clock;
    }

    getDistanceKm(observer: Observer, seconds: number): number | null {
        const posAndVelocity = satellite.propagate(this.satelliteRecord, this.clock.getTime(seconds));
        if (!(posAndVelocity.position instanceof Object)) {
            return null;
        }

        const gmst = satellite.gstime(this.clock.getTime(seconds));
        const positionEcf  = satellite.eciToEcf(posAndVelocity.position, gmst)

        return satellite.ecfToLookAngles(
            { height: observer.elevation, latitude: observer.latitude, longitude: observer.longitude },
            positionEcf
        ).rangeSat
    }

    getOneSecondSignalSample(seconds: number): Float32Array {
        seconds %= this.audio.duration;

        const part1 = this.audio.getChannelData(0).subarray(
            this.audio.sampleRate * seconds,
            this.audio.sampleRate * (seconds + 1)
        )
        
        if (part1.length == this.audio.sampleRate) {
            return part1
        }

        // pad with silence
        const res = new Float32Array(this.audio.sampleRate);
        res.set(part1)
        return res;
    }

    getSatPos(seconds: number): [number, number] | null {
        const positionEci = satellite.propagate(this.satelliteRecord, this.clock.getTime(seconds));
        if (!(positionEci.position instanceof Object)) {
            return null;
        }

        const positionGd = satellite.eciToGeodetic(
            positionEci.position,
            satellite.gstime(this.clock.getTime(seconds))
        );
        return [satellite.degreesLat(positionGd.latitude), satellite.degreesLong(positionGd.longitude)];
    }

    getElevation(seconds: number): number | null {
        const positionEci = satellite.propagate(this.satelliteRecord, this.clock.getTime(seconds));
        if (!(positionEci.position instanceof Object)) {
            return null;
        }
        return Math.sqrt(
            positionEci.position.x * positionEci.position.x +
            positionEci.position.y * positionEci.position.y +
            positionEci.position.z * positionEci.position.z) - earthRadius;
    }
}
