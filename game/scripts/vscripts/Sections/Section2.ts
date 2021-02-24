import * as tut from "../Tutorial/Core";

function onStart() {
    print("Starting", "Section02");
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: SectionName.Section02 });
}

function onSkipTo() {
    print("Skipping to", "Section02");
}

function onStop() {
    print("Stopping", "Section02");
}

export const section02 = new tut.FunctionalSection(
    "Section02",
    onStart,
    onSkipTo,
    onStop
);
