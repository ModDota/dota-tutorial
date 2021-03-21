/* Toggle functionality */
const collapseButton = $("#CollapseButton") as LabelPanel;
let expanded = false;
collapseButton.SetPanelEvent("onactivate", () => {
    $.GetContextPanel().ToggleClass("Collapsed");
    expanded = !expanded;

    collapseButton.text = expanded ? "X  DEV  X" : "^  DEV  ^";
    Game.EmitSound("ui_chat_slide_in");
});

// Set hittest to false by default
$.GetContextPanel().hittest = false;
$.GetContextPanel().hittestchildren = false;

function enable() {
    $.GetContextPanel().hittest = true;
    $.GetContextPanel().hittestchildren = true;
    $.GetContextPanel().AddClass("Enabled");
}

// Enable when in tools
if (Game.IsInToolsMode()) {
    enable();
}

// Enable when we get the command to do so
GameEvents.Subscribe("devpanel_enable", () => {
    enable();
});

/* Skip to section buttons */
const sections = {
    "CH1 - Opening": SectionName.Chapter1_Opening,
    "CH1 - Movement": SectionName.Chapter1_Movement,
    "CH1 - Camera Unlock": SectionName.Chapter1_CameraUnlock,
    "CH1 - Leveling": SectionName.Chapter1_Leveling,
    "CH1 - Casting": SectionName.Chapter1_Casting,
    "CH1 - Shop UI": SectionName.Chapter1_ShopUI,
    "CH2 - Opening": SectionName.Chapter2_Opening,
    "CH2 - Creeps": SectionName.Chapter2_Creeps,
    "CH2 - Tower": SectionName.Chapter2_Tower,
    "CH2 - Courier": SectionName.Chapter2_Courier,
    "CH3": SectionName.Chapter3_Opening,
    "CH4 - Opening": SectionName.Chapter4_Opening,
    "CH4 - Wards": SectionName.Chapter4_Wards,
    "CH4 - Outpost": SectionName.Chapter4_Outpost,
    "CH4 - Communication": SectionName.Chapter4_Communication,
    "CH5 - Opening": SectionName.Chapter5_Opening,
    "CH5 - Roshan": SectionName.Chapter5_Roshan,
    "CH5 - Team Fight": SectionName.Chapter5_TeamFight,
    "CH6 - Opening": SectionName.Chapter6_Opening,
    "CH6 - Closing": SectionName.Chapter6_Closing,
};

// Add a button for each section
for (const [sectionName, sectionCode] of Object.entries(sections)) {
    const button = addSkipToSectionButton(sectionName);
    button.SetPanelEvent("onactivate", () => {
        GameEvents.SendCustomGameEventToServer("skip_to_section", { section: sectionCode });
        Game.EmitSound("ui_generic_button_click");
    });
}

// Create a section button
function addSkipToSectionButton(sectionName: string): Panel {
    const button = $.CreatePanel("Label", $("#ButtonContainer"), "");
    button.AddClass("SkipButton");
    button.text = sectionName;

    return button;
}
