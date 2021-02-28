"use strict";

let g_flDialogAdvanceTime = -1;
let g_nCurrentCharacter = 0;
let g_flCharacterAdvanceRate = 0.0075;
let g_szPendingDialog: string | null = null;
let g_nCurrentDialogEnt: EntityIndex | null = null;
let g_nCurrentDialogLine = -1;
let g_bSentToAll = false;
let g_szConfirmToken: string | undefined = undefined;
let g_bShowAdvanceButton = 1;
const flThink = 0.005;

function OnDialogReceived(data: NetworkedData<DialogReceivedEvent>) {
    if (data["DialogText"] === "") return;

    g_bSentToAll = data["SendToAll"] === 1;
    if (!g_bSentToAll) {
        let vAbsOrigin = Entities.GetAbsOrigin(data["DialogEntIndex"]);
        let nX = Game.WorldToScreenX(
            vAbsOrigin[0],
            vAbsOrigin[1],
            vAbsOrigin[2]
        );
        let nY = Game.WorldToScreenY(
            vAbsOrigin[0],
            vAbsOrigin[1],
            vAbsOrigin[2]
        );
        $("#FloatingDialogPanel").style.x = nX + 25 + "px";
        $("#FloatingDialogPanel").style.y = nY - 100 + "px";
    }

    $("#DialogPanel").SetHasClass("Visible", g_bSentToAll);
    $("#FloatingDialogPanel").SetHasClass("Visible", !g_bSentToAll);
    ($("#DialogTitle") as LabelPanel).text = $.Localize(
        Entities.GetUnitName(data["DialogEntIndex"])
    );
    ($("#DialogPortrait") as ScenePanel).SetUnit(
        Entities.GetUnitName(data["DialogEntIndex"]),
        "",
        true
    );
    $("#DialogPanel").SetHasClass("ShowAdvanceButton", true);
    $("#FloatingDialogPanel").SetHasClass("ShowAdvanceButton", true);

    g_bShowAdvanceButton = data["ShowAdvanceButton"];
    g_nCurrentCharacter = 0;
    g_nCurrentDialogEnt = data["DialogEntIndex"];
    g_nCurrentDialogLine = data["DialogLine"];
    g_szPendingDialog = $.Localize(data["DialogText"]);
    g_szConfirmToken = data["ConfirmToken"];
    if (!g_bSentToAll) {
        let szFullHeroName = Entities.GetUnitName(data["PlayerHeroEntIndex"]);
        let szHeroName = szFullHeroName.substring(13, szFullHeroName.length);
        let szHeroLocalizedDialog = $.Localize(data["DialogText"] + szHeroName);
        if (szHeroLocalizedDialog !== data["DialogText"] + szHeroName) {
            g_szPendingDialog = szHeroLocalizedDialog;
        }
    }

    ($("#DialogLabelSizer") as LabelPanel).text = g_szPendingDialog;
    ($("#FloatingDialogLabelSizer") as LabelPanel).text = g_szPendingDialog;

    $("#DialogPanel").SetHasClass(
        "ConfirmStyle",
        data["DialogPlayerConfirm"] == 1
    );
    $("#DialogPlayerConfirm").SetHasClass(
        "Visible",
        data["DialogPlayerConfirm"] == 1
    );
    $("#ConfirmButton").SetHasClass(
        "Visible",
        data["DialogPlayerConfirm"] == 1
    );

    $("#DialogPanel").SetDialogVariableInt("player_id_0", 0);
    $("#DialogPanel").SetDialogVariableInt("player_id_1", 1);
    $("#DialogPanel").SetDialogVariableInt("player_id_2", 2);
    $("#DialogPanel").SetDialogVariableInt("player_id_3", 3);

    g_flDialogAdvanceTime = Game.GetGameTime() + data["DialogAdvanceTime"];

    $.Schedule(g_flCharacterAdvanceRate, AdvanceDialogThink);
}

function AdvanceDialogThink() {
    if (
        Game.GetGameTime() > g_flDialogAdvanceTime ||
        g_szPendingDialog === null
    ) {
        if ($("#DialogPlayerConfirm").BHasClass("Visible")) {
            GameEvents.SendCustomGameEventToServer("dialog_confirm_expire", {
                ConfirmToken: g_szConfirmToken,
                DialogEntIndex: g_nCurrentDialogEnt,
                DialogLine: g_nCurrentDialogLine,
            });
            GameEvents.SendCustomGameEventToServer("dialog_complete", {
                DialogEntIndex: g_nCurrentDialogEnt,
                DialogLine: g_nCurrentDialogLine,
                ShowNextLine: 0,
                PlayerHeroEntIndex: Players.GetPlayerHeroEntityIndex(
                    Players.GetLocalPlayer()
                ),
            });
        } else {
            $("#DialogPanel").SetHasClass("Visible", false);
            $("#FloatingDialogPanel").SetHasClass("Visible", false);
            GameEvents.SendCustomGameEventToServer("dialog_complete", {
                DialogEntIndex: g_nCurrentDialogEnt,
                DialogLine: g_nCurrentDialogLine,
                ShowNextLine: 0,
                PlayerHeroEntIndex: Players.GetPlayerHeroEntityIndex(
                    Players.GetLocalPlayer()
                ),
            });
        }
        return;
    }

    g_nCurrentCharacter = Math.min(
        g_nCurrentCharacter + 1,
        g_szPendingDialog.length
    );
    if (g_nCurrentCharacter === g_szPendingDialog.length) {
        ($("#DialogLabel") as LabelPanel).text = g_szPendingDialog;
        ($("#FloatingDialogLabel") as LabelPanel).text = g_szPendingDialog;
        $("#DialogPanel").SetHasClass(
            "ShowAdvanceButton",
            g_bShowAdvanceButton == 1
        );
        $("#FloatingDialogPanel").SetHasClass(
            "ShowAdvanceButton",
            g_bShowAdvanceButton == 1
        );
    }

    ($("#DialogLabel") as LabelPanel).text =
        g_szPendingDialog.substring(0, g_nCurrentCharacter) +
        "<span class='HiddenText'>" +
        g_szPendingDialog.substring(
            g_nCurrentCharacter,
            g_szPendingDialog.length
        ) +
        "</span>";
    ($(
        "#FloatingDialogLabel"
    ) as LabelPanel).text = g_szPendingDialog.substring(0, g_nCurrentCharacter);

    $.Schedule(g_flCharacterAdvanceRate, AdvanceDialogThink);
}

