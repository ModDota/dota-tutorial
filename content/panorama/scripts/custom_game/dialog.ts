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
let currentToken: DialogToken | undefined = undefined;

function OnDialogReceived(data: NetworkedData<DialogReceivedEvent>) {
    dialogPanel.SetHasClass("Visible", true);
    dialogPanel.SetHasClass("ShowAdvanceButton", true);

    const unitName = Entities.GetUnitName(data.DialogEntIndex);
    if (!handleSpecialUnitPortrait(unitName)) {
        dialogImagePortrait.visible = false;
        dialogPortrait.visible = true;
        dialogPortrait.SetUnit(unitName, "", true);
    }
    dialogTitle.text = $.Localize("#" + unitName);

    currentCharacter = 0;
    dialogAdvanceTime = Game.GetGameTime() + data.DialogAdvanceTime;
    pendingDialog = $.Localize("#" + data.DialogText);
    dialogLabelSizer.text = pendingDialog;

    currentToken = data.Token;

    $.Schedule(characterAdvanceRate, AdvanceDialogThink);
}

function handleSpecialUnitPortrait(unitName: string): boolean {
    const unitPortraits: Record<string, string> = {
        [CustomNpcKeys.SunsFanMudGolem]: "file://{images}/custom_game/portraits/sunsfan_greevil.png",
        [CustomNpcKeys.SlacksMudGolem]: "file://{images}/custom_game/portraits/slacks_greevil.png",
        [CustomNpcKeys.ODPixel]: "file://{images}/custom_game/portraits/odpixel_lion.png",
        [CustomNpcKeys.ValkyrjaRuby]: "file://{images}/custom_game/credits/avatars/Ruby.png",
        [CustomNpcKeys.Yodi]: "file://{images}/custom_game/credits/avatars/Yodi.png",
        [CustomNpcKeys.Yoyo]: "file://{images}/custom_game/credits/avatars/Yoyo.png",
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
        currentToken = undefined;
        dialogPanel.SetHasClass("Visible", false);
        return;
    }

    // Check if dialog is over
    if (Game.GetGameTime() > dialogAdvanceTime) {
        dialogPanel.SetHasClass("Visible", false);
        const token = currentToken;
        currentToken = undefined;
        if (token) {
            GameEvents.SendCustomGameEventToServer("dialog_complete", { Token: token });
        }
        return;
    }

    // Update text. Hide advance button if we're at the end of the text.
    currentCharacter = Math.min(currentCharacter + 1, pendingDialog.length);
    if (currentCharacter === pendingDialog.length) {
        dialogLabel.text = pendingDialog;
        dialogPanel.SetHasClass("ShowAdvanceButton", false);
    } else {
        const visibleText = pendingDialog.substring(0, currentCharacter);
        dialogLabel.text = visibleText;
    }

    $.Schedule(characterAdvanceRate, AdvanceDialogThink);
}

function OnAdvanceDialogButtonPressed() {
    if (pendingDialog) {
        currentCharacter = pendingDialog.length;
    }
}

function HideDialog(event: DialogClearEvent) {
    if (currentToken === event.Token) {
        pendingDialog = undefined;
        currentToken = undefined;
        dialogPanel.SetHasClass("Visible", false);
    }
}

function OnCloseDialogButtonPressed() {
    pendingDialog = undefined;

    // Store current token in case SendCustomGameEventToServer directly calls the
    // server function which could start a new dialog rather than sending a network message.
    const token = currentToken;
    currentToken = undefined;
    $("#DialogPanel").SetHasClass("Visible", false);
    if (token) {
        GameEvents.SendCustomGameEventToServer("dialog_complete", { Token: token });
    }
}

GameEvents.Subscribe("dialog", OnDialogReceived);
GameEvents.Subscribe("dialog_clear", HideDialog);
