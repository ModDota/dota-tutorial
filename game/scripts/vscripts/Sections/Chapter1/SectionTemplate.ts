import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";

const sectionName: SectionName = SectionName.Chapter1_Opening;

let graph: tg.TutorialStep | undefined = undefined

/**
 * Describes the state we want the game to be in before this section is executed. The game will try to make the state match this required state.
 */
const requiredState: RequiredState = {
};

/**
 * Called when the section is started and should contain the main logic.
 * @param complete Call this function to complete the section.
 */
function onStart(complete: () => void) {
    print("Starting", sectionName);

    graph = tg.seq([
        tg.immediate(context => print("Hello world"))
    ]);

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        complete();
    });
}

/**
 * Called when this section is cancelled and should clean up any progress such as spawned units.
 */
function onStop() {
    print("Stopping", sectionName);

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const sectionTemplate = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop
);