function OnAdvanceDialogButtonPressed() {
    $.Msg("AdvanceDialogButtonPressed");
    if (
        g_szPendingDialog != null &&
        g_nCurrentCharacter < g_szPendingDialog.length
    ) {
        g_nCurrentCharacter = g_szPendingDialog.length;
        AdvanceDialogThink();
        return;
    } else {
        if (!g_bShowAdvanceButton) {
            $("#DialogPanel").SetHasClass("Visible", false);
            $("#FloatingDialogPanel").SetHasClass("Visible", false);
        }
        GameEvents.SendCustomGameEventToServer("dialog_complete", {
            DialogEntIndex: g_nCurrentDialogEnt,
            DialogLine: g_nCurrentDialogLine,
            ShowNextLine: g_bShowAdvanceButton,
            PlayerHeroEntIndex: Players.GetPlayerHeroEntityIndex(
                Players.GetLocalPlayer()
            ),
        });
    }
}

function OnConfirmButtonPressed() {
    GameEvents.SendCustomGameEventToServer("dialog_confirm", {
        nPlayerID: Players.GetLocalPlayer(),
        ConfirmToken: g_szConfirmToken,
        DialogEntIndex: g_nCurrentDialogEnt,
        DialogLine: g_nCurrentDialogLine,
    });
    $("#ConfirmButton").AddClass("Confirmed");
}

function OnDialogPlayerConfirm(data: DialogConfirmedEvent) {
    $("#Player" + data["PlayerID"] + "Confirm").AddClass("Confirmed");
}

function OnDialogPlayerAllConfirmed() {
    $("#DialogPanel").SetHasClass("Visible", false);
    GameEvents.SendCustomGameEventToServer("dialog_complete", {
        DialogEntIndex: g_nCurrentDialogEnt,
        DialogLine: g_nCurrentDialogLine,
        ShowNextLine: 0,
        PlayerHeroEntIndex: Players.GetPlayerHeroEntityIndex(
            Players.GetLocalPlayer()
        ),
    });

    $("#ConfirmButton").RemoveClass("Confirmed");
    $("#Player" + 0 + "Confirm").RemoveClass("Confirmed");
    $("#Player" + 1 + "Confirm").RemoveClass("Confirmed");
    $("#Player" + 2 + "Confirm").RemoveClass("Confirmed");
    $("#Player" + 3 + "Confirm").RemoveClass("Confirmed");
    g_szConfirmToken = undefined;
}

function OnCloseDialogButtonPressed() {
    $("#DialogPanel").SetHasClass("Visible", false);
    $("#FloatingDialogPanel").SetHasClass("Visible", false);
    GameEvents.SendCustomGameEventToServer("dialog_complete", {
        DialogEntIndex: g_nCurrentDialogEnt,
        DialogLine: g_nCurrentDialogLine,
        ShowNextLine: 0,
        PlayerHeroEntIndex: Players.GetPlayerHeroEntityIndex(
            Players.GetLocalPlayer()
        ),
    });
}

(function HUDThink() {
    if (
        !g_bSentToAll &&
        $("#FloatingDialogPanel").BHasClass("Visible") &&
        g_nCurrentDialogEnt !== null
    ) {
        const vAbsOrigin = Entities.GetAbsOrigin(g_nCurrentDialogEnt);
        const nX = Game.WorldToScreenX(
            vAbsOrigin[0],
            vAbsOrigin[1],
            vAbsOrigin[2]
        );
        const nY = Game.WorldToScreenY(
            vAbsOrigin[0],
            vAbsOrigin[1],
            vAbsOrigin[2]
        );
        $("#FloatingDialogPanel").style.x =
            nX / $("#FloatingDialogPanel").actualuiscale_x + 25 + "px";
        $("#FloatingDialogPanel").style.y =
            nY / $("#FloatingDialogPanel").actualuiscale_y - 100 + "px";
    }
    $.Schedule(flThink, HUDThink);
})();

GameEvents.Subscribe("dialog", OnDialogReceived);
GameEvents.Subscribe("dialog_player_confirm", OnDialogPlayerConfirm);
GameEvents.Subscribe("dialog_player_all_confirmed", OnDialogPlayerAllConfirmed);
