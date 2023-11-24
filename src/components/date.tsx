
export function DateTime(props: { time: Date }) {
    return props.time.toLocaleDateString() + " " + props.time.toLocaleTimeString();
}