import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { findRealPlayerID } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { TutorialContext } from "../../TutorialGraph/index";

const sectionName: SectionName = SectionName.Chapter4_Opening;

let graph: tg.TutorialStep | undefined = undefined;

enum GoalKeys {
    ScanSucceed,
    ScanFail
}

enum GoalState {
    Started,
    Completed,
}

const requiredState: RequiredState = {
    heroLocation: GetGroundPosition(Vector(3300, -3500), undefined)
};

const getGoals = (context: TutorialContext) => {
    const isGoalStarted = (key: GoalKeys) =>
        context[key] === GoalState.Started ||
        context[key] === GoalState.Completed;
    const isGoalCompleted = (key: GoalKeys) =>
        context[key] === GoalState.Completed;

    const goals: Goal[] = [];
    const addGoal = (key: GoalKeys, text: string) => {
        if (isGoalStarted(key)) {
            goals.push({ text: text, completed: isGoalCompleted(key) });
        }
    };

    addGoal(GoalKeys.ScanSucceed, "Click on scan with your leftmouse button, then click on the target place to scan. ");
    addGoal(GoalKeys.ScanFail, "Scan on your position. ");
    return goals;
};

let canPlayerIssueOrders = true;
const radiantCreepsNames = [CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantRangedCreep];
const radiantCreeps: CDOTA_BaseNPC[] = [];

function onStart(complete: () => void) {
    print("Starting", sectionName);
    graph = tg.forkAny([
        tg.trackGoals(getGoals),
        tg.seq([
            tg.fork(radiantCreepsNames.map(unit => tg.spawnUnit(unit, Vector(-6795, -3474, 256), DotaTeam.GOODGUYS, undefined))),
            tg.immediate(() => {
                const creeps = Entities.FindAllByClassname("npc_dota_creature") as CDOTA_BaseNPC[];
                for (const creep of creeps) {
                    if (creep.GetUnitName() === CustomNpcKeys.RadiantMeleeCreep || creep.GetUnitName() === CustomNpcKeys.RadiantRangedCreep) {
                        radiantCreeps.push(creep);
                    }
                }
            }),
            tg.immediate(() => canPlayerIssueOrders = false),
            tg.setCameraTarget(ctx => radiantCreeps[0]),
            tg.fork(ctx => radiantCreeps.map(unit => tg.moveUnit(_ => unit, Vector(-6288, 3280, 128)))),
            tg.immediate(() => canPlayerIssueOrders = true),
            tg.wait(20),
        ])
    ]);

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    });
}

function onStop() {
    print("Stopping", sectionName);
    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const sectionOpening = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    chapter4OpeningOrderFilter,
);

export function chapter4OpeningOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    if (event.issuer_player_id_const !== findRealPlayerID()) return true;

    if (!canPlayerIssueOrders) return false;

    return true;
}
