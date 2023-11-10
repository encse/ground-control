
export class Clock {
    epoch: Date;

    constructor(epoc: Date) {
        this.epoch = epoc;
    }

    getTime(seconds: number): Date {
        const modified = new Date(this.epoch);
        modified.setSeconds(modified.getSeconds() + seconds);
        return modified;
    }
}
