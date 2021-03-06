import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import * as shared from "./Shared"
import * as dg from "../../Dialog"
import { displayDotaErrorMessage, findRealPlayerID, getOrError, getPlayerHero, unitIsValidAndAlive, highlightUiElement, removeHighlight, centerCameraOnHero, getPlayerCameraLocation, createParticleAttachedToUnit, createParticleAtLocation, setUnitPacifist, setUnitVisibilityThroughFogOfWar } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { TutorialContext } from "../../TutorialGraph/index";

const sectionName: SectionName = SectionName.Chapter4_Opening;

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: GetGroundPosition(Vector(-3106, 4204), undefined),
    heroLocationTolerance: 200,
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroItems: { "item_greater_crit": 1, "item_mysterious_hat": 1 },
    requireRiki: true,
    rikiLocation: Vector(-1800, 4000, 256),
    blockades: Object.values(shared.blockades),
    topDireT1TowerStanding: false
};

let scanLocation: Vector | undefined = undefined;

const miranaName = "npc_dota_hero_mirana";
const slarkName = "npc_dota_hero_slark";
const jukeDuo = [miranaName, slarkName];
const firstScanLocation = Vector(2000, 3800);
const secondScanLocation = Vector(-2000, 3800);
const outpostHighgroundCenter = Vector(-1800, 4000);
let currentRequiredScanLocation = firstScanLocation;
let waitingForPlayerToScan = false

let failedScanDialogToken: number | undefined = undefined;

const radiantCreepsNames = [CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantRangedCreep];
let radiantCreeps: CDOTA_BaseNPC[] = [];

