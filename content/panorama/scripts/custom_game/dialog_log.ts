interface DialogLinePanel extends LabelPanel {
    SetItem(unitName: string, text: string): void;
}

const MAX_CHAT_LENGTH = 50;
const lines: Panel[] = [];

function ToggleDialogLog() {
    $.Msg("ToggleDialogLog");

    $("#DialogLog").ToggleClass("Visible");
    Game.EmitSound("ui_chat_slide_in");

    $.Schedule(0.1, () => $("#DialogLineContainer").ScrollToBottom());
}

function Close() {
    $.Msg("ToggleDialogLog");

    $("#DialogLog").SetHasClass("Visible", false);
    Game.EmitSound("ui_chat_slide_out");
}

function AddLine(data: NetworkedData<DialogReceivedEvent>) {
    const { DialogText } = data;
    const unitName = Entities.GetUnitName(data["DialogEntIndex"]);

    const linePanel = $.CreatePanel("Panel", $("#DialogLineContainer"), "") as DialogLinePanel;

    linePanel.BLoadLayout("file://{resources}/layout/custom_game/dialog_line.xml", false, false);

    linePanel.SetItem(unitName, DialogText);

    lines.push(linePanel);

    if (lines.length >= MAX_CHAT_LENGTH) {
        const lineToHide = lines.length - MAX_CHAT_LENGTH;
        lines[lineToHide].DeleteAsync(0);
    }

    $.Schedule(0.1, () => $("#DialogLineContainer").ScrollToBottom());
}

GameEvents.Subscribe("dialog", AddLine);
