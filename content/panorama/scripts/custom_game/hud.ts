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
    // Clear old UI highlights
    clearUiHighlights();

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
        const child = panel.FindChildTraverse(splitPath[i]);
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
        $.Msg(`Panel ${path} is not currently highlighted`);
        return;
    }

    highlightedPanels[path].DeleteAsync(0);
    delete highlightedPanels[path];
}

function clearUiHighlights() {
    for (const panel of Object.values(highlightedPanels)) {
        panel.DeleteAsync(0);
    }
    highlightedPanels = {};
}

// Example usage:
// highlightUiElement("HUDElements/lower_hud/center_with_stats/center_block/PortraitGroup");
// highlightUiElement("HUDElements/lower_hud/center_with_stats/center_block/inventory");
function highlightUiElement(event: NetworkedData<HighlightElementEvent>) {
    const { path, duration } = event;
    // Panel is already highlighted
    if (highlightedPanels[path]) {
        $.Msg(`Element ${path} is already highlighted`);
        return;
    }

    const element = findPanelAtPath(path);
    // Can't highlight if the scale is too small/large/uninitialized
    if (element && element.actualuiscale_x > 0.01) {
        const pos = element.GetPositionWithinAncestor(hudRoot);

        const highlightPanel = $.CreatePanel("Panel", $.GetContextPanel(), "UIHighlight");
        highlightPanel.hittest = false; // Dont block interactions
        highlightPanel.AddClass("UIHighlightScalingAnimation")
        $.Schedule(0.5, () => {
            if (highlightPanel.IsValid()) {
                highlightPanel.RemoveClass("UIHighlightScalingAnimation")
                highlightPanel.AddClass("UIHighlight");
            }
        })

        highlightPanel.SetParent(hudRoot);

        // Set size/position
        highlightPanel.style.width = (element.actuallayoutwidth / element.actualuiscale_x) + "px";
        highlightPanel.style.height = (element.actuallayoutheight / element.actualuiscale_y) + "px";
        highlightPanel.style.position = `${pos.x / element.actualuiscale_x}px ${pos.y / element.actualuiscale_y}px 0px`;

        highlightedPanels[path] = highlightPanel;

        if (duration) {
            $.Schedule(duration, () => removeHighlight({ path }));
        }

        // Shop guide items
        const isShopGuideItem = path.includes("HUDElements/shop/GuideFlyout/ItemsArea/ItemBuildContainer")
        if (isShopGuideItem) {
            checkShopHighlightItemPanel(highlightPanel, element)
        }

        // Deliver Courier path
        if (path === "HUDElements/lower_hud/shop_launcher_block/quickbuy/ShopCourierControls/CourierControls/DeliverItemsButton") {
            highlightPanel.AddClass("UIHighlightCourierDeliverButton")
        }
    }
}

function checkShopHighlightItemPanel(highlightPanel: Panel, originalPanel: Panel) {
    if (!highlightPanel.IsValid()) return

    const isShopOpen = Game.IsShopOpen()

    // Manage visibility
    isShopOpen ? highlightPanel.style.visibility = "visible" :
        highlightPanel.style.visibility = "collapse"

    // Adjust position of the panel if needed
    if (!isShopOpen) {
        $.Schedule(0.03, () => checkShopHighlightItemPanel(highlightPanel, originalPanel))
        return;
    }
    else {
        const pos = originalPanel.GetPositionWithinAncestor(hudRoot);
        const originalPanelPosition = `${pos.x / originalPanel.actualuiscale_x}px ${pos.y / originalPanel.actualuiscale_y}px 0px`;
        if (highlightPanel.style.position !== originalPanelPosition)
            highlightPanel.style.position = originalPanelPosition
    }

    $.Schedule(0.03, () => checkShopHighlightItemPanel(highlightPanel, originalPanel))
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

//** Guides Panel */
function ToggleGuidesMenu() {
    $.Msg("ToggleGuidesMenu");

    $("#GuidesMenu").ToggleClass("Visible");
    Game.EmitSound("ui_chat_slide_in");
}

function GuidesClose() {
    $.Msg("ToggleGuidesMenu");

    $("#GuidesMenu").SetHasClass("Visible", false);
    Game.EmitSound("ui_chat_slide_out");
}

const chapterSections = [
    SectionName.Chapter1_Opening,
    SectionName.Chapter2_Opening,
    SectionName.Chapter3_Opening,
    SectionName.Chapter4_Opening,
    SectionName.Chapter5_Opening,
];

function playChapter(chapterNumber: number) {
    Game.EmitSound("ui_generic_button_click")
    if (chapterSections[chapterNumber]) {
        GameEvents.SendCustomGameEventToServer("skip_to_section", { section: chapterSections[chapterNumber] });
    }
}

const numMessagesToTheNoobs = 78; // This needs to be updated when the messages are updated too
const messageToTheNoobsMessage = $("#MessageToTheNoobsMessage") as LabelPanel;
let hideMessageToTheNoobsTimer: ScheduleID | undefined = undefined
function showMessageToTheNoobs() {
    if (hideMessageToTheNoobsTimer) {
        $.CancelScheduled(hideMessageToTheNoobsTimer);
        hideMessageToTheNoobsTimer = undefined;
    }

    $("#MessageToTheNoobsMessage").SetHasClass("Visible", true);
    Game.EmitSound("ui_generic_button_click");
    const message = `#MessageToTheNoobs_${Math.round(Math.random() * 1000000000) % numMessagesToTheNoobs}`;
    messageToTheNoobsMessage.text = $.Localize(message);
    messageToTheNoobsMessage.visible = true;
    hideMessageToTheNoobsTimer = $.Schedule(5, () => {
        messageToTheNoobsMessage.visible = false;
        hideMessageToTheNoobsTimer = undefined;
    });
}

const pressKeyMessagePanel = $("#PressKeyMessage") as LabelPanel;
function showPressKeyMessage(command: DOTAKeybindCommand_t, text: string) {
    pressKeyMessagePanel.AddClass("Visible");
    pressKeyMessagePanel.SetDialogVariable("key", Game.GetKeybindForCommand(command));
    pressKeyMessagePanel.text = $.Localize(text, pressKeyMessagePanel);
}

function hidePressKeyMessage() {
    pressKeyMessagePanel.RemoveClass("Visible");
}

GameEvents.Subscribe("show_press_key_message", event => showPressKeyMessage(event.command, event.text));
GameEvents.Subscribe("hide_press_key_message", event => hidePressKeyMessage());

// Chapter 3 skip
const chapter3SkipButton = $("#Chapter3SkipButton");
chapter3SkipButton.visible = false;

function skipChapter3() {
    GameEvents.SendCustomGameEventToServer("skip_chapter3", {});
    chapter3SkipButton.visible = false;
}

function onShowSkipChapter3Button(show: boolean) {
    chapter3SkipButton.visible = show;
}

GameEvents.Subscribe("show_chapter3_skip_button", event => onShowSkipChapter3Button(event.show !== 0));
