export class CustomTimeManager {
    time = 0;
    customTimeEnabled = false;
    index = 0;
    callbacks: Map<number, CallBackRow> = new Map();

    constructor() {
        Timers.CreateTimer(() => {
            this.Think();
            return 1;
        });
    }

    Think() {
        if (this.customTimeEnabled == true) {
            this.time++;
            if (this.time > 59) {
                this.time = 0;
            }
            this.SetClockValue(this.time, undefined);
        } else {
            let dotatime = GameRules.GetDOTATime(false, false);
            let seconds = Math.floor(dotatime % 60);
            let minutes = Math.floor(dotatime / 60);
            this.time == seconds;
            this.SetClockValue(seconds, minutes);
        }

        this.callbacks.forEach((x) => {
            if (x.seconds == this.time) {
                x.fn();
            }
        });
    }

    SetClockValue(seconds: number, minutes?: number) {
        CustomGameEventManager.Send_ServerToAllClients("set_client_clock", {
            seconds,
            minutes,
        });
    }

    registerCallBackOnTime(seconds: number, fn: () => void) {
        this.callbacks.set(this.index, { seconds, fn });
        this.index++;
        return this.index - 1;
    }

    unRegisterCallBackOnTime(index: number) {
        if (this.callbacks.has(index)) {
            this.callbacks.delete(index);
        }
        
    }
}

interface CallBackRow {
    seconds: number;
    fn: () => void;
}
