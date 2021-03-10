const characterAdvanceRate = 0.0075;

const dialogPanel = $("#DialogPanel");
const dialogTitle = $("#DialogTitle") as LabelPanel;
const dialogPortrait = $("#DialogPortrait") as ScenePanel;
const dialogImagePortrait = $("#DialogImagePortrait") as ImagePanel;
const dialogLabelSizer = $("#DialogLabelSizer") as LabelPanel;
const dialogLabel = $("#DialogLabel") as LabelPanel;

let dialogAdvanceTime = -1;
let currentCharacter = 0;
let pendingDialog: string | undefined = undefined;

function OnDialogReceived(data: NetworkedData<DialogReceivedEvent>) {
    dialogPanel.SetHasClass("Visible", true);
    dialogPanel.SetHasClass("ShowAdvanceButton", true);

    const unitName = Entities.GetUnitName(data.DialogEntIndex);
    if (!handleSpecialUnitPortrait(unitName)) {
        dialogImagePortrait.visible = false;
        dialogPortrait.visible = true;
        dialogPortrait.SetUnit(unitName, "", true);
    }
    dialogTitle.text = $.Localize(unitName);

    currentCharacter = 0;
    dialogAdvanceTime = Game.GetGameTime() + data.DialogAdvanceTime;
    pendingDialog = $.Localize(data.DialogText);
    dialogLabelSizer.text = pendingDialog;

    $.Schedule(characterAdvanceRate, AdvanceDialogThink);
}

function handleSpecialUnitPortrait(unitName: string): boolean {
    const unitPortraits: Record<string, string> = {
        npc_mud_golem_sunsfan: "file://{images}/custom_game/portraits/sunsfan_greevil.png",
        npc_mud_golem_slacks: "file://{images}/custom_game/portraits/slacks_greevil.png",
    };

    if (unitPortraits[unitName] !== undefined) {
        dialogPortrait.visible = false;
        dialogImagePortrait.visible = true;
        dialogImagePortrait.SetImage(unitPortraits[unitName]);

        return true;
    }

    return false;
}

function AdvanceDialogThink() {
    // Check if we have no dialog
    if (!pendingDialog) {
        dialogPanel.SetHasClass("Visible", false);
        return;
    }

    // Check if dialog is over
    if (Game.GetGameTime() > dialogAdvanceTime) {
        dialogPanel.SetHasClass("Visible", false);
        GameEvents.SendCustomGameEventToServer("dialog_complete", {});
        return;
    }

    // Update text. Hide advance button if we're at the end of the text.
    currentCharacter = Math.min(currentCharacter + 1, pendingDialog.length);
    if (currentCharacter === pendingDialog.length) {
        dialogLabel.text = pendingDialog;
        dialogPanel.SetHasClass("ShowAdvanceButton", false);
    } else {
        dialogLabel.text = `${pendingDialog.substring(0, currentCharacter)}<span class='HiddenText'>${pendingDialog.substring(currentCharacter, pendingDialog.length)}</span>`;
    }

    $.Schedule(characterAdvanceRate, AdvanceDialogThink);
}

function OnAdvanceDialogButtonPressed() {
    if (pendingDialog) {
        currentCharacter = pendingDialog.length;
    }
}

function HideDialog() {
    pendingDialog = undefined;
    dialogPanel.SetHasClass("Visible", false);
}

function OnCloseDialogButtonPressed() {
    pendingDialog = undefined;
    $("#DialogPanel").SetHasClass("Visible", false);
    GameEvents.SendCustomGameEventToServer("dialog_complete", {});
}

GameEvents.Subscribe("dialog", OnDialogReceived);
GameEvents.Subscribe("dialog_clear", HideDialog);
