import * as tut from "../../Tutorial/Core";

const sectionName: SectionName = SectionName.Chapter1_Opening

function onStart() {
    print("Starting", sectionName);
}

function onSkipTo() {
    print("Skipping to", sectionName);
}

function onStop() {
    print("Stopping", sectionName);
}

export const sectionExampleEmpty = new tut.FunctionalSection(
    sectionName,
    onStart,
    onSkipTo,
    onStop
);
