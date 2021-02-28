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
    [SectionName.Opening]: uiEmpty,
    [SectionName.CameraUnlock]: uiWithMinimap,
    [SectionName.Leveling]: uiWithActionPanel,
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