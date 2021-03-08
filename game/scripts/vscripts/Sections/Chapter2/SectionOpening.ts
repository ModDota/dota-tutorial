import { GoalTracker } from "../../Goals";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { findRealPlayerID, getPlayerHero, removeContextEntityIfExists } from "../../util";
import { chapter2Blockades, Chapter2SpecificKeys, direCreepNames, radiantCreepsNames } from "./shared";

const sectionName: SectionName = SectionName.Chapter2_Opening
let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = true;

const moveNextToBarracksLocation = Vector(-6574, -3742, 256)
const radiantCreepsSpawnLocation = Vector(-6795, -3474, 256)
const direCreepsSpawnLocation = Vector(-5911, 5187, 128)
const radiantCreepsMoveToPrepareLaunchAssaultLocation = Vector(-6600, -2425, 128)
const moveToPrepareToLaunchAssaultLocation = Vector(-6600, -2745, 128)
const radiantCreepsPrepareToAttackLocation = Vector(-6288, 3280, 128)
const moveToPrepareToAttackLocation = Vector(-6288, 3000, 128)

const requiredState: RequiredState = {
    heroLocation: moveNextToBarracksLocation,
    heroLocationTolerance: 1500,
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5906, -3892, 256),
    sunsFanLocation: Vector(-5500, -4170, 256),
    heroAbilityMinLevels: [1, 1, 1, 0],
    heroLevel: 3,
    blockades: [
        chapter2Blockades.topToRiverStairs,
        chapter2Blockades.secretShopToRiverStairs,
        chapter2Blockades.radiantJungleStairs,
        chapter2Blockades.radiantBaseT2Divider,
        chapter2Blockades.radiantBaseMid,
        chapter2Blockades.radiantBaseBottom,
        chapter2Blockades.direTopDividerRiver,
        chapter2Blockades.direTopDividerCliff
    ]
}

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const radiantCreeps: CDOTA_BaseNPC[] = [];
    const direCreeps: CDOTA_BaseNPC[] = [];

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const goalTracker = new GoalTracker()
    const goalMoveNextToBarracks = goalTracker.addBoolean("Move to the marked location next to the top barracks.")
    const goalListenToSunsfanAndSlacks = goalTracker.addBoolean("Listen to SUNSfan and Slacks.")
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

            // Talking about moonwells
            tg.withHighlightUnits(
                tg.seq([
                    tg.textDialog(LocalizationKey.Script_2_Opening_2, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
                    tg.textDialog(LocalizationKey.Script_2_Opening_3, context => context[CustomNpcKeys.SlacksMudGolem], 5),
                ]),
                Entities.FindAllByClassname("npc_dota_filler") as CDOTA_BaseNPC[]
            ),

            // Talking about barracks
            tg.withHighlightUnits(
                tg.seq([
                    tg.textDialog(LocalizationKey.Script_2_Opening_4, context => context[CustomNpcKeys.SunsFanMudGolem], 8),
                    tg.textDialog(LocalizationKey.Script_2_Opening_5, context => context[CustomNpcKeys.SlacksMudGolem], 6),
                    tg.textDialog(LocalizationKey.Script_2_Opening_6, context => context[CustomNpcKeys.SunsFanMudGolem], 14),
                    tg.textDialog(LocalizationKey.Script_2_Opening_7, context => context[CustomNpcKeys.SlacksMudGolem], 8),
                    tg.textDialog(LocalizationKey.Script_2_Opening_8, context => context[CustomNpcKeys.SunsFanMudGolem], 12),
                    tg.textDialog(LocalizationKey.Script_2_Opening_9, context => context[CustomNpcKeys.SlacksMudGolem], 12),
                ]), Entities.FindAllByClassname("npc_dota_barracks") as CDOTA_BaseNPC[]
            ),

            tg.textDialog(LocalizationKey.Script_2_Opening_10, context => context[CustomNpcKeys.SunsFanMudGolem], 18),
            tg.textDialog(LocalizationKey.Script_2_Opening_11, context => context[CustomNpcKeys.SlacksMudGolem], 5),
            tg.textDialog(LocalizationKey.Script_2_Opening_12, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_2_Opening_13, context => context[CustomNpcKeys.SlacksMudGolem], 6),

            tg.fork(_ => radiantCreepsNames.map(unit => tg.spawnUnit(unit, radiantCreepsSpawnLocation, DotaTeam.GOODGUYS, undefined, true))),
            tg.fork(_ => direCreepNames.map(unit => tg.spawnUnit(unit, direCreepsSpawnLocation, DotaTeam.BADGUYS, undefined, true))),
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

                context[Chapter2SpecificKeys.RadiantCreeps] = radiantCreeps;
                context[Chapter2SpecificKeys.DireCreeps] = direCreeps;
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
    removeContextEntityIfExists(context, Chapter2SpecificKeys.RadiantCreeps)
    removeContextEntityIfExists(context, Chapter2SpecificKeys.DireCreeps)

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
