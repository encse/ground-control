// index.tsx
import { render } from "react-dom";
import { FormEvent, useEffect, useState } from "react";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L, { LatLngExpression, LatLngTuple } from "leaflet";
import { Satellite } from "./satellite";

import styled from "styled-components";
import { Observer } from "./observer";

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

const satelliteIcon = L.divIcon({
  className: "custom-marker",
  html: "🛰",
  iconSize: [40, 40],
});

const SatelliteMarker = (props: { time: Date; satellite: Satellite }) => {
  const position = props.satellite.getSatPos(props.time);
  if (position == null) {
    return <></>;
  } else {
    return <Marker icon={satelliteIcon} position={position} />;
  }
};

const RadioControl = () => {
  const [turnedOn, setTurnedOn] = useState(false);
  const toggle = () => {
    setTurnedOn(!turnedOn);
  };
  return (
    <div>
      <div>Radio</div>
      <div>
        <button onClick={toggle}>{turnedOn ? "On" : "Off"}</button>
      </div>
    </div>
  );
};

const TimeAdjustment = (
  props: { timeDelta: number; setTimeDelta: (n: number) => void },
) => {
  const callback = (e: FormEvent<HTMLInputElement>) => {
    props.setTimeDelta((e.target as HTMLInputElement).valueAsNumber);
  };
  return (
    <div>
      {props.timeDelta}
      <input
        type="range"
        value={props.timeDelta}
        min={-2000}
        max={2000}
        onInput={callback}
      />
    </div>
  );
};

type ControlPanelProps = {
  satellite: Satellite;
  observer: Observer;
  time: Date;
  timeDelta: number;
  setTimeDelta: (minutes: number) => void;
};

const ControlPanel = (props: ControlPanelProps) => {
  const lookAngles = props.satellite.getLookAngles(props.time, props.observer);
  return (
    <div>
      <TimeAdjustment
        timeDelta={props.timeDelta}
        setTimeDelta={props.setTimeDelta}
      />
      <RadioControl />
      <div>
        Time: {props.time.toLocaleDateString()}{" "}
        {props.time.toLocaleTimeString()}
      </div>
      <div>Frequency: {props.satellite.frequencyMhz} Mhz</div>
      <div>Range: {lookAngles?.rangeSat.toFixed(2)} km</div>
      <div>Elevation: {lookAngles?.elevation.toFixed(2)}º</div>
      <div>Azimuth: {lookAngles?.azimuth.toFixed(2)}º</div>
    </div>
  );
};

const App = (props: { satellite: Satellite }) => {
  const [timeDelta, setTimeDelta] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      let now = new Date();
      now.setMinutes(now.getMinutes() + timeDelta);
      console.log(now);
      setNow(now);
    }, 16);
    return () => clearInterval(intervalId);
  }, [timeDelta]);

  const observer = {
    lat: 47.49801,
    lng: 19.03991,
  };

  return (
    <div>
      <h1>Ground control</h1>
      <Horiz>
        <MapContainer
          style={{ height: "500px", width: "500px" }}
          zoom={1}
          center={observer}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={observer} />
          <SatelliteMarker time={now} satellite={props.satellite} />
        </MapContainer>
        <ControlPanel
          observer={observer}
          satellite={props.satellite}
          time={now}
          timeDelta={timeDelta}
          setTimeDelta={setTimeDelta}
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

// Mount your Preact app into the HTML element with the id 'app'
render(<Loader />, document.getElementById("app")!);
