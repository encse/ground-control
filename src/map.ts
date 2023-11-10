import * as L from 'leaflet';
import { Observer } from './observer';
import { Satellite } from './satellite';
import { Clock } from './clock';

export const earthRadius = 6378.13;


export class Map {

    map: L.Map;
    observer: Observer;
    satellite: Satellite;
    path: L.Polyline<any>[] | undefined;
    footPrint: L.Circle<any> | undefined;
    satelliteMarker: L.Marker<any> | undefined;
    observerMarker: L.Marker<any> | undefined;

    constructor(observer: Observer, satellite: Satellite) {

        this.map = L.map('map').setView([observer.latitude, observer.longitude], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        this.observer = observer;
        this.satellite = satellite;
        setInterval(() => this.drawMap(), 1)
    }

    drawMap() {
        function hasWrapAround(prevValue: number, newValue: number): boolean {
            // Calculate the absolute difference between the two values
            const diff = Math.abs(newValue - prevValue);

            // Check if the absolute difference exceeds 180 degrees
            return diff > 180;
        }

        if (!this.path) {
            this.path = [];
            const numPoints = 200;
            for (let i = 1; i < numPoints; i++) {
                const line = L.polyline([[0, 0], [0, 0]], { color: 'blue' });
                this.path.push(line);
            }
        }

        if (!this.footPrint) {
            this.footPrint = L.circle([0, 0], {
                color: '#A80000',
                fillColor: '#FFA6A6',
                fillOpacity: 0.4,
                opacity: 0.7,
                weight: 1,
                radius: 1,
            });
            this.footPrint.addTo(this.map);
        }

        if (!this.satelliteMarker) {
            this.satelliteMarker = L.marker(
                [0, 0],
                { icon: L.divIcon({ className: 'custom-marker', html: '🛰', iconSize: [40, 40] }) }
            );
            this.satelliteMarker.addTo(this.map);
        }

        if (!this.observerMarker) {
            this.observerMarker = L.marker(
                [0, 0],
                { icon: L.divIcon({ className: 'custom-marker', html: '📍', iconSize: [40, 40] }) }
            );
            this.observerMarker.addTo(this.map);
        }


        for (let i = 0; i < this.path.length; i++) {
            const tMin = (i - this.path.length / 2) * 60;

            const prev = this.satellite.getSatPos(tMin - 60);
            const curr = this.satellite.getSatPos(tMin);

            if (!prev || !curr || hasWrapAround(prev[0], curr[0]) || hasWrapAround(prev[1], curr[1])) {
                this.path[i].remove();
                continue;
            }

            if (tMin < 0) {
                this.path[i].setLatLngs([prev, curr]);
                this.path[i].addTo(this.map);
            } else {
                this.path[i].setLatLngs([prev, curr]);
                this.path[i].addTo(this.map);
            }
        }


        this.observerMarker.setLatLng([this.observer.latitude, this.observer.longitude]);

        let satelliteCurr = this.satellite.getSatPos(0);
        if (satelliteCurr) {
            this.satelliteMarker?.setLatLng(satelliteCurr);

            const elevation = this.satellite.getElevation(0);
            if (elevation) {
                const alpha = Math.acos(earthRadius / (earthRadius + elevation));
                const footPrintRadius = alpha * earthRadius * 1000;
                this.footPrint.setLatLng(satelliteCurr);
                this.footPrint.setRadius(footPrintRadius);
            }
        }
    }
}
