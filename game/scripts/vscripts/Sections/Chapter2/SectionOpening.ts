import { GoalTracker } from "../../Goals";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { findRealPlayerID, getPlayerHero } from "../../util";

const sectionName: SectionName = SectionName.Chapter2_Opening
let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = true;

const requiredState: RequiredState = {
    heroLocation: Vector(-6800, -6372, 384),
    heroLocationTolerance: 600
}

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const radiantCreepsNames = [CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantRangedCreep];
    const direCreepNames = [CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireRangedCreep];

    const radiantCreeps: CDOTA_BaseNPC[] = [];
    const direCreeps: CDOTA_BaseNPC[] = [];

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const moveNextToBarracksLocation = Vector(-6574, -3742, 256)
    const radiantCreepsSpawnLocation = Vector(-6795, -3474, 256)
    const direCreepsSpawnLocation = Vector(-5911, 5187, 128)
    const radiantCreepsMoveToPrepareLaunchAssaultLocation = Vector(-6600, -2425, 128)
    const moveToPrepareToLaunchAssaultLocation = Vector(-6600, -2745, 128)
    const radiantCreepsPrepareToAttackLocation = Vector(-6288, 3280, 128)
    const moveToPrepareToAttackLocation = Vector(-6288, 3000, 128)

    const goalTracker = new GoalTracker()
    const goalMoveNextToBarracks = goalTracker.addBoolean("Move to the marked location next to the top barracks.")
    const goalListenToSunsfanAndSlacks = goalTracker.addBoolean("Listen to Sunsfan and Slack")
    const goalWaitForCreepsToPrepareToMove = goalTracker.addBoolean("Wait for the creeps to prepare for the assault.")
    const goalPrepareToMove = goalTracker.addBoolean("Move behind the creeps and prepare to move.")
    const goalWaitForCreepsToPrepareToAttack = goalTracker.addBoolean("Wait for the creeps to reach combat positions.")
    const goalMoveBehindCreepsToAttack = goalTracker.addBoolean("Move behind the creeps and prepare for combat.")

    graph = tg.withGoals(context => goalTracker.getGoals(),
        tg.seq([
            tg.setCameraTarget(undefined),
            tg.immediate(context => goalMoveNextToBarracks.start()),
            tg.immediate(() => canPlayerIssueOrders = true),
            tg.goToLocation(moveNextToBarracksLocation),
            tg.immediate(context => {
                goalMoveNextToBarracks.complete()
                goalListenToSunsfanAndSlacks.start()
            }),
            tg.immediate(() => {
                playerHero.Stop(),
                    canPlayerIssueOrders = false
            }),
            tg.textDialog(LocalizationKey.Script_2_Opening_1, context => context[CustomNpcKeys.SlacksMudGolem], 10),
            tg.textDialog(LocalizationKey.Script_2_Opening_2, context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_2_Opening_3, context => context[CustomNpcKeys.SlacksMudGolem], 5),
            tg.textDialog(LocalizationKey.Script_2_Opening_4, context => context[CustomNpcKeys.SlacksMudGolem], 8),
            tg.textDialog(LocalizationKey.Script_2_Opening_5, context => context[CustomNpcKeys.SlacksMudGolem], 6),
            tg.textDialog(LocalizationKey.Script_2_Opening_6, context => context[CustomNpcKeys.SlacksMudGolem], 14),
            tg.textDialog(LocalizationKey.Script_2_Opening_7, context => context[CustomNpcKeys.SlacksMudGolem], 8),
            tg.textDialog(LocalizationKey.Script_2_Opening_8, context => context[CustomNpcKeys.SlacksMudGolem], 12),
            tg.textDialog(LocalizationKey.Script_2_Opening_9, context => context[CustomNpcKeys.SlacksMudGolem], 12),
            tg.textDialog(LocalizationKey.Script_2_Opening_10, context => context[CustomNpcKeys.SlacksMudGolem], 18),
            tg.textDialog(LocalizationKey.Script_2_Opening_11, context => context[CustomNpcKeys.SlacksMudGolem], 5),
            tg.textDialog(LocalizationKey.Script_2_Opening_12, context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_2_Opening_13, context => context[CustomNpcKeys.SlacksMudGolem], 6),
            tg.fork(_ => radiantCreepsNames.map(unit => tg.spawnUnit(unit, radiantCreepsSpawnLocation, DotaTeam.GOODGUYS, undefined))),
            tg.fork(_ => direCreepNames.map(unit => tg.spawnUnit(unit, direCreepsSpawnLocation, DotaTeam.BADGUYS, undefined))),
            tg.immediate(context => {
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

                context[chapter2SpecificKeys.RadiantCreeps] = radiantCreeps;
                context[chapter2SpecificKeys.DireCreeps] = direCreeps;
            }),
            tg.immediate(context => {
                goalListenToSunsfanAndSlacks.complete()
                goalWaitForCreepsToPrepareToMove.start()
            }),
            tg.fork(context => radiantCreeps.map(unit => tg.moveUnit(_ => unit, radiantCreepsMoveToPrepareLaunchAssaultLocation))),
            tg.immediate(context => {
                goalWaitForCreepsToPrepareToMove.complete()
                goalPrepareToMove.start()
            }),
            tg.immediate(_ => canPlayerIssueOrders = true),
            tg.goToLocation(moveToPrepareToLaunchAssaultLocation),
            tg.immediate(context => {
                goalPrepareToMove.complete()
                goalWaitForCreepsToPrepareToAttack.start()
                goalMoveBehindCreepsToAttack.start()
            }),
            tg.fork([
                tg.seq([
                    tg.fork(context => radiantCreeps.map(unit => tg.moveUnit(_ => unit, radiantCreepsPrepareToAttackLocation))),
                    tg.immediate(() => goalWaitForCreepsToPrepareToAttack.complete())
                ]),
                tg.seq([
                    tg.goToLocation(moveToPrepareToAttackLocation),
                    tg.immediate(() => goalMoveBehindCreepsToAttack.complete())
                ])
            ]),
        ]))

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

const onStop = () => {
    print("Stopping", sectionName);

    const context = GameRules.Addon.context
    let radiantCreeps: CDOTA_BaseNPC[] = context[chapter2SpecificKeys.RadiantCreeps]
    let direCreeps: CDOTA_BaseNPC[] = context[chapter2SpecificKeys.DireCreeps]

    if (radiantCreeps) {
        for (const creep of radiantCreeps) {
            UTIL_Remove(creep)
        }
        radiantCreeps = [];
        context[chapter2SpecificKeys.RadiantCreeps] = undefined
    }

    if (direCreeps) {
        for (const creep of direCreeps) {
            UTIL_Remove(creep)
        }
        direCreeps = [];
        context[chapter2SpecificKeys.DireCreeps] = undefined
    }

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
