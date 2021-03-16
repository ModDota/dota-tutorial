import { GoalTracker } from "../../Goals";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { findRealPlayerID, freezePlayerHero, getPlayerCameraLocation, getPlayerHero, removeContextEntityIfExists } from "../../util";
import { chapter2Blockades, Chapter2SpecificKeys, radiantCreepsNames } from "./shared";

const sectionName: SectionName = SectionName.Chapter2_Opening
let graph: tg.TutorialStep | undefined = undefined

const inFrontOfBarracksLocation = Vector(-6589, -4468, 259)
const moveNextToBarracksLocation = Vector(-6574, -3742, 256)
const radiantCreepsSpawnLocation = Vector(-6795, -3474, 256)
const radiantCreepsMoveToPrepareLaunchAssaultLocation = Vector(-6600, -2425, 128)
const moveToPrepareToLaunchAssaultLocation = Vector(-6600, -2745, 128)
const radiantCreepsPrepareToAttackLocation = Vector(-6288, 3280, 128)
const moveToPrepareToAttackLocation = Vector(-6288, 3000, 128)
const inFrontOfRadiantAncientLocation = Vector(-5572, -5041, 256)

const requiredState: RequiredState = {
    heroLocation: inFrontOfBarracksLocation,
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
    ],
    topDireT1TowerStanding: true
}

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const radiantCreeps: CDOTA_BaseNPC[] = [];
    const direCreeps: CDOTA_BaseNPC[] = [];

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const goalTracker = new GoalTracker()
    const goalMoveNextToBarracks = goalTracker.addBoolean(LocalizationKey.Goal_2_Opening_1)
    const goalListenToSunsfanAndSlacks = goalTracker.addBoolean(LocalizationKey.Goal_2_Opening_2)
    const goalWaitForCreepsToPrepareToMove = goalTracker.addBoolean(LocalizationKey.Goal_2_Opening_3)
    const goalPrepareToMove = goalTracker.addBoolean(LocalizationKey.Goal_2_Opening_4)
    const goalWaitForCreepsToPrepareToAttack = goalTracker.addBoolean(LocalizationKey.Goal_2_Opening_5)
    const goalMoveBehindCreepsToAttack = goalTracker.addBoolean(LocalizationKey.Goal_2_Opening_6)

    graph = tg.withGoals(context => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(_ => chapter2Blockades.radiantBaseTop.spawn()),
            tg.wait(FrameTime()),
            tg.immediate(_ => goalMoveNextToBarracks.start()),
            tg.goToLocation(moveNextToBarracksLocation),
            tg.immediate(context => {
                goalMoveNextToBarracks.complete()
                goalListenToSunsfanAndSlacks.start()
            }),
            tg.immediate(() => {
                playerHero.Stop()
            }),
            tg.withHighlights(tg.audioDialog(LocalizationKey.Script_2_Opening_1, LocalizationKey.Script_2_Opening_1, context => context[CustomNpcKeys.SlacksMudGolem]),
                {
                    type: "circle",
                    units: Entities.FindAllByClassnameWithin("npc_dota_barracks", inFrontOfRadiantAncientLocation, 2500) as CDOTA_BaseNPC[], // only radiant barracks should be highlighted here
                    radius: 230,
                    attach: false,
                }
            ),

            // Talking about moonwells
            tg.fork([
                tg.panCameraLinear(_ => getPlayerCameraLocation(), _ => Entities.FindAllByClassnameWithin("npc_dota_filler", moveNextToBarracksLocation, 1000)[0].GetAbsOrigin(), 1),
                tg.setCameraTarget(undefined),
                tg.withHighlights(tg.seq([
                    tg.audioDialog(LocalizationKey.Script_2_Opening_2, LocalizationKey.Script_2_Opening_2, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.audioDialog(LocalizationKey.Script_2_Opening_3, LocalizationKey.Script_2_Opening_3, context => context[CustomNpcKeys.SlacksMudGolem]),
                ]), {
                    type: "circle",
                    units: Entities.FindAllByClassname("npc_dota_filler").concat(Entities.FindAllByClassname("npc_dota_effigy_statue")) as CDOTA_BaseNPC[],
                    radius: 150,
                    attach: false,
                }
                ),
            ]),

            // Talking about barracks
            tg.fork([
                tg.panCameraLinear(_ => getPlayerCameraLocation(), _ => Entities.FindAllByClassnameWithin("npc_dota_barracks", moveNextToBarracksLocation, 500)[0].GetAbsOrigin(), 1),
                tg.setCameraTarget(undefined),
                tg.withHighlights(tg.seq([
                    tg.audioDialog(LocalizationKey.Script_2_Opening_4, LocalizationKey.Script_2_Opening_4, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.audioDialog(LocalizationKey.Script_2_Opening_5, LocalizationKey.Script_2_Opening_5, context => context[CustomNpcKeys.SlacksMudGolem]),
                    tg.audioDialog(LocalizationKey.Script_2_Opening_6, LocalizationKey.Script_2_Opening_6, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.audioDialog(LocalizationKey.Script_2_Opening_7, LocalizationKey.Script_2_Opening_7, context => context[CustomNpcKeys.SlacksMudGolem]),
                    tg.audioDialog(LocalizationKey.Script_2_Opening_8, LocalizationKey.Script_2_Opening_8, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.audioDialog(LocalizationKey.Script_2_Opening_9, LocalizationKey.Script_2_Opening_9, context => context[CustomNpcKeys.SlacksMudGolem]),
                ]), {
                    type: "circle",
                    units: Entities.FindAllByClassnameWithin("npc_dota_barracks", inFrontOfRadiantAncientLocation, 2500) as CDOTA_BaseNPC[], // only radiant barracks should be highlighted here
                    radius: 230,
                    attach: false,
                }
                ),
            ]),

            tg.audioDialog(LocalizationKey.Script_2_Opening_10, LocalizationKey.Script_2_Opening_10, context => context[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_2_Opening_11, LocalizationKey.Script_2_Opening_11, context => context[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_2_Opening_12, LocalizationKey.Script_2_Opening_12, context => context[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_2_Opening_13, LocalizationKey.Script_2_Opening_13, context => context[CustomNpcKeys.SlacksMudGolem]),

            tg.fork(_ => radiantCreepsNames.map(unit => tg.spawnUnit(unit, radiantCreepsSpawnLocation, DotaTeam.GOODGUYS, undefined, true))),
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
                chapter2Blockades.radiantBaseTop.destroy()
            }),
            tg.fork(context => radiantCreeps.map(unit => tg.moveUnit(_ => unit, radiantCreepsMoveToPrepareLaunchAssaultLocation))),
            tg.immediate(context => {
                goalWaitForCreepsToPrepareToMove.complete()
                goalPrepareToMove.start()
            }),
            tg.goToLocation(moveToPrepareToLaunchAssaultLocation, _ => []),
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
                    tg.goToLocation(moveToPrepareToAttackLocation, [GetGroundPosition(Vector(-6400, -760), undefined), GetGroundPosition(Vector(-6450, 1650), undefined)]),
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

    chapter2Blockades.radiantBaseTop.destroy()

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

    return true;
}
