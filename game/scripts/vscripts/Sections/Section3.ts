import * as tut from "../Tutorial/Core";

function onStart() {
    print("Starting", "Section03");
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: SectionName.Section03 });
}

function onSkipTo() {
    print("Skipping to", "Section03");
}

function onStop() {
    print("Stopping", "Section03");
}

export const section03 = new tut.FunctionalSection(
    "Section03",
    onStart,
    onSkipTo,
    onStop
);
