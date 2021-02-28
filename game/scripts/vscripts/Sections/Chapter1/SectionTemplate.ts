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
 * Keys used for the tutorial graph context in this section.
 */
enum ContextKey {
    Dummy
}

enum GoalState {
    Started,
    Completed
}

/**
 * Return a list of goals to display depending on which parts we have started and completed.
 * @param context Context of the tutorial graph which can store the goals' states.
 */
const getGoals = (context: tg.TutorialContext) => {
    const isGoalStarted = (key: ContextKey) => context[key] === GoalState.Started || context[key] === GoalState.Completed
    const isGoalCompleted = (key: ContextKey) => context[key] === GoalState.Completed

    const goals: Goal[] = []
    const addGoal = (key: ContextKey, text: string) => {
        if (isGoalStarted(key)) {
            goals.push({ text: text, completed: isGoalCompleted(key) })
        }
    }

    addGoal(ContextKey.Dummy, "Do something.")

    return goals
}

/**
 * Called when the section is started and should contain the main logic.
 * @param complete Call this function to complete the section.
 */
function onStart(complete: () => void) {
    print("Starting", sectionName);

    graph = tg.forkAny([
        tg.trackGoals(getGoals),
        tg.seq([
            tg.wait(1),
            tg.immediate(context => context[ContextKey.Dummy] = GoalState.Started),
            tg.immediate(context => print("Hello world")),
            tg.wait(5),
            tg.immediate(context => context[ContextKey.Dummy] = GoalState.Completed),
            tg.wait(5),
        ])
    ])

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
