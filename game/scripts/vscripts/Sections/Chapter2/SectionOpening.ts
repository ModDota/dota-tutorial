import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { TutorialContext } from "../../TutorialGraph/index";
import { findRealPlayerID, getPlayerHero } from "../../util";

const sectionName: SectionName = SectionName.Chapter2_Opening
let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = true;
const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5906, -3892, 256),
    sunsFanLocation: Vector(-5500, -4170, 256),
    heroLocation: Vector(-6800, -6372, 384),
    heroLocationTolerance: 800,
    heroLevel: 3,
    heroAbilityMinLevels: [1, 1, 1, 0],
}

enum ChapterTwoOpeningGoalKeys {
    MoveNextToBarracks,
    ListenToSunsfanAndSlacks,
    WaitForCreepsToPrepareToMove,
    PrepareToMove,
    WaitForCreepsToPrepareToAttack,
    PrepareToAttack,
    LastHitCreeps
}

enum GoalState {
    Started,
    Completed,
}

const radiantCreepsNames = [CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantRangedCreep];
const direCreepNames = [CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireRangedCreep];

const radiantCreeps: CDOTA_BaseNPC[] = [];
const direCreeps: CDOTA_BaseNPC[] = [];

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    // Return a list of goals to display depending on which parts we have started and completed.
    const getGoals = (context: TutorialContext) => {
        const isGoalStarted = (key: ChapterTwoOpeningGoalKeys) =>
            context[key] === GoalState.Started ||
            context[key] === GoalState.Completed;
        const isGoalCompleted = (key: ChapterTwoOpeningGoalKeys) =>
            context[key] === GoalState.Completed;

        const goals: Goal[] = [];
        const addGoal = (key: ChapterTwoOpeningGoalKeys, text: string) => {
            if (isGoalStarted(key)) {
                goals.push({ text: text, completed: isGoalCompleted(key) });
            }
        };

        addGoal(ChapterTwoOpeningGoalKeys.MoveNextToBarracks, "Move to the marked location next to the top barracks.");
        addGoal(ChapterTwoOpeningGoalKeys.ListenToSunsfanAndSlacks, "Listen to Sunsfan and Slack");
        addGoal(ChapterTwoOpeningGoalKeys.WaitForCreepsToPrepareToMove, "Wait for the creeps to prepare for the assault.");
        addGoal(ChapterTwoOpeningGoalKeys.PrepareToMove, "Move behind the creeps and prepare to move.");
        addGoal(ChapterTwoOpeningGoalKeys.WaitForCreepsToPrepareToAttack, "Wait for the creeps to reach combat positions.");
        addGoal(ChapterTwoOpeningGoalKeys.PrepareToAttack, "Move behind the creeps and prepare for combat.");
        addGoal(ChapterTwoOpeningGoalKeys.LastHitCreeps, "Attack creeps and attempt to last hit them.");

        return goals;
    };

    graph = tg.forkAny([
        tg.trackGoals(getGoals),
        tg.seq([
            tg.setCameraTarget(undefined),
            tg.immediate(context => context[ChapterTwoOpeningGoalKeys.MoveNextToBarracks] = GoalState.Started),
            tg.immediate(() => canPlayerIssueOrders = true),
            tg.goToLocation(Vector(-6574, -3742, 256)),
            tg.immediate(context => {
                context[ChapterTwoOpeningGoalKeys.MoveNextToBarracks] = GoalState.Completed,
                    context[ChapterTwoOpeningGoalKeys.ListenToSunsfanAndSlacks] = GoalState.Started
            }),
            tg.immediate(() => playerHero.Stop()),
            tg.immediate(() => canPlayerIssueOrders = false),
            tg.textDialog(LocalizationKey.Script_2_Opening_1, context => context[CustomNpcKeys.SlacksMudGolem], 10),
            tg.textDialog(LocalizationKey.Script_2_Opening_2, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_2_Opening_3, context => context[CustomNpcKeys.SlacksMudGolem], 5),
            tg.textDialog(LocalizationKey.Script_2_Opening_4, context => context[CustomNpcKeys.SunsFanMudGolem], 8),
            tg.textDialog(LocalizationKey.Script_2_Opening_5, context => context[CustomNpcKeys.SlacksMudGolem], 6),
            tg.textDialog(LocalizationKey.Script_2_Opening_6, context => context[CustomNpcKeys.SunsFanMudGolem], 14),
            tg.textDialog(LocalizationKey.Script_2_Opening_7, context => context[CustomNpcKeys.SlacksMudGolem], 8),
            tg.textDialog(LocalizationKey.Script_2_Opening_8, context => context[CustomNpcKeys.SunsFanMudGolem], 12),
            tg.textDialog(LocalizationKey.Script_2_Opening_9, context => context[CustomNpcKeys.SlacksMudGolem], 12),
            tg.textDialog(LocalizationKey.Script_2_Opening_10, context => context[CustomNpcKeys.SunsFanMudGolem], 18),
            tg.textDialog(LocalizationKey.Script_2_Opening_11, context => context[CustomNpcKeys.SlacksMudGolem], 5),
            tg.textDialog(LocalizationKey.Script_2_Opening_12, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_2_Opening_13, context => context[CustomNpcKeys.SlacksMudGolem], 6),
            tg.fork(_ => radiantCreepsNames.map(unit => tg.spawnUnit(unit, Vector(-6795, -3474, 256), DotaTeam.GOODGUYS, undefined))),
            tg.fork(_ => direCreepNames.map(unit => tg.spawnUnit(unit, Vector(-5911, 5187, 128), DotaTeam.BADGUYS, undefined))),
            tg.immediate(_ => {
                // Group radiant creeps
                const creeps = Entities.FindAllByClassname("npc_dota_creature") as CDOTA_BaseNPC[];

                for (const creep of creeps) {
                    if (creep.GetUnitName() == CustomNpcKeys.RadiantMeleeCreep || creep.GetUnitName() == CustomNpcKeys.RadiantRangedCreep) {
                        radiantCreeps.push(creep);
                    }

                    if (creep.GetUnitName() == CustomNpcKeys.DireMeleeCreep || creep.GetUnitName() == CustomNpcKeys.DireRangedCreep) {
                        direCreeps.push(creep);
                    }
                }
            }),
            tg.immediate(context => {
                context[ChapterTwoOpeningGoalKeys.ListenToSunsfanAndSlacks] = GoalState.Completed
                context[ChapterTwoOpeningGoalKeys.WaitForCreepsToPrepareToMove] = GoalState.Started
            }),
            tg.fork(context => radiantCreeps.map(unit => tg.moveUnit(_ => unit, Vector(-6600, -2425, 128)))),
            tg.immediate(context => {
                context[ChapterTwoOpeningGoalKeys.WaitForCreepsToPrepareToMove] = GoalState.Completed,
                    context[ChapterTwoOpeningGoalKeys.PrepareToMove] = GoalState.Started
            }),
            tg.immediate(_ => canPlayerIssueOrders = true),
            tg.goToLocation(Vector(-6600, -2745, 128)),
            tg.immediate(context => {
                context[ChapterTwoOpeningGoalKeys.PrepareToMove] = GoalState.Completed,
                    context[ChapterTwoOpeningGoalKeys.WaitForCreepsToPrepareToAttack] = GoalState.Started
                context[ChapterTwoOpeningGoalKeys.PrepareToAttack] = GoalState.Started
            }),
            tg.fork([
                tg.fork(context => radiantCreeps.map(unit => tg.moveUnit(_ => unit, Vector(-6288, 3280, 128)))),
                tg.goToLocation(Vector(-6288, 3000, 128))
            ]),
            tg.immediate(_ => {
                for (const radiantCreep of radiantCreeps) {
                    ExecuteOrderFromTable({
                        OrderType: UnitOrder.ATTACK_MOVE,
                        Position: Vector(-6190, 4589, 128),
                        UnitIndex: radiantCreep.entindex()
                    })
                }

                for (const direCreep of direCreeps) {
                    ExecuteOrderFromTable({
                        OrderType: UnitOrder.ATTACK_MOVE,
                        Position: Vector(-6190, 4589, 128),
                        UnitIndex: direCreep.entindex()
                    })
                }
            }),
            tg.immediate(context => {
                context[ChapterTwoOpeningGoalKeys.WaitForCreepsToPrepareToAttack] = GoalState.Completed;
                context[ChapterTwoOpeningGoalKeys.PrepareToAttack] = GoalState.Completed;
                context[ChapterTwoOpeningGoalKeys.LastHitCreeps] = GoalState.Started; // Technically, we don't really track last hitting in this section, but that's for now, we'll adjust it properly later on
            }),
            tg.wait(5)
        ]),
    ])

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

const onStop = () => {
    print("Stopping", sectionName);
    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const sectionOpening = new tut.FunctionalSection(
    SectionName.Chapter2_Opening,
    requiredState,
    onStart,
    onStop,
    chapter2OpeningOrderFilter
);

export function chapter2OpeningOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (!canPlayerIssueOrders) return false;

    return true;
}
