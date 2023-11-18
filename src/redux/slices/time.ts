import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface TimeState {
    now: number;
    delta: number;
}

const initialState: TimeState = {
    now: Date.now(),
    delta: 0,
};

const timeSlice = createSlice({
    name: "time",
    initialState,
    reducers: {
        setDelta: (state, action: PayloadAction<number>) => {
            state.delta = action.payload;
        },
        setNow: (state, action: PayloadAction<number>) => {
            state.now = action.payload;
        },
    },
});

export const { setDelta, setNow } = timeSlice.actions;
export const selectDelta = (state: { time: TimeState }) => state.time.delta;
export const selectNow = (state: { time: TimeState }) => state.time.now;
export default timeSlice.reducer;
