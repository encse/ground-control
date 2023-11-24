import React from "react";
import { Satellite } from "../models/satellite";
import { Observer } from "../models/observer";
import { DateTime } from "./date";

const Control = React.memo<{ satellite: Satellite, observer: Observer, timeMinutes: number }>((props) => {
    let passStartSeconds = props.timeMinutes * 60;
    let maxElevation = 0;

    // take five minute steps:
    for (let step = 0; step < 10000; step++) {
        const time = new Date(passStartSeconds * 1000)
        const lookAngles = props.satellite.getLookAngles(time, props.observer)
        const elevation = lookAngles?.elevation ?? 0;
        
        maxElevation = Math.max(maxElevation, elevation)
        if (maxElevation >= 2) {
            break;
        }
        passStartSeconds+=5*60;
    }

    if (maxElevation == 0) {
        return <>N/A</>;
    }

    // find the beginning of the pass walking backwards:
    for (; ;) {
        const time = new Date(passStartSeconds * 1000)
        const lookAngles = props.satellite.getLookAngles(time, props.observer)
        const elevation = lookAngles?.elevation ?? 0;
        if (elevation < 2) {
            break;
        }
        passStartSeconds--;
    }

    passStartSeconds++;

    //find the max elevation walking forwards
    for (let seconds = 0; ; seconds++) {
        const time = new Date((passStartSeconds + seconds) * 1000);
        const lookAngles = props.satellite.getLookAngles(time, props.observer)
        const elevation = lookAngles?.elevation ?? 0;

        maxElevation = Math.max(maxElevation, elevation)

        if (elevation < 2) {
            break;
        }
    }

    return <span> <DateTime time={new Date(passStartSeconds * 1000)} /> (max elevation: {maxElevation.toFixed(2)}º)</span>
})


export function NextPass(props: { satellite: Satellite, observer: Observer, time: Date }) {
    const timeMinutes = Math.floor(props.time.getTime() / 1000 / 60);
    return <Control satellite={props.satellite} observer={props.observer}  timeMinutes={timeMinutes} />
}

