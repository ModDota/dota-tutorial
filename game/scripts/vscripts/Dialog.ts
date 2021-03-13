import { getSoundDuration } from "./Sounds";
import { getOrError, getPlayerHero } from "./util";

interface DialogData {
    speaker: CDOTA_BaseNPC;
    text: string;
    advanceTime: number;
    gesture: GameActivity;
    sound?: string;
}

class DialogController {
    private voiceVolume = 3;
    private currentLine: DialogData | undefined;
    private onDialogEndedCallback: (() => void) | undefined = undefined;
    private playing = false;

    constructor() {
        CustomGameEventManager.RegisterListener("dialog_complete", _ => this.onEnded());
    }

    private stopSound() {
        if (this.currentLine && this.currentLine.speaker && this.currentLine.sound && IsValidEntity(this.currentLine.speaker)) {
            this.currentLine.speaker.StopSound(this.currentLine.sound);
        }
    }

    /**
     * Forces the dialog to stop. Clears the dialog UI and stops the current sound.
     */
    public stop() {
        this.stopSound();
        this.playing = false;
        CustomGameEventManager.Send_ServerToAllClients("dialog_clear", {});
    }

    /**
     * Plays a dialog.
     * @param dialog Data for the dialog to be played.
     * @param onEnded Optional callback for when the dialog was completed (either actually completed or skipped on the client side).
     */
    public play(dialog: DialogData, onEnded?: () => void) {
        if (this.playing) {
            this.stopSound();
        }

        this.playing = true;
        // Set end callback if passed. This function is also called without the callback when
        // a dialog line ended where we don't want to overwrite the callback.
        if (onEnded) {
            this.onDialogEndedCallback = onEnded;
        }

        this.currentLine = dialog;
        const { gesture, sound, speaker, advanceTime, text } = dialog;

        const hero = getOrError(getPlayerHero());
        speaker.FaceTowards(hero.GetOrigin());

        if (gesture && speaker.IsAlive()) {
            speaker.StartGesture(gesture);
        }

        if (sound) {
            speaker.EmitSoundParams(sound, 0, this.voiceVolume, 0);
        }

        CustomGameEventManager.Send_ServerToAllClients("dialog", {
            DialogEntIndex: speaker.entindex(),
            DialogText: text,
            DialogAdvanceTime: advanceTime,
        });
    }

    /**
     * Called when the dialog ends naturally from the client (ie. not from a stop() call on the server).
     */
    private onEnded() {
        this.stopSound();
        this.playing = false;

        const dialogEndedCallback = this.onDialogEndedCallback
        if (dialogEndedCallback) {
            this.onDialogEndedCallback = undefined
            dialogEndedCallback()
        }
    }
}

let dialogController: DialogController | undefined = undefined;

/**
 * Initializes the dialog controller if it has not yet been initialized.
 */
export function init() {
    if (!dialogController) {
        dialogController = new DialogController();
    }
}

function playCommon(line: string, unit: CDOTA_BaseNPC, duration: number, onEnded?: () => void, soundName?: string) {
    const dialog: DialogData = {
        speaker: unit,
        text: line,
        advanceTime: duration,
        gesture: GameActivity.DOTA_ATTACK,
        sound: soundName,
    }

    getOrError(dialogController).play(dialog, onEnded);
}

/**
 * Plays a dialog with audio and text. Returns how long the dialog will be up for.
 * @param soundName Name of the sound.
 * @param text Text to show.
 * @param unit Unit that is speaking.
 * @param extraDuration Extra time to add on top of the sound duration.
 */
export function playAudio(soundName: string, text: string, unit: CDOTA_BaseNPC, extraDuration?: number, onEnded?: () => void) {
    const duration = getSoundDuration(soundName) + (extraDuration === undefined ? 0 : extraDuration);
    playCommon(text, unit, duration, onEnded, soundName);
}

/**
 * Plays a text-only dialog.
 * @param text Text to show.
 * @param unit Unit that is speaking.
 * @param duration Time to show the dialog for.
 */
export function playText(text: string, unit: CDOTA_BaseNPC, duration: number, onEnded?: () => void) {
    playCommon(text, unit, duration, onEnded);
}

/**
 * Clears the dialog queue and stops all current dialog.
 */
export function stop() {
    getOrError(dialogController).stop();
}
