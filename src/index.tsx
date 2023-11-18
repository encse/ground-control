// index.tsx
import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider, useDispatch, useSelector } from "react-redux";

import { Satellite } from "./satellite";
import Map from "./components/map";
import styled from "styled-components";
import store from "./redux/store";
import { selectDelta, selectNow, setNow } from "./redux/slices/time";
import ControlPanel from "./components/controlpanel";

const Horiz = styled.div`
    display: flex;
`;

async function loadAudio(url: string): Promise<AudioBuffer> {
    const result = await fetch(url);
    const arrayBuffer = await result.arrayBuffer();

    return new Promise((resolve, reject) => {
        const audioContext =
            new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContext.decodeAudioData(arrayBuffer, resolve, reject);
    });
}


const App = (props: { satellite: Satellite }) => {
    const dispatch = useDispatch();

    const now = new Date(useSelector(selectNow));
    const delta = useSelector(selectDelta);

    useEffect(() => {
        const id = setTimeout(() => {
            let now = new Date();
            now.setMinutes(now.getMinutes() + delta);
            dispatch(setNow(now.getTime()));
        }, 16);
        return () => clearTimeout(id);
    }, [now, delta]);

    const observer = {
        lat: 47.49801,
        lng: 19.03991,
    };

    return (
        <div>
            <h1>Ground control</h1>
            <Horiz>
                <Map style={{ height: "500px", width: "800px" }} satellite = {props.satellite} observer={observer} time={now} />
                <ControlPanel
                    observer={observer}
                    satellite={props.satellite}
                />
            </Horiz>
        </div>
    );
};

const Loader = () => {
    const satelliteAntennaPowerW = 5;
    const frequencyMhz = 137.5;
    const receiverAntennaGainDb = 5; //for Yagi
    const noiseDb = -100;

    const [audio, setAudio] = useState<AudioBuffer | null>(null);
    useEffect(() => {
        const foo = async () => {
            const audio = await loadAudio("sstv.mp3");
            setAudio(audio);
        };
        foo();
    }, []);

    if (audio == null) {
        return <div>loading</div>;
    } else {
        const satellite = new Satellite(
            "1 33591U 09005A   23314.56637269  .00000380  00000+0  22900-3 0  9998",
            "2 33591  99.0817   2.7100 0013809 187.3077 172.7896 14.12862697760358",
            audio,
            satelliteAntennaPowerW,
            frequencyMhz,
        );
        return <App satellite={satellite} />;
    }
};

const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(
    <Provider store={store}>
        <Loader />
    </Provider>,
);
