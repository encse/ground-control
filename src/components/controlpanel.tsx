// index.tsx
import { FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Satellite } from ".././satellite";
import { Observer } from ".././observer";
import { selectDelta, selectNow, setDelta } from "../redux/slices/time";
import RadioControl from "./radiocontrol";

const TimeAdjustment = () => {
    const dispatch = useDispatch();

    const delta = useSelector(selectDelta);
    const callback = (e: FormEvent<HTMLInputElement>) => {
        dispatch(setDelta((e.target as HTMLInputElement).valueAsNumber));
    };
    return (
        <div>
            <input
                type="range"
                value={delta}
                min={-200}
                max={200}
                onInput={callback}
            />
            {delta}
        </div>
    );
};

type ControlPanelProps = {
    satellite: Satellite;
    observer: Observer;
};

const ControlPanel = (props: ControlPanelProps) => {
    const now = useSelector(selectNow);
    const lookAngles = props.satellite.getLookAngles(new Date(now), props.observer);
    return (
        <div>
            <TimeAdjustment />
            <RadioControl />
            <div>
                Time: {new Date(now).toLocaleDateString()} {new Date(now).toLocaleTimeString()}
            </div>
            <div>Frequency: {props.satellite.frequencyMhz} Mhz</div>
            <div>Range: {lookAngles?.rangeSat.toFixed(2)} km</div>
            <div>Elevation: {lookAngles?.elevation.toFixed(2)}º</div>
            <div>Azimuth: {lookAngles?.azimuth.toFixed(2)}º</div>
            <div>Tle:</div>
            <div>{props.satellite.tle1}</div>
            <div>{props.satellite.tle2}</div>
        </div>
    );
};


export default ControlPanel