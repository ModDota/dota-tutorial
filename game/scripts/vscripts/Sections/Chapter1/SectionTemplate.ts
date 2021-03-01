import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";

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

    const goalTracker = new GoalTracker();
    const goalDummy = goalTracker.addBoolean("Do something.");

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.wait(1),
            tg.immediate(context => goalDummy.start()),
            tg.immediate(context => print("Hello world")),
            tg.wait(5),
            tg.immediate(context => goalDummy.complete()),
            tg.wait(5),
        ])
    )

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
