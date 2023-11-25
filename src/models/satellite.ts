import * as satellite from 'satellite.js';
import { Observer } from './observer';

const earthRadius = 6378.13;

export type LookAnglesDeg = {
    azimuth: satellite.Degrees;
    elevation: satellite.Degrees;
    rangeSat: satellite.Kilometer;
}
export class Satellite {

    public satelliteRecord: satellite.SatRec;

    tle1: string;
    tle2: string;

    constructor(tle1: string, tle2: string) {
        this.tle1 = tle1;
        this.tle2 = tle2;
        this.satelliteRecord = satellite.twoline2satrec(tle1, tle2);
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
