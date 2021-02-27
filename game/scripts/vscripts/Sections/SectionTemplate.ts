import * as tut from "../Tutorial/Core";
import { SectionState } from "../Tutorial/SectionState";

const sectionName: SectionName = SectionName.Opening
const sectionTemplateState: SectionState = {}

function onStart() {
    print("Starting", sectionName);
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
