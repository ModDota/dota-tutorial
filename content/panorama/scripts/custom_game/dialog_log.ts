// Not sure where a more appropriate place for this is
interface DialogLinePanel extends LabelPanel {
    SetItem(unitName: string, text: string): void;
}

function ToggleDialogLog() {
    $.Msg("ToggleDialogLog");

    $("#DialogLog").ToggleClass("Visible");
    Game.EmitSound("ui_chat_slide_out");
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

    $("#DialogLineContainer").ScrollToBottom();
}

GameEvents.Subscribe("dialog", AddLine);
