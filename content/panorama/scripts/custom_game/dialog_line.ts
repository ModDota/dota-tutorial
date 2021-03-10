function SetItem(unitName: string, text: string) {
    let dialogPortrait = ($("#DialogPortrait") as ScenePanel);
    const dialogImagePortrait = $("#DialogImagePortrait") as ImagePanel;

    if (!handleSpecialUnitPortrait2(unitName)) {
        dialogImagePortrait.visible = false;
        dialogPortrait.visible = true;
        dialogPortrait.SetUnit(unitName, "", true);
    }
    ($("#DialogText") as LabelPanel).text = text;
}

(function () {
    ($.GetContextPanel() as DialogLinePanel).SetItem = SetItem;
})();

// yeah I copied this from dialog and renamed it so typescript wouldn't bitch
// what are you gonna do about it
function handleSpecialUnitPortrait2(unitName: string): boolean {
    let dialogPortrait = ($("#DialogPortrait") as ScenePanel);
    const dialogImagePortrait = $("#DialogImagePortrait") as ImagePanel;

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