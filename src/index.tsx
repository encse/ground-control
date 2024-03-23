// index.tsx
import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import { Satellite } from "./models/satellite";

import store from "./redux/store";
import { Radio } from "./models/radio";
import App from "./components/app";


const Loader = () => {
 
    const satelliteAntennaPowerW = 5;
    const frequencyMhz = 137.5;
    const receiverAntennaGainDb = 5; //for Yagi
    const noiseDb = -100;

    const observer = {
        lat: 47.49801,
        lng: 19.03991,
    };

    const satellite = new Satellite(
        "1 56541U 22096A   24314.56637269  .00000380  00000-0  22900-3 0  9995",
        "2 56541  99.0817   2.7100 0013809 187.3077 172.7896 14.12862697760358"
    );

    const radio = new Radio(
        observer,
        satellite,
        satelliteAntennaPowerW,
        frequencyMhz,
        receiverAntennaGainDb,
        noiseDb,
        "sstv.mp3",
        new Date(2023,11,1),
    );
    
    return <App satellite={satellite} radio={radio} observer={observer} />;
    
};

const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(
    <Provider store={store}>
        <Loader />
    </Provider>,
);
