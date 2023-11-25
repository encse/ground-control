import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Observer } from "../models/observer";
import { Radio } from "../models/radio";
import { selectNow, selectDelta, setNow } from "../redux/slices/time";
import { Satellite } from "../models/satellite";
import Map from "./map";
import styled from "styled-components";
import { selectRadio, toggle } from "../redux/slices/radio";
import { NextPass } from "./nextpass";
import { DateTime } from "./date";

const InfoTable = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const InfoRow = styled.tr`
    border-bottom: 1px solid #ddd;
`;

const LabelCell = styled.th`
    text-align: left;
    padding: 8px;
    color: white;
`;

const DataCell = styled.td`
    text-align: left;
    padding: 8px;
`;

const Title = styled.h1`
    color: white;
`

const Footer = styled.div`
    padding: 24px;
    text-align: center;
`


const App = (props: { satellite: Satellite, radio: Radio, observer: Observer }) => {
    const dispatch = useDispatch();
    const now = new Date(useSelector(selectNow));
    const delta = useSelector(selectDelta);
    const radioTurnedOn = useSelector(selectRadio).turnedOn;

    const lookAngles = props.satellite.getLookAngles(new Date(now), props.observer);
    const radio = useSelector(selectRadio);

    useEffect(() => {
        props.radio.tick(now, radioTurnedOn);

        const id = setTimeout(() => {
            let now = new Date();
            now.setMinutes(now.getMinutes() + delta);
            dispatch(setNow(now.getTime()));


        }, 16);
        return () => clearTimeout(id);
    }, [now, delta, radioTurnedOn]);

    
    return (
        <div style={{ maxWidth: "800px", margin: "0 auto"}}>
            <Title>Ground control</Title>
            <p>Welcome to the command center of CSOKASAT-01, a virtual satellite soaring through the
                celestial expanse in a polar orbit! Embark on an exhilarating journey into the
                vastness of space, where cutting-edge technology meets the wonders of exploration.
                CSOKASAT-01, our state-of-the-art virtual satellite, is on a mission to capture the
                beauty of Earth from a unique perspective, transmitting continuous SSTV PD-120 images
                that showcase the breathtaking landscapes and phenomena our planet has to offer.
            </p>
         

            <InfoTable>
                <InfoRow>
                    <LabelCell>Local time:</LabelCell>
                    <DataCell><DateTime time={now}/></DataCell>
                </InfoRow>

                <InfoRow>
                    <LabelCell>Next pass:</LabelCell>
                    <DataCell><NextPass satellite={props.satellite} observer={props.observer} time={now} /></DataCell>
                </InfoRow>

                <InfoRow>
                    <LabelCell>Tle:</LabelCell>
                    <DataCell>
                        <div>{props.satellite.tle1}</div>
                        <div>{props.satellite.tle2}</div>
                    </DataCell>
                </InfoRow>

                <InfoRow>
                    <LabelCell>Range:</LabelCell>
                    <DataCell>{lookAngles?.rangeSat.toFixed(2)} km</DataCell>
                </InfoRow>

                <InfoRow>
                    <LabelCell>Elevation:</LabelCell>
                    <DataCell>{lookAngles?.elevation.toFixed(2)}º</DataCell>
                </InfoRow>

                <InfoRow>
                    <LabelCell>Azimuth:</LabelCell>
                    <DataCell>{lookAngles?.azimuth.toFixed(2)}º</DataCell>
                </InfoRow>

            </InfoTable>

            <p>
                Our station tracks the satellite as it orbits the Earth with a 5 elements Yagi antenna.
                The radio system is designed to decode the FM signal transmitted by the satellite, automatically
                adjusting for the Doppler shift. This ensures a reliable and continuous connection between the
                ground control and the satellite, providing valuable data and insights during its journey in space.
            </p>

            <InfoTable>
                <InfoRow>
                    <LabelCell>Radio:</LabelCell>
                    <DataCell> <button onClick={() => dispatch(toggle())}>{radio.turnedOn ? "On" : "Off"}</button></DataCell>
                </InfoRow>
                <InfoRow>
                    <LabelCell>Frequency:</LabelCell>
                    <DataCell>{props.radio.frequencyMhz} Mhz</DataCell>
                </InfoRow>
            </InfoTable>

            <p></p>
            
            <Map
                    style={{ height: "500px", width: "800px", border: "16px solid white" }}
                    satellite={props.satellite}
                    observer={props.observer}
                    time={now}
            />
            
            <Footer>
                <div>
                2023 - csokavar.hu - text by ChatGpt
                </div>
            </Footer>
            
        </div>
    );
};

export default App;