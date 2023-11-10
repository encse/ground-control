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
        latitude: 40.7128,
        longitude: -74.0060,
        elevation: 0,
    }

    const clock = new Clock(new Date());


    const satellite = new Satellite(
        "1 25544U 98067A   23314.24517226  .00093162  00000+0  16505-2 0  9991",
        "2 25544  51.6416 325.0671 0002415 274.2971 187.0056 15.49490004424444",
        await loadAudio("sstv.mp3"),
        clock
    )

    const map = new Map(observer, satellite);
    const radio = new Radio(observer, satellite, clock);

    const button = document.createElement("button");
    button.textContent = "play";
    button.onclick = () => {radio.toggle()}
    document.body.append(button);
}


main()