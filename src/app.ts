import { Clock } from './clock';
import { Map } from './map';
import { Radio } from './radio';
import { Satellite } from './satellite';


async function loadAudio(url: string): Promise<AudioBuffer> {
    const result = await fetch(url);
    const arrayBuffer = await result.arrayBuffer();

    return new Promise((resolve, reject) => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContext.decodeAudioData(arrayBuffer, resolve, reject);
    });
}

async function main() {

    const observer = {
        latitude: 47.49801,
        longitude: 19.03991,
        elevation: 0,
    }


    const satelliteAntennaPowerW = 5; 
    const frequencyMhz = 137.5;
    const receiverAntennaGainDb = 5; //for Yagi
    const noiseDb = -100;
    const audio = await loadAudio("sstv.mp3")

    // const satellite = new Satellite(
    //     "1 25544U 98067A   23314.24517226  .00093162  00000+0  16505-2 0  9991",
    //     "2 25544  51.6416 325.0671 0002415 274.2971 187.0056 15.49490004424444",
    // )

    const satellite = new Satellite(
        "1 33591U 09005A   23314.56637269  .00000380  00000+0  22900-3 0  9998",
        "2 33591  99.0817   2.7100 0013809 187.3077 172.7896 14.12862697760358",
        audio,
        satelliteAntennaPowerW,
        frequencyMhz
    )
    const map = new Map(observer, satellite);
    const radio = new Radio(observer, satellite, audio.sampleRate, receiverAntennaGainDb, noiseDb);
    const epoch = new Date()
    const clock = new Clock(epoch);

    const slider = document.createElement("input");
    slider.setAttribute("type", "range");
    slider.min = "-100";
    slider.max = "100";
    document.body.appendChild(slider);
    slider.oninput = (e) => {
        const modified = new Date(epoch);
        modified.setMinutes(modified.getMinutes() + slider.valueAsNumber);
        clock.now = modified
    }
    
    const button = document.createElement("button");
    button.textContent = "play";
    button.onclick = () => {radio.toggle()}
    document.body.append(button);


    const clockDisplay = document.createElement("div");
    document.body.append(clockDisplay);
    
    const distanceKmDisplay = document.createElement("div");
    document.body.append(distanceKmDisplay);
    
    const signalStrengthDisplay = document.createElement("div");
    document.body.append(signalStrengthDisplay);
    
    const elevationDisplay = document.createElement("div");
    document.body.append(elevationDisplay);

    let now = new Date().getTime();
    setInterval(() => { 
        let dt = new Date().getTime() - now;
        const modified = clock.getTime(0);
        modified.setMilliseconds(modified.getMilliseconds() + dt);
        clock.now = modified
        
        map.tick(clock);
        radio.tick(clock);
        clockDisplay.textContent = clock.getTime(0).toISOString();

        const lookAngles = satellite.getLookAngles(clock.getTime(0), observer);

        distanceKmDisplay.textContent = 'range sat: ';
        signalStrengthDisplay.textContent = 'signal strength: ';
        
        if (lookAngles) {
            distanceKmDisplay.textContent += `${lookAngles.rangeSat.toFixed(0)} km`;
            const signalDb = radio.getSignalStrength(satellite.antennaPowerW, satellite.frequencyMhz, lookAngles);
            if (isFinite(signalDb)) {
                signalStrengthDisplay.textContent += `${signalDb.toFixed(0)} dB`;
            } else {
                signalStrengthDisplay.textContent += `- dB`;
            }
        }
        now += dt;
    }, 16);
}


main()