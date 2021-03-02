interface DialogLinePanel extends LabelPanel {
    SetItem(unitName: string, text: string): void;
}

const MAX_CHAT_LENGTH = 50;
let lines: Panel[] = [];

function ToggleDialogLog() {
    $.Msg("ToggleDialogLog");

    $("#DialogLog").ToggleClass("Visible");
}

function Close() {
    $.Msg("ToggleDialogLog");

    $("#DialogLog").SetHasClass("Visible", false);
}

function AddLine(data: NetworkedData<DialogReceivedEvent>) {
    const { DialogText, DialogEntIndex } = data;
    const unitName = Entities.GetUnitName(data["DialogEntIndex"]);

    let linePanel = $.CreatePanel(
        "Panel",
        $("#DialogLineContainer"),
        ""
    ) as DialogLinePanel;

    linePanel.BLoadLayout(
        "file://{resources}/layout/custom_game/dialog_line.xml",
        false,
        false
    );

    linePanel.SetItem(unitName, DialogText);

    lines.push(linePanel);

    if (lines.length >= MAX_CHAT_LENGTH) {
        const lineToHide = lines.length - MAX_CHAT_LENGTH;
        lines[lineToHide].DeleteAsync(0);
    }

    $("#DialogLineContainer").ScrollToBottom();
}

GameEvents.Subscribe("dialog", AddLine);
