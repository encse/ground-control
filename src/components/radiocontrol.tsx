import React from 'react';

import { useDispatch, useSelector } from "react-redux";
import { selectRadio, toggle } from "../redux/slices/radio";

function RadioControl() {
    const dispatch = useDispatch();
    const radio = useSelector(selectRadio);

    return (
        <div>
            <div>Radio</div>
            <div>
                <button onClick={() => dispatch(toggle())}>{radio.turnedOn ? "On" : "Off"}</button>
            </div>
        </div>
    );
};

export default RadioControl;