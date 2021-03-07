import { getSoundDuration } from "./Sounds";
import { getOrError, getPlayerHero } from "./util";

// move this here because CDOTA_BaseNPC wasn't found in general.d.ts
interface DialogData {
    speaker: CDOTA_BaseNPC;
    text: string;
    advanceTime: number;
    sendToAll: boolean;
    advance: boolean;
    gesture: GameActivity;
    forceBreak?: boolean;
    skipFacePlayer?: boolean;
    dialogStopsMovement?: boolean;
    sound?: string;
}

class DialogController {
    private voiceVolume = 1.2;
    private currentLine: DialogData | undefined;
    private originalDirectionMap = new Map<EntityIndex, Vector>();
    private dialogQueue: DialogData[] = [];
    private onDialogEndedCallback: (() => void) | undefined = undefined;

    constructor() {
        CustomGameEventManager.RegisterListener(
            "dialog_complete",
            (source, data: DialogCompleteEvent) => {
                this.onDialogEnded(source, data);
            }
        );
        CustomGameEventManager.RegisterListener(
            "dialog_confirm",
            (source, event: DialogConfirmEvent) => {
                this.onDialogConfirm(source, event);
            }
        );
        CustomGameEventManager.RegisterListener(
            "dialog_confirm_expire",
            (source, event: DialogConfirmExpireEvent) => {
                this.onDialogConfirmExpired(source, event);
            }
        );
    }

    public stopCurrentSound() {
        if (this.currentLine) {
            const { speaker, sound } = this.currentLine;
            if (sound && speaker) {
                speaker.StopSound(sound);
            }
        }
    }

    public stopCurrentDialog() {
        CustomGameEventManager.Send_ServerToAllClients("dialog_clear", {});
        this.stopCurrentSound();
    }

    public addDialogToQueue(dialog: DialogData) {
        this.dialogQueue.push(dialog);
    }

    public clear() {
        this.dialogQueue = [];
        this.stopCurrentDialog();
    }

    public onDialogStart(hero: CDOTA_BaseNPC_Hero, onEnded?: () => void) {
        const dialog = this.dialogQueue.shift();

        // Set end callback if passed. This function is also called without the callback when
        // a dialog line ended where we don't want to overwrite the callback.
        if (onEnded) {
            this.onDialogEndedCallback = onEnded;
        }

        if (!dialog) {
            // Call on end callback if any
            const onEnded = this.onDialogEndedCallback
            if (onEnded) {
                this.onDialogEndedCallback = undefined;
                onEnded();
            }

            return;
        }

        const dialogUnit = dialog.speaker;

        if (!dialogUnit) {
            print("Dialog speaker doesn't exist!");
            return;
        }

        this.currentLine = dialog;
        let showAdvanceDialogButton = true;
        const nextDialog = this.dialogQueue[0];

        if (nextDialog == null || dialog.forceBreak) {
            showAdvanceDialogButton = false;
        }

        const netTable = {
            DialogEntIndex: dialogUnit.entindex(),
            PlayerHeroEntIndex: hero.entindex(),
            DialogText: dialog.text,
            DialogAdvanceTime: dialog.advanceTime,
            ShowAdvanceButton: showAdvanceDialogButton,
            SendToAll: dialog.sendToAll,
        };

        if (!dialog.skipFacePlayer) {
            dialogUnit.FaceTowards(hero.GetOrigin());
            const originalDirection = dialogUnit
                .GetOrigin()
                .__add(dialogUnit.GetForwardVector().__mul(50));
            this.originalDirectionMap.set(
                dialogUnit.entindex(),
                originalDirection
            );
        }

        if (dialog.gesture) {
            dialogUnit.StartGesture(dialog.gesture);
        }

        if (dialog.sound) {
            dialogUnit.EmitSoundParams(dialog.sound, 0, this.voiceVolume, 0);
        }

        if (dialog.dialogStopsMovement) {
            dialogUnit.SetMoveCapability(UnitMoveCapability.NONE);
        }

        if (dialog.sendToAll) {
            CustomGameEventManager.Send_ServerToAllClients("dialog", netTable);
        } else {
            CustomGameEventManager.Send_ServerToPlayer(
                hero.GetPlayerOwner(),
                "dialog",
                netTable
            );
        }
    }

    public onDialogEnded(source: EntityIndex, data: DialogCompleteEvent) {
        if (!data.DialogEntIndex) return;

        this.stopCurrentSound();

        let dialogUnit = EntIndexToHScript(
            data.DialogEntIndex
        ) as CDOTA_BaseNPC;
        let hero = EntIndexToHScript(
            data.PlayerHeroEntIndex
        ) as CDOTA_BaseNPC_Hero;
        let showNextLine = data.ShowNextLine;

        if (dialogUnit) {
            let currentDialog = this.dialogQueue[0];
            if (currentDialog) {
                const { skipFacePlayer, gesture } = currentDialog;

                if (!skipFacePlayer) {
                    dialogUnit.StopFacing();
                    const originalDirection = this.originalDirectionMap.get(
                        source
                    );
                    if (originalDirection) {
                        dialogUnit.FaceTowards(originalDirection);
                    }
                }

                if (gesture) {
                    dialogUnit.FadeGesture(gesture);
                }
            }

            if (showNextLine && hero) {
                this.onDialogStart(hero);
            }
        }
    }

    // Unused
    public onDialogConfirm(source: EntityIndex, data: DialogConfirmEvent) { }

    // Unused
    public onDialogConfirmExpired(
        source: EntityIndex,
        data: DialogConfirmExpireEvent
    ) { }
}

const dialogController = new DialogController();

function playCommon(
    line: string,
    unit: CDOTA_BaseNPC,
    duration: number,
    onEnded?: () => void,
    soundName?: string,
) {
    const hero = getOrError(getPlayerHero(), "Can't find player hero");

    dialogController.addDialogToQueue({
        speaker: unit,
        text: line,
        advance: true,
        advanceTime: duration,
        gesture: GameActivity.DOTA_ATTACK,
        sendToAll: true,
        dialogStopsMovement: false,
        sound: soundName,
    });

    dialogController.onDialogStart(hero, onEnded);
}

/**
 * Plays a dialog with audio and text. Returns how long the dialog will be up for.
 * @param soundName Name of the sound.
 * @param text Text to show.
 * @param unit Unit that is speaking.
 * @param extraDuration Extra time to add on top of the sound duration.
 */
export function playAudio(
    soundName: string,
    text: string,
    unit: CDOTA_BaseNPC,
    extraDuration?: number,
    onEnded?: () => void,
) {
    const duration = getSoundDuration(soundName) + (extraDuration === undefined ? 0 : extraDuration);
    print("Play audio", soundName, "duration:", getSoundDuration(soundName), "total-duration:", duration)
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
    dialogController.clear();
    const hero = getPlayerHero();
    if (hero) {
        dialogController.onDialogStart(hero);
    }
}
