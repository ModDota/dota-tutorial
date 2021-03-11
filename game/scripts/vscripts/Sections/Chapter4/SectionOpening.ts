import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import * as shared from "./Shared"
import { displayDotaErrorMessage, findRealPlayerID, getOrError, getPlayerHero, unitIsValidAndAlive, highlightUiElement, removeHighlight } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";

const sectionName: SectionName = SectionName.Chapter4_Opening;

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: Vector(-3000, 3800, 128),
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    requireRiki: true,
    rikiLocation: Vector(-1800, 4000, 256),
    blockades: Object.values(shared.blockades),
};

let canPlayerIssueOrders = true;
let scanLocation: Vector | undefined = undefined;

const miranaName = "npc_dota_hero_mirana";
const slarkName = "npc_dota_hero_slark";
const jukeDuo = [miranaName, slarkName];
const firstScanLocation = Vector(2000, 3800);
const secondScanLocation = Vector(-2000, 3800);
const outpostHighgroundCenter = Vector(-1800, 4000);
let currentRequiredScanLocation = firstScanLocation;

const radiantCreepsNames = [CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantRangedCreep];
let radiantCreeps: CDOTA_BaseNPC[] = [];

// UI Highlighting Paths
const scanUIPath = "HUDElements/minimap_container/GlyphScanContainer/RadarButton/NormalRoot/RadarIcon"

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const goalTracker = new GoalTracker();
    const goalListenDialog = goalTracker.addBoolean("Listen to the dialog explaining vision provided by friendly units.");
    const goalWatchJuke = goalTracker.addBoolean("Watch this EPIC JUKE!");
    const goalScanFailed = goalTracker.addBoolean("Click on scan with leftmouse button, then click on the target place.");
    const goalScanSucceed = goalTracker.addBoolean("Scan on the next target position.");

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");

    goalListenDialog.start();

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.setCameraTarget(playerHero),
            tg.wait(2),

            tg.audioDialog(LocalizationKey.Script_4_Opening_1, LocalizationKey.Script_4_Opening_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Opening_2, LocalizationKey.Script_4_Opening_2, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            //Part0: The camera pans to an empty part of the map
            tg.panCameraExponential(playerHero.GetAbsOrigin(), outpostHighgroundCenter, 0.9),
            tg.audioDialog(LocalizationKey.Script_4_Opening_3, LocalizationKey.Script_4_Opening_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            //Part1: Creep wave explains vision
            tg.fork(radiantCreepsNames.map(unit => tg.spawnUnit(unit, Vector(-3700, -6100, 256), DotaTeam.GOODGUYS, undefined))),
            tg.immediate(_ => {
                const creeps = Entities.FindAllByClassname("npc_dota_creature") as CDOTA_BaseNPC[];
                for (const creep of creeps) {
                    if (unitIsValidAndAlive(creep) && (creep.GetUnitName() === CustomNpcKeys.RadiantMeleeCreep || creep.GetUnitName() === CustomNpcKeys.RadiantRangedCreep)) {
                        radiantCreeps.push(creep);
                    }
                }
            }),
            tg.immediate(_ => canPlayerIssueOrders = false),
            tg.setCameraTarget(_ => radiantCreeps[0]),

            tg.forkAny([
                tg.fork(_ => radiantCreeps.map(unit => tg.moveUnit(_ => unit, Vector(4000, -6000, 128)))),
                tg.audioDialog(LocalizationKey.Script_4_Opening_4, LocalizationKey.Script_4_Opening_4, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            ]),

            tg.setCameraTarget(playerHero),
            tg.audioDialog(LocalizationKey.Script_4_Opening_5, LocalizationKey.Script_4_Opening_5, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Opening_6, LocalizationKey.Script_4_Opening_6, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(_ => {
                disposeCreeps();
                goalListenDialog.complete();
                goalWatchJuke.start();
            }),

            //Part2: Juke
            tg.audioDialog(LocalizationKey.Script_4_Opening_7, LocalizationKey.Script_4_Opening_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.spawnUnit(miranaName, GetGroundPosition(Vector(2200, -3700), undefined), DotaTeam.BADGUYS, miranaName),
            tg.spawnUnit(slarkName, GetGroundPosition(Vector(2500, -3800), undefined), DotaTeam.GOODGUYS, slarkName),
            tg.setCameraTarget(context => context[slarkName]),

            tg.fork([
                tg.seq([
                    tg.immediate(context => context[miranaName].SetAttackCapability(UnitAttackCapability.NO_ATTACK)),
                    tg.moveUnit(context => context[miranaName], GetGroundPosition(Vector(600, -3700), undefined)),
                    tg.moveUnit(context => context[miranaName], GetGroundPosition(Vector(2200, -3500), undefined)),

                ]),

                tg.seq([
                    tg.completeOnCheck(context => {
                        const slark: CDOTA_BaseNPC_Hero = context[slarkName];
                        return slark.IsIdle()
                    }, 0.5),
                    tg.moveUnit(context => context[slarkName], GetGroundPosition(Vector(400, -3700), undefined)),
                ])
            ]),

            tg.setCameraTarget(playerHero),
            tg.immediate(_ => disposeHeroes()),
            tg.immediate(_ => goalWatchJuke.complete()),

            tg.audioDialog(LocalizationKey.Script_4_Opening_8, LocalizationKey.Script_4_Opening_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Opening_9, LocalizationKey.Script_4_Opening_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Opening_10, LocalizationKey.Script_4_Opening_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.immediate(_ => canPlayerIssueOrders = true),
            tg.audioDialog(LocalizationKey.Script_4_Opening_11, LocalizationKey.Script_4_Opening_11, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            //Part3: 1st scan, failed
            tg.immediate(_ => {
                scanLocation = undefined;
                goalScanFailed.start();
                highlightUiElement(scanUIPath);
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, firstScanLocation.x, firstScanLocation.y, MinimapEventType.TUTORIAL_TASK_ACTIVE, 1);
            }),

            tg.audioDialog(LocalizationKey.Script_4_Opening_12, LocalizationKey.Script_4_Opening_12, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.completeOnCheck(_ => checkIfScanCoversTheLocation(firstScanLocation), 1),
            tg.immediate(_ => {
                goalScanFailed.complete();
                removeHighlight(scanUIPath);
            }),
            tg.audioDialog(LocalizationKey.Script_4_Opening_13, LocalizationKey.Script_4_Opening_13, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.immediate(_ => MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, firstScanLocation.x, firstScanLocation.y, MinimapEventType.TUTORIAL_TASK_FINISHED, 0.1)),

            //Part4: 2nd scan, succeed
            tg.audioDialog(LocalizationKey.Script_4_Opening_14, LocalizationKey.Script_4_Opening_14, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(_ => {
                scanLocation = undefined;
                currentRequiredScanLocation = secondScanLocation;
                goalScanSucceed.start();
                highlightUiElement(scanUIPath);
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, secondScanLocation.x, secondScanLocation.y, MinimapEventType.TUTORIAL_TASK_ACTIVE, 1);
            }),

            tg.completeOnCheck(_ => checkIfScanCoversTheLocation(secondScanLocation), 1),

            tg.immediate(_ => {
                goalScanSucceed.complete();
                removeHighlight(scanUIPath);
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, secondScanLocation.x, secondScanLocation.y, MinimapEventType.TUTORIAL_TASK_FINISHED, 0.1);
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
    if (graph) {
        graph.stop(GameRules.Addon.context);
        disposeCreeps();
        disposeHeroes();
        graph = undefined;
    }
}

// Scan radius is 900, but check within 500 to avoid the case of not covering target heroes
function checkIfScanCoversTheLocation(targetScanLocation: Vector): boolean {
    if (scanLocation) {
        if (scanLocation.__sub(targetScanLocation).Length2D() < 500) {
            return true;
        }
        displayDotaErrorMessage("Scan the required location");
        // TODO: Play opening_15 audio SL
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

    if (event.order_type === UnitOrder.RADAR) {
        scanLocation = Vector(event.position_x, event.position_y);
        return checkIfScanCoversTheLocation(currentRequiredScanLocation);
    }

    return canPlayerIssueOrders;
}
