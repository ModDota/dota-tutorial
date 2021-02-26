import * as tut from "../Tutorial/Core";

const sectionName: SectionName = SectionName.Opening

const setupState = () => {
}

function onStart() {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });
}

function onSkipTo() {
    print("Skipping to", sectionName);
}

function onStop() {
    print("Stopping", sectionName);
}

export const sectionExampleEmpty = new tut.FunctionalSection(
    sectionName,
    setupState,
    onStart,
    onSkipTo,
    onStop
);
