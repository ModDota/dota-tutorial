interface SectionInfo {
    panel: Panel;
    onShow?: () => void;
    onHide?: () => void;
}

const sectionPanels: Partial<Record<SectionName, SectionInfo>> = {};

const sectionSelector = {
    RegisterSection(sectionName: SectionName, sectionInfo: SectionInfo) {
        $.Msg(`Registering ${sectionName} UI.`);
        sectionPanels[sectionName] = sectionInfo;
    }
};

GameEvents.Subscribe("section_started", event => {
    if (sectionPanels[event.section]) {
        hideAllSections();
        showSection(event.section);
    }
});

function hideAllSections() {
    for (const sectionInfo of Object.values(sectionPanels)) {
        if (sectionInfo!.onHide) {
            sectionInfo!.onHide();
        }
        sectionInfo!.panel.style.position = "200% 0px 0px";
    }
}

function showSection(section: SectionName) {
    const sectionInfo = sectionPanels[section];
    if (sectionInfo) {
        $.Msg(`Show UI for section ${section}.`);
        sectionInfo.panel.style.position = "0px 0px 0px";
        if (sectionInfo!.onShow) {
            sectionInfo!.onShow();
        }
    } else {
        $.Msg(`Failed to find panel for section ${section}!`);
    }
}

/* Add section selector to the custom ui config */
interface CustomUIConfig {
    SectionSelector: typeof sectionSelector;
}

GameUI.CustomUIConfig().SectionSelector = sectionSelector;
