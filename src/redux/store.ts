import { configureStore } from "@reduxjs/toolkit";
import counter from "./slices/counter";
import time from "./slices/time";
import radio from "./slices/radio";


export default configureStore({
    reducer: {
        counter: counter,
        time: time,
        radio: radio
    },
});

