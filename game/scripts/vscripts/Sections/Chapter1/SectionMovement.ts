import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { getOrError, getPlayerHero, setUnitPacifist, setUnitVisibilityThroughFogOfWar } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"
import { TutorialContext } from "../../TutorialGraph/index"

let graph: tg.TutorialStep | undefined = undefined
const requiredState: RequiredState = {
    requireSunsfanGolem: true,
    requireSlacksGolem: true,
    sunsFanLocation: Vector(-6400, -5900, 256),
    slacksLocation: Vector(-6250, -6050, 256),
}

enum NeutralGoalKeys {
    MoveToWaypoint,
    DodgeArrow
}

enum GoalState {
    Started,
    Completed,
}

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", {
        section: SectionName.Chapter1_Movement,
    });

    const getGoals = (context: TutorialContext) => {
        const isGoalStarted = (key: NeutralGoalKeys) =>
            context[key] === GoalState.Started ||
            context[key] === GoalState.Completed;
        const isGoalCompleted = (key: NeutralGoalKeys) =>
            context[key] === GoalState.Completed;

        const goals: Goal[] = [];
        const addGoal = (key: NeutralGoalKeys, text: string) => {
            if (isGoalStarted(key)) {
                goals.push({ text: text, completed: isGoalCompleted(key) });
            }
        };

        addGoal(NeutralGoalKeys.MoveToWaypoint, "Move to the marked waypoint.");
        addGoal(NeutralGoalKeys.DodgeArrow, "Dodge the incoming arrow from Mirana!");

        return goals;
    };

    const radiantFountain = getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good"))
    const playerHero = getOrError(getPlayerHero());
    const markerLocation = Vector(-7000, -6200);
    const miranaSpawnOffset = Vector(3000, 400, 0)

    graph = tg.forkAny([
        tg.trackGoals(getGoals),
        tg.seq([
            tg.fork([
                tg.goToLocation(markerLocation),
                tg.seq([
                    tg.textDialog(LocalizationKey.Script_1_Movement_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 4),
                    tg.textDialog(LocalizationKey.Script_1_Movement_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 2),
                    tg.immediate(
                        (context) =>
                            (context[NeutralGoalKeys.MoveToWaypoint] = GoalState.Started)
                    ),
                ]),
            ]),
            tg.immediate((context) => {
                context[NeutralGoalKeys.MoveToWaypoint] = GoalState.Completed;
            }),
            tg.textDialog(LocalizationKey.Script_1_Movement_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_1_Movement_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_1_Movement_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.spawnUnit(CustomNpcKeys.Mirana,
                radiantFountain.GetAbsOrigin().__add(miranaSpawnOffset),
                DotaTeam.BADGUYS,
                CustomNpcKeys.Mirana),
            tg.immediate((context) => setUnitPacifist(context[CustomNpcKeys.Mirana], true)),
            tg.faceTowards(context => context[CustomNpcKeys.Mirana], playerHero.GetAbsOrigin()),
            tg.wait(0.5),
            tg.immediate(
                (context) =>
                    (context[NeutralGoalKeys.DodgeArrow] = GoalState.Started)
            ),
            tg.setCameraTarget(context => context[CustomNpcKeys.Mirana]),
            tg.playGlobalSound("mirana_mir_attack_10"),
            tg.immediate((context) => context[CustomNpcKeys.Mirana].FindAbilityByName("mirana_leap").SetLevel(1)),
            tg.useAbility((context) => context[CustomNpcKeys.Mirana], playerHero, "mirana_leap", UnitOrder.CAST_NO_TARGET),
            tg.immediate((context) => context[CustomNpcKeys.Mirana].FindAbilityByName(CustomAbilityKeys.CustomMiranaArrow).SetLevel(1)),
            tg.useAbility((context) => context[CustomNpcKeys.Mirana], playerHero, CustomAbilityKeys.CustomMiranaArrow, UnitOrder.CAST_POSITION),
            tg.wait(1),
            tg.setCameraTarget(playerHero),
            tg.textDialog("Watch out for the arrow!", ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.completeOnCheck((context) => {
                return context[ContextKeys.PlayerDodgedArrow]
            }, 0.2),
            tg.immediate((context) => {
                context[ContextKeys.PlayerDodgedArrow] = false
            }),
            tg.immediate((context) => {
                context[NeutralGoalKeys.DodgeArrow] = GoalState.Completed;
            }),
            tg.textDialog(LocalizationKey.Script_1_Movement_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
        ])
    ])

    graph.start(GameRules.Addon.context, () => {
        print("Completed", "Section Movement")
        complete()
    })
}

const onStop = () => {
    print("Stopping", "Section Movement");

    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }
}

export const sectionMovement = new tut.FunctionalSection(
    SectionName.Chapter1_Movement,
    requiredState,
    onStart,
    onStop
)
