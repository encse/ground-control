import { createSlice } from "@reduxjs/toolkit";

interface RadioState {
    turnedOn: boolean;
}

const initialState: RadioState = {
    turnedOn: false,
};

const slice = createSlice({
    name: "radio",
    initialState,
    reducers: {
        toggle: (state) => {
            state.turnedOn = !state.turnedOn;
        },
    },
});

export const { toggle } = slice.actions;
export const selectRadio = (state: { radio: RadioState }) => state.radio;
export default slice.reducer;
