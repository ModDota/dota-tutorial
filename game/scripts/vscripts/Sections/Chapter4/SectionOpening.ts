import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { displayDotaErrorMessage, findRealPlayerID, getOrError, getPlayerHero, unitIsValidAndAlive, highlightUiElement, removeHighlight } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";

const sectionName: SectionName = SectionName.Chapter4_Opening;

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    heroLocation: Vector(-3000, 3800, 128),
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    requireRiki: true,
    rikiLocation: Vector(-1800, 4000, 256),
};

let canPlayerIssueOrders = true;
let scanLocation: Vector | undefined = undefined;

const miranaName = "npc_dota_hero_mirana";
const slarkName = "npc_dota_hero_slark";
const jukeDuo = [miranaName, slarkName];
const firstScanLocation = Vector(2000, 3800);
const secondScanLocation = Vector(-2000, 3800);
let currentRequiredScanLocation = firstScanLocation;
const scanDuration = 8;

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
            //Part0: The camera pans to an empty part of the map

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
            tg.fork(_ => radiantCreeps.map(unit => tg.moveUnit(_ => unit, Vector(4000, -6000, 128)))),
            tg.setCameraTarget(playerHero),
            tg.immediate(_ => {
                disposeCreeps();
                goalListenDialog.complete();
                goalWatchJuke.start();
            }),

            //Part2: Juke
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
            tg.immediate(_ => canPlayerIssueOrders = true),
            tg.wait(2),

            //Part3: 1st scan, failed
            tg.immediate(_ => {
                scanLocation = undefined;
                goalWatchJuke.complete();
                goalScanFailed.start();
                highlightUiElement(scanUIPath, undefined, false)
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, firstScanLocation.x, firstScanLocation.y, MinimapEventType.TUTORIAL_TASK_ACTIVE, 1);
            }),

            tg.completeOnCheck(_ => checkIfScanCoversTheLocation(firstScanLocation), 1),

            tg.immediate(_ => {
                goalScanFailed.complete();
                removeHighlight(scanUIPath)
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, firstScanLocation.x, firstScanLocation.y, MinimapEventType.TUTORIAL_TASK_FINISHED, 0.1);
            }),
            tg.wait(scanDuration),

            //Part4: 2nd scan, succeed
            tg.immediate(_ => {
                scanLocation = undefined;
                currentRequiredScanLocation = secondScanLocation;
                goalScanSucceed.start();
                highlightUiElement(scanUIPath, undefined, false)
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, secondScanLocation.x, secondScanLocation.y, MinimapEventType.TUTORIAL_TASK_ACTIVE, 1);
            }),

            tg.completeOnCheck(_ => checkIfScanCoversTheLocation(secondScanLocation), 1),

            tg.immediate(_ => {
                goalScanSucceed.complete();
                removeHighlight(scanUIPath)
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, secondScanLocation.x, secondScanLocation.y, MinimapEventType.TUTORIAL_TASK_FINISHED, 0.1);
            }),
            tg.wait(scanDuration),
        ])
    );

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        complete();
    });
}

function onStop() {
    print("Stopping", sectionName);
    removeHighlight(scanUIPath)
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
