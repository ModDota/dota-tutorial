import * as tut from "../Tutorial/Core";
import { RequiredState } from "../Tutorial/RequiredState";

const sectionName: SectionName = SectionName.Opening
const sectionTemplateState: RequiredState = {}

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
