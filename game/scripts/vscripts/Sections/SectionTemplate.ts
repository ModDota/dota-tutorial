import * as tut from "../Tutorial/Core";
import { SectionState } from "./SectionState";

const sectionName: SectionName = SectionName.Opening
const sectionTemplateState: SectionState = {}

function onStart() {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });
}

function onStop() {
    print("Stopping", sectionName);
}

export const sectionExampleEmpty = new tut.FunctionalSection(
    sectionName,
    sectionTemplateState,
    onStart,
    onStop
);
