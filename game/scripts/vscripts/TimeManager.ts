export class CustomTimeManager {
    time = 0;
    customTimeEnabled = false;
    callbacks: { seconds: number; fn: () => void }[] = [];

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
        print(seconds, minutes);
        CustomGameEventManager.Send_ServerToAllClients("set_client_clock", {
            seconds,
            minutes,
        });
    }

    registerCallBackOnTime(seconds: number, fn: () => void) {
        this.callbacks.push({ seconds, fn });
    }
    unRegisterCallBackOnTime(index: number) {
        this.callbacks.splice(index, 1);
    }
}
