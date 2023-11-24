import L from "leaflet";
import { Observer } from "../models/observer";
import { Satellite } from "../models/satellite";
import { Circle, Polyline, MapContainer, Marker, TileLayer } from "react-leaflet";
import React, { type CSSProperties, type ReactNode } from 'react';

const satelliteIcon = L.divIcon({
    className: "custom-marker",
    html: "🛰",
    iconSize: [40, 40],
});


const Footprint = (props: { position: L.LatLngExpression, elevation: number }) => {
    const earthRadius = 6378.13;
    const alpha = Math.acos(earthRadius / (earthRadius + props.elevation));
    const footPrintRadius = alpha * earthRadius * 1000;
    return <Circle
        radius={footPrintRadius}
        center={props.position}
        color="#A80000"
        fillColor="#FFA6A6"
        opacity={0.7}
        weight={1}
    />
}

const SatelliteIcon = (props: { position: L.LatLngExpression }) =>
    <Marker icon={satelliteIcon} position={props.position} />
    
type SatelliteComponentProps = {
    satellite: Satellite,
    timeSeconds: number
}

const SatelliteComponent = React.memo<SatelliteComponentProps>((props) => {

    const time = new Date(props.timeSeconds * 1000);
    const pos = props.satellite.getSatPos(time);
    const elevation = props.satellite.getElevation(time);

    const timeAt = (minutes: number): Date => {
        const modified = new Date(time);
        modified.setMinutes(modified.getMinutes() + minutes);
        return modified;
    }

    const hasWrapAround = (prevValue: number, newValue: number): boolean => {
        // Calculate the absolute difference between the two values
        const diff = Math.abs(newValue - prevValue);

        // Check if the absolute difference exceeds 180 degrees
        return diff > 180;
    }

    const path = [];
    const numPoints = 200;

    
    for (let i = 0; i < numPoints; i++) {
        const dtMinutes = i - numPoints / 2;
        
        const prev = props.satellite.getSatPos(timeAt(dtMinutes - 1))!;
        const curr = props.satellite.getSatPos(timeAt(dtMinutes))!;

        let color = "blue";
        let opacity = 1;
        if (hasWrapAround(prev[0], curr[0]) || hasWrapAround(prev[1], curr[1])) {
            console.log(dtMinutes, prev, curr)
            opacity = 0;
        }

        if (dtMinutes < 1) {
            opacity *= 0.1;
        }

        path.push(<Polyline pathOptions={{color: color, opacity: opacity}} key={dtMinutes} positions={[prev, curr]}  />)
    }

    if (pos && elevation) {
        return <>
            <SatelliteIcon position={pos} />
            <Footprint position={pos} elevation={elevation} />
            {path}
        </>;
    } else {
        return <></>
    }
})

export type MapProps = {
    observer: Observer,
    satellite: Satellite,
    time: Date,
    style?: CSSProperties;
}

export default function Map(props: MapProps) {
    const timeSeconds = Math.floor(props.time.getTime() / 1000);

    return <MapContainer
        style={props.style}
        zoom={1}
        center={props.observer}
    >
        <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={props.observer} />
        <SatelliteComponent satellite={props.satellite} timeSeconds={timeSeconds} />
        
    </MapContainer>
}