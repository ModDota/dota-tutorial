export class DialogController {
    private voiceVolume = 1.2;
    private dialogMap = new Map<EntityIndex, UnitDialog>();
    private originalDirectionMap = new Map<EntityIndex, Vector>();

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
    public onDialogConfirm(source: EntityIndex, data: DialogConfirmEvent) {}

    // Unused
    public onDialogConfirmExpired(
        source: EntityIndex,
        data: DialogConfirmExpireEvent
    ) {}
}
