GameEvents.SendCustomGameEventToServer("ui_loaded", {});


/* UI Enabling/Disabling */


const uiEmpty = new Set<DotaDefaultUIElement_t>();
const uiWithMinimap = new Set<DotaDefaultUIElement_t>().add(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_ACTION_MINIMAP);
const uiWithActionPanel = new Set(uiWithMinimap).add(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_ACTION_PANEL);
const uiWithShop = new Set(uiWithMinimap).add(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_INVENTORY_SHOP);
const allUI = new Set(uiWithShop).add(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_TOP_BAR).add(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_QUICK_STATS);

// Disable all UI at the start
allUI.forEach(element => GameUI.SetDefaultUIEnabled(element, false));

const sectionUi: Partial<Record<SectionName, Set<DotaDefaultUIElement_t>>> = {
    [SectionName.Chapter1_Opening]: uiEmpty,
    [SectionName.Chapter1_CameraUnlock]: uiWithMinimap,
    [SectionName.Chapter1_Leveling]: uiWithActionPanel,
    // Don't add final section for now to enable all UI at the end
    //[SectionName.Casting]: uiWithActionPanel,
}

GameEvents.Subscribe("section_started", event => {
    const enabledUI = sectionUi[event.section];
    if (enabledUI) {
        const disabledUi = except(allUI, enabledUI);
        disabledUi.forEach(element => GameUI.SetDefaultUIEnabled(element, false));
        enabledUI.forEach(element => GameUI.SetDefaultUIEnabled(element, true));
    } else {
        // Otherwise make sure everything is enabled
        allUI.forEach(element => GameUI.SetDefaultUIEnabled(element, true));
    }
});

function except<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set(a);
    b.forEach(e => result.delete(e));
    return result;
}

/** UI Highlighting */

const hudRoot = $.GetContextPanel().GetParent()!.GetParent()!.GetParent()!;
let highlightedPanels: { [key: string]: Panel } = {};

function findPanelAtPath(path: string): Panel | undefined {
    const splitPath = path.split("/");
    let panel = hudRoot;
    for (let i = 0; i < splitPath.length; i++) {
        const child = panel.FindChild(splitPath[i]);
        if (child === null) {
            $.Msg(`Failed to find ${splitPath[i]} in ${splitPath.slice(0, i).join("/")}`);
            return undefined;
        }
        panel = child;
    }
    return panel;
}

function removeHighlight(event: RemoveHighlightEvent) {
    const { path } = event;
    if (!highlightedPanels[path]) {
        $.Msg("Panel is not currently highlighted");
    }

    highlightedPanels[path].DeleteAsync(0);
    delete highlightedPanels[path];
}

function highlightUiElement(event: HighlightElementEvent) {
    const { path, duration } = event;
    // Panel is already highlighted
    if (highlightedPanels[path]) {
        $.Msg("Element is already highlighted");
        return;
    }

    const element = findPanelAtPath(path);
    // Can't highlight if the scale is too small/large/uninitialized
    if (element && element.actualuiscale_x > 0.01) {
        const parent = element.GetParent()!;

        const highlightPanel = $.CreatePanel("Panel", $.GetContextPanel(), "UIHighlight");
        highlightPanel.SetParent(parent);

        highlightPanel.AddClass("UIHighlight");

        // Set size/position
        highlightPanel.style.width = (element.actuallayoutwidth / element.actualuiscale_x) + "px";
        highlightPanel.style.height = (element.actuallayoutheight / element.actualuiscale_y) + "px";
        highlightPanel.style.position = `${element.actualxoffset / element.actualuiscale_x}px ${element.actualyoffset / element.actualuiscale_y}px 0px`;

        highlightedPanels[path] = highlightPanel;

        if (duration) {
            $.Schedule(duration, () => removeHighlight({ path }));
        }
    }
}

GameEvents.Subscribe("highlight_element", highlightUiElement);
GameEvents.Subscribe("remove_highlight", removeHighlight);

//** Chapters Panel */
function ToggleChaptersMenu() {
    $.Msg("ToggleChaptersMenu");

    $("#ChaptersMenu").ToggleClass("Visible");
    Game.EmitSound("ui_chat_slide_in");
}

function ChaptersClose() {
    $.Msg("ToggleChaptersMenu");

    $("#ChaptersMenu").SetHasClass("Visible", false);
    Game.EmitSound("ui_chat_slide_out");
}

const chapterSections = [
    SectionName.Chapter1_Opening,
    SectionName.Chapter2_Opening,
    SectionName.Chapter3_Opening,
];

function playChapter(chapterNumber: number) {
    if (chapterSections[chapterNumber]) {
        GameEvents.SendCustomGameEventToServer("skip_to_section", { section: chapterSections[chapterNumber] });
    }
}

function Chapter2PlayButton() {
    $.Msg("Chapter2PlayButton");
}

function Chapter3PlayButton() {
    $.Msg("Chapter3PlayButton");
}

function Chapter4PlayButton() {
    $.Msg("Chapter4PlayButton");
}

function Chapter5PlayButton() {
    $.Msg("Chapter5PlayButton");
}

function Chapter6PlayButton() {
    $.Msg("Chapter6PlayButton");
}

//highlightUiElement("HUDElements/lower_hud/center_with_stats/center_block/PortraitGroup");
//highlightUiElement("HUDElements/lower_hud/center_with_stats/center_block/inventory");
