import { getOrError, getPlayerHero, getSoundDuration } from "./util"

class DialogController {
    private voiceVolume = 1.2;
    private dialogMap = new Map<EntityIndex, UnitDialog>();
    private originalDirectionMap = new Map<EntityIndex, Vector>();

    constructor() {
        CustomGameEventManager.RegisterListener("dialog_complete", (source, data: DialogCompleteEvent) => {
            this.onDialogEnded(source, data)
        })
        CustomGameEventManager.RegisterListener("dialog_confirm", (source, event: DialogConfirmEvent) => {
            this.onDialogConfirm(source, event)
        })
        CustomGameEventManager.RegisterListener("dialog_confirm_expire", (source, event: DialogConfirmExpireEvent) => {
            this.onDialogConfirmExpired(source, event)
        })
    }

    public giveUnitDialog(dialogUnit: CDOTA_BaseNPC, dialog: DialogData[]) {
        let entIndex = dialogUnit.GetEntityIndex();
        let unitDialog = {
            currentLine: 0,
            lines: dialog,
        };

        this.dialogMap.set(entIndex, unitDialog);
    }

    public getDialogLine(dialogUnit: CDOTA_BaseNPC, lineNumber: number) {
        const dialogData = this.dialogMap.get(dialogUnit.GetEntityIndex());
        if (dialogData) {
            const { lines, currentLine } = dialogData;
            return lines[currentLine];
        }
        return null;
    }

    public onDialogStart(hero: CDOTA_BaseNPC_Hero, dialogUnit: CDOTA_BaseNPC) {
        let unitDialog = this.dialogMap.get(dialogUnit.GetEntityIndex());

        if (!unitDialog) {
            print(`No Dialog found for ${dialogUnit.GetUnitName()}`);
            return;
        }

        let showAdvanceDialogButton = true;
        let currentLine = unitDialog.currentLine;
        let currentDialog = this.getDialogLine(dialogUnit, currentLine);
        let nextDialog = this.getDialogLine(dialogUnit, currentLine + 1);

        if (!currentDialog) {
            print(`Dialog exhausted for ${dialogUnit.GetUnitName()}`);
            return;
        }

        if (nextDialog == null || currentDialog.forceBreak) {
            showAdvanceDialogButton = false;
        }

        let netTable = {
            DialogEntIndex: dialogUnit.entindex(),
            PlayerHeroEntIndex: hero.entindex(),
            DialogText: currentDialog.text,
            DialogAdvanceTime: currentDialog.advanceTime,
            DialogLine: currentLine,
            ShowAdvanceButton: showAdvanceDialogButton,
            SendToAll: currentDialog.sendToAll,
        };

        if (!currentDialog.skipFacePlayer) {
            dialogUnit.FaceTowards(hero.GetOrigin());
            const originalDirection = dialogUnit
                .GetOrigin()
                .__add(dialogUnit.GetForwardVector().__mul(50));
            this.originalDirectionMap.set(
                dialogUnit.entindex(),
                originalDirection
            );
        }

        if (currentDialog.gesture) {
            dialogUnit.StartGesture(currentDialog.gesture);
        }

        if (currentDialog.sound) {
            dialogUnit.EmitSoundParams(
                currentDialog.sound,
                0,
                this.voiceVolume,
                0
            );
        }

        if (currentDialog.advance) {
            unitDialog.currentLine++;
        }

        if (currentDialog.dialogStopsMovement) {
            dialogUnit.SetMoveCapability(UnitMoveCapability.NONE);
        }

        if (currentDialog.sendToAll) {
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

        let dialogUnit = EntIndexToHScript(
            data.DialogEntIndex
        ) as CDOTA_BaseNPC;
        let hero = EntIndexToHScript(
            data.PlayerHeroEntIndex
        ) as CDOTA_BaseNPC_Hero;
        let lineNumber = data.DialogLine;
        let showNextLine = data.ShowNextLine;

        if (dialogUnit) {
            let currentDialog = this.getDialogLine(dialogUnit, lineNumber);
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
                this.onDialogStart(hero, dialogUnit);
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

const dialogController = new DialogController()

function playCommon(line: string, unit: CDOTA_BaseNPC, duration: number, soundName?: string) {
    const hero = getOrError(getPlayerHero(), "Can't find player hero")

    dialogController.giveUnitDialog(unit, [{
        text: line,
        advance: true,
        advanceTime: duration,
        gesture: GameActivity.DOTA_ATTACK,
        sendToAll: true,
        dialogStopsMovement: false,
        sound: soundName
    }])

    dialogController.onDialogStart(hero, unit)
}

/**
 * Plays a dialog with audio and text. Returns how long the dialog will be up for.
 * @param soundName Name of the sound.
 * @param text Text to show.
 * @param unit Unit that is speaking.
 * @param extraDuration Extra time to add on top of the sound duration.
 */
export function playAudio(soundName: string, text: string, unit: CDOTA_BaseNPC, extraDuration?: number) {
    const duration = getSoundDuration(soundName) + (extraDuration === undefined ? 0 : extraDuration)
    playCommon(text, unit, duration, soundName)
    return duration
}

/**
 * Plays a text-only dialog.
 * @param text Text to show.
 * @param unit Unit that is speaking.
 * @param duration Time to show the dialog for.
 */
export function playText(text: string, unit: CDOTA_BaseNPC, duration: number) {
    playCommon(text, unit, duration)
}