// UI Highlighting Paths
const scanUIPath = "HUDElements/minimap_container/GlyphScanContainer/RadarButton/NormalRoot/RadarIcon"

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const goalTracker = new GoalTracker();
    const goalListenDialog = goalTracker.addBoolean(LocalizationKey.Goal_4_Opening_1);
    const goalWatchJuke = goalTracker.addBoolean(LocalizationKey.Goal_4_Opening_2);
    const goalScanFailed = goalTracker.addBoolean(LocalizationKey.Goal_4_Opening_3);
    const goalScanSucceed = goalTracker.addBoolean(LocalizationKey.Goal_4_Opening_4);

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");

    currentRequiredScanLocation = firstScanLocation;
    waitingForPlayerToScan = false

    goalListenDialog.start();

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.audioDialog(LocalizationKey.Script_4_Opening_1, LocalizationKey.Script_4_Opening_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Opening_2, LocalizationKey.Script_4_Opening_2, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            //Part0: The camera pans to an empty part of the map
            tg.panCameraExponential(_ => getPlayerCameraLocation(), outpostHighgroundCenter, 0.9),
            tg.audioDialog(LocalizationKey.Script_4_Opening_3, LocalizationKey.Script_4_Opening_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            //Part1: Creep wave explains vision
            tg.fork(radiantCreepsNames.map(unit => tg.spawnUnit(unit, Vector(-3700, -6100, 256), DOTATeam_t.DOTA_TEAM_GOODGUYS, undefined))),
            tg.immediate(_ => {
                const creeps = Entities.FindAllByClassname("npc_dota_creature") as CDOTA_BaseNPC[];
                for (const creep of creeps) {
                    if (unitIsValidAndAlive(creep) && (creep.GetUnitName() === CustomNpcKeys.RadiantMeleeCreep || creep.GetUnitName() === CustomNpcKeys.RadiantRangedCreep)) {
                        radiantCreeps.push(creep);
                    }
                }
            }),

            tg.setCameraTarget(_ => radiantCreeps[0]),

            tg.forkAny([
                tg.fork(_ => radiantCreeps.map(unit => tg.moveUnit(_ => unit, Vector(4000, -6000, 128)))),
                tg.audioDialog(LocalizationKey.Script_4_Opening_4, LocalizationKey.Script_4_Opening_4, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            ]),

            tg.setCameraTarget(undefined),
            tg.immediate(_ => centerCameraOnHero()),

            tg.audioDialog(LocalizationKey.Script_4_Opening_5, LocalizationKey.Script_4_Opening_5, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Opening_6, LocalizationKey.Script_4_Opening_6, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(_ => {
                disposeCreeps();
                goalListenDialog.complete();
                goalWatchJuke.start();
            }),

            //Part2: Juke
            tg.forkAny([
                tg.seq([
                    tg.audioDialog(LocalizationKey.Script_4_Opening_7, LocalizationKey.Script_4_Opening_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.spawnUnit(miranaName, GetGroundPosition(Vector(2200, -3700), undefined), DOTATeam_t.DOTA_TEAM_BADGUYS, miranaName),
                    tg.spawnUnit(slarkName, GetGroundPosition(Vector(2500, -3800), undefined), DOTATeam_t.DOTA_TEAM_GOODGUYS, slarkName),
                    tg.setCameraTarget(context => context[slarkName]),

                    tg.fork([
                        tg.seq([
                            tg.immediate(context => context[miranaName].SetAttackCapability(DOTAUnitAttackCapability_t.DOTA_UNIT_CAP_NO_ATTACK)),
                            tg.moveUnit(context => context[miranaName], GetGroundPosition(Vector(600, -3700), undefined)),
                            tg.moveUnit(context => context[miranaName], GetGroundPosition(Vector(1600, -3280), undefined)),
                            tg.immediate(context => {
                                const mirana: CDOTA_BaseNPC_Hero = context[miranaName];
                                setUnitVisibilityThroughFogOfWar(mirana, true);
                                EmitSoundOn("Script_1_Movement_9_1", mirana);
                            }),
                            tg.moveUnit(context => context[miranaName], GetGroundPosition(Vector(2000, -2350), undefined)),
                            tg.immediate(context => {
                                const mirana: CDOTA_BaseNPC_Hero = context[miranaName];
                                setUnitVisibilityThroughFogOfWar(mirana, false);
                            }),

                        ]),

                        tg.seq([
                            tg.wait(2), // Give slark some time to hit and follow mirana
                            // Take over control
                            tg.immediate(context => setUnitPacifist(context[slarkName], true)),
                            tg.moveUnit(context => context[slarkName], GetGroundPosition(Vector(1050, -3680), undefined)),
                            tg.moveUnit(context => context[slarkName], GetGroundPosition(Vector(400, -3800), undefined)),
                            // Show ??? particle
                            tg.immediate(context => {
                                const slark: CDOTA_BaseNPC_Hero = context[slarkName];
                                const particle = createParticleAtLocation(ParticleName.QuestionMarks, slark.GetAbsOrigin());
                                ParticleManager.ReleaseParticleIndex(particle);
                            }),
                            tg.wait(5)
                        ]),

                        // Reveal riki for a short time, otherwise the successful scan later won't show up
                        // because of a Dota bug. Hope the player won't notice!
                        tg.seq([
                            tg.immediate(ctx => {
                                const riki = ctx[CustomNpcKeys.Riki] as CDOTA_BaseNPC;
                                const backstab = riki.FindAbilityByName("riki_backstab")
                                backstab!.SetLevel(0)
                                riki.RemoveModifierByName("modifier_invisible")
                                riki.RemoveModifierByName("modifier_riki_backstab")
                            }),
                            tg.immediate(_ => AddFOWViewer(DOTATeam_t.DOTA_TEAM_GOODGUYS, secondScanLocation, 2000, 0.1, false)),
                            tg.wait(0.1),
                            tg.immediate(ctx => {
                                const riki = ctx[CustomNpcKeys.Riki] as CDOTA_BaseNPC;
                                const backstab = riki.FindAbilityByName("riki_backstab")
                                backstab!.SetLevel(1)
                            }),
                        ]),
                    ]),
                ])
            ]),

            tg.setCameraTarget(undefined),
            tg.immediate(_ => centerCameraOnHero()),

            tg.immediate(_ => disposeHeroes()),
            tg.immediate(_ => goalWatchJuke.complete()),

            tg.audioDialog(LocalizationKey.Script_4_Opening_8, LocalizationKey.Script_4_Opening_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Opening_9, LocalizationKey.Script_4_Opening_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            // Behold the scan icon
            tg.immediate(_ => {
                highlightUiElement(scanUIPath, undefined, HighlightMouseButton.Left)
                goalScanFailed.start();
            }),
            tg.audioDialog(LocalizationKey.Script_4_Opening_10, LocalizationKey.Script_4_Opening_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Opening_11, LocalizationKey.Script_4_Opening_11, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            //Part3: 1st scan, failed
            tg.immediate(_ => {
                waitingForPlayerToScan = true
                scanLocation = undefined;
                MinimapEvent(DOTATeam_t.DOTA_TEAM_GOODGUYS, playerHero, firstScanLocation.x, firstScanLocation.y, DOTAMinimapEvent_t.DOTA_MINIMAP_EVENT_TUTORIAL_TASK_ACTIVE, 1);
            }),

            tg.audioDialog(LocalizationKey.Script_4_Opening_12, LocalizationKey.Script_4_Opening_12, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.completeOnCheck(context => checkIfScanCoversTheLocation(firstScanLocation, context), 1),
            tg.immediate(_ => {
                goalScanFailed.complete();
                waitingForPlayerToScan = false
                removeHighlight(scanUIPath);
            }),
            tg.audioDialog(LocalizationKey.Script_4_Opening_13, LocalizationKey.Script_4_Opening_13, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.immediate(_ => MinimapEvent(DOTATeam_t.DOTA_TEAM_GOODGUYS, playerHero, firstScanLocation.x, firstScanLocation.y, DOTAMinimapEvent_t.DOTA_MINIMAP_EVENT_TUTORIAL_TASK_FINISHED, 0.1)),

            //Part4: 2nd scan, succeed
            tg.audioDialog(LocalizationKey.Script_4_Opening_14, LocalizationKey.Script_4_Opening_14, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(_ => {
                scanLocation = undefined;
                waitingForPlayerToScan = true
                currentRequiredScanLocation = secondScanLocation;
                goalScanSucceed.start();
                highlightUiElement(scanUIPath, undefined, HighlightMouseButton.Left);
                MinimapEvent(DOTATeam_t.DOTA_TEAM_GOODGUYS, playerHero, secondScanLocation.x, secondScanLocation.y, DOTAMinimapEvent_t.DOTA_MINIMAP_EVENT_TUTORIAL_TASK_ACTIVE, 1);
            }),
            tg.completeOnCheck(context => checkIfScanCoversTheLocation(secondScanLocation, context), 1),
            tg.immediate(_ => {
                waitingForPlayerToScan = false
                goalScanSucceed.complete();
                removeHighlight(scanUIPath);
                MinimapEvent(DOTATeam_t.DOTA_TEAM_GOODGUYS, playerHero, secondScanLocation.x, secondScanLocation.y, DOTAMinimapEvent_t.DOTA_MINIMAP_EVENT_TUTORIAL_TASK_FINISHED, 0.1);
            }),

            tg.audioDialog(LocalizationKey.Script_4_Opening_16, LocalizationKey.Script_4_Opening_16, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Opening_17, LocalizationKey.Script_4_Opening_17, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Opening_18, LocalizationKey.Script_4_Opening_18, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        ])
    );

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        complete();
    });
}

function onStop() {
    print("Stopping", sectionName);
    removeHighlight(scanUIPath);

    const playerHero = getOrError(getPlayerHero())

    if (waitingForPlayerToScan) {
        MinimapEvent(DOTATeam_t.DOTA_TEAM_GOODGUYS, playerHero, Vector(0, 0, 0).x, Vector(0, 0, 0).y, DOTAMinimapEvent_t.DOTA_MINIMAP_EVENT_TUTORIAL_TASK_FINISHED, 0.1)
    }

    if (failedScanDialogToken) {
        dg.stop(failedScanDialogToken)
        failedScanDialogToken = undefined
    }

    if (graph) {
        graph.stop(GameRules.Addon.context);
        disposeCreeps();
        disposeHeroes();
        graph = undefined;
    }
}

// Scan radius is 900, but check within 500 to avoid the case of not covering target heroes
function checkIfScanCoversTheLocation(targetScanLocation: Vector, context: TutorialContext): boolean {
    if (scanLocation) {
        if (scanLocation.__sub(targetScanLocation).Length2D() < 500) {
            return true;
        }
        displayDotaErrorMessage(LocalizationKey.Error_Opening_1);
        if (targetScanLocation === secondScanLocation)
            failedScanDialogToken = dg.playAudio(LocalizationKey.Script_4_Opening_15, LocalizationKey.Script_4_Opening_15, context[CustomNpcKeys.SlacksMudGolem], undefined, () => failedScanDialogToken = undefined);
        scanLocation = undefined;
    }
    return false;
}

function disposeCreeps() {
    for (const creep of radiantCreeps) {
        if (IsValidEntity(creep)) {
            GameRules.Addon.context[creep.GetName()] = undefined;
            creep.RemoveSelf();
        }
    }
    radiantCreeps = [];
}

function disposeHeroes() {
    for (const jukeHero of jukeDuo) {
        const hero: CDOTA_BaseNPC_Hero | undefined = GameRules.Addon.context[jukeHero];
        if (hero && IsValidEntity(hero) && hero.IsAlive())
            hero.RemoveSelf();
        GameRules.Addon.context[jukeHero] = undefined;
    }
}

export const sectionOpening = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    orderFilter,
);

function orderFilter(event: ExecuteOrderFilterEvent): boolean {
    if (event.issuer_player_id_const !== findRealPlayerID()) return true;

    if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_RADAR) {
        if (!waitingForPlayerToScan) return false

        scanLocation = Vector(event.position_x, event.position_y);
        return checkIfScanCoversTheLocation(currentRequiredScanLocation, GameRules.Addon.context);
    }

    return true;
}
