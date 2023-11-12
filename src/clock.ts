
export class Clock {
    now: Date;

    constructor(epoc: Date) {
        this.now = epoc;
    }

    getTime(seconds: number): Date {
        const modified = new Date(this.now);
        modified.setSeconds(modified.getSeconds() + seconds);
        return modified;
    }
}
