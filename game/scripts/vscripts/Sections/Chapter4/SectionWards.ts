import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import * as shared from "./Shared"
import { getOrError, getPlayerHero, displayDotaErrorMessage, highlightUiElement, removeHighlight, freezePlayerHero, setUnitPacifist, getPlayerCameraLocation } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";

const sectionName: SectionName = SectionName.Chapter4_Wards;

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: Vector(-3000, 3800, 128),
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroItems: { "item_greater_crit": 1 },
    requireRiki: true,
    rikiLocation: Vector(-1800, 4000, 256),
    blockades: Object.values(shared.blockades),
};

const markerLocation = Vector(-2200, 3700, 256);
const wardLocationObs = Vector(-3400, 3800);
const wardLocationSentry = Vector(-3400, 4000);
const rikiName = "npc_dota_hero_riki";
let allowUseItem = false;

//dire jungle top
const cliffLocation1 = Vector(1023, 4872);
//dire mid top
const cliffLocation2 = Vector(-261, 2047);
//dire jungle bot
const cliffLocation3 = Vector(5115, 785);
//dire river bot
const cliffLocation4 = Vector(4861, -2301);
//dire mid bot
const cliffLocation5 = Vector(2011, -780);
//radiant jungle
const cliffLocation6 = Vector(1017, -4070)
//radiant mid bot
const cliffLocation7 = Vector(770, -2300);
//radiant jungle bot
const cliffLocation8 = Vector(-1787, -4846)
//radiant jungle
const cliffLocation9 = Vector(-4347, -1012)
//radiant toplane
const cliffLocation10 = Vector(-5503, 2292);

const cameraSpeed = 2500;

const invisHeroInfo = [
    { name: "npc_dota_hero_clinkz", loc: Vector(-2200, 3600, 256) },
    { name: "npc_dota_hero_mirana", loc: Vector(-2000, 3800, 256) },
    { name: "npc_dota_hero_bounty_hunter", loc: Vector(-2000, 4100, 256) },
    { name: "npc_dota_hero_invoker", loc: Vector(-2000, 4200, 256) },
    { name: "npc_dota_hero_nyx_assassin", loc: Vector(-1800, 4000, 256) },
    { name: "npc_dota_hero_slark", loc: Vector(-1800, 4200, 256) },
    { name: "npc_dota_hero_weaver", loc: Vector(-1600, 4100, 256) },
    { name: "npc_dota_hero_sand_king", loc: Vector(-1600, 3800, 256) },
];

// UI Highlighting Paths
const inventorySlot1UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_list_container/inventory_list/inventory_slot_1"

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const goalTracker = new GoalTracker();
    const goalFetchWard = goalTracker.addBoolean(LocalizationKey.Goal_4_Wards_1);
    const goalPlaceObserverWard = goalTracker.addBoolean(LocalizationKey.Goal_4_Wards_2);
    const goalPlaceSentryWard = goalTracker.addBoolean(LocalizationKey.Goal_4_Wards_3);
    const goalAttackRiki = goalTracker.addBoolean(LocalizationKey.Goal_4_Wards_4);
    const goalHoldAlt = goalTracker.addBoolean(LocalizationKey.Goal_4_Wards_5);

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");

    const observerWardName = "item_ward_observer"
    const sentryWardName = "item_ward_sentry"

    const observerWardItem = CreateItem(observerWardName, undefined, undefined);
    const sentryWardItem = CreateItem(sentryWardName, undefined, undefined);
    allowUseItem = false;

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(_ => setUnitPacifist(playerHero, true)),
            tg.fork(invisHeroInfo.map(hero => tg.spawnUnit(hero.name, hero.loc, DotaTeam.BADGUYS, hero.name, true))),

            tg.immediate(context => {
                for (const invisHero of invisHeroInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[invisHero.name];
                    hero.SetAttackCapability(UnitAttackCapability.NO_ATTACK);
                    hero.FaceTowards(playerHero.GetAbsOrigin());
                    setUnitPacifist(hero, true);

                    // For some reason this modifier does not make heroes semi-transparent?
                    //hero.AddNewModifier(undefined, undefined, "modifier_invisible", undefined);
                    // Riki ult does
                    const ability = hero.AddAbility("riki_permanent_invisibility");
                    ability.SetLevel(1);
                    ability.SetHidden(true);
                }
            }),

            tg.immediate(_ => goalFetchWard.start()),
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_4_Wards_1, LocalizationKey.Script_4_Wards_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.withHighlights(tg.seq([
                    tg.immediate(_ => {
                        CreateItemOnPositionSync(wardLocationObs, observerWardItem);
                    }),

                    tg.completeOnCheck(_ => playerHero.HasItemInInventory("item_ward_dispenser") || playerHero.HasItemInInventory(observerWardName), 0.2),
                ]), { type: "arrow", locations: [wardLocationObs] }),
                tg.withHighlights(tg.seq([
                    tg.immediate(_ => {
                        CreateItemOnPositionSync(wardLocationSentry, sentryWardItem);
                    }),

                    tg.completeOnCheck(_ => playerHero.HasItemInInventory("item_ward_dispenser") || playerHero.HasItemInInventory(sentryWardName), 0.2),
                ]), { type: "arrow", locations: [wardLocationSentry] }),
            ]),

            tg.immediate(_ => goalFetchWard.complete()),
            tg.audioDialog(LocalizationKey.Script_4_Wards_2, LocalizationKey.Script_4_Wards_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Wards_3, LocalizationKey.Script_4_Wards_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Wards_4, LocalizationKey.Script_4_Wards_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Wards_5, LocalizationKey.Script_4_Wards_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(_ => freezePlayerHero(true)),
            tg.audioDialog(LocalizationKey.Script_4_Wards_6, LocalizationKey.Script_4_Wards_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            tg.fork([
                tg.seq([
                    tg.panCamera(_ => getPlayerCameraLocation(), cliffLocation1, _ => cameraSpeed),
                    tg.wait(0.25),
                    tg.panCamera(cliffLocation1, cliffLocation2, _ => cameraSpeed),
                    tg.wait(0.25),
                    tg.panCamera(cliffLocation2, cliffLocation3, _ => cameraSpeed),
                    tg.wait(0.25),
                    tg.panCamera(cliffLocation3, cliffLocation4, _ => cameraSpeed),
                    tg.wait(0.25),
                    tg.panCamera(cliffLocation4, cliffLocation5, _ => cameraSpeed),
                    tg.wait(0.25),
                    tg.panCamera(cliffLocation5, cliffLocation6, _ => cameraSpeed),
                    tg.wait(0.25),
                    tg.panCamera(cliffLocation6, cliffLocation7, _ => cameraSpeed),
                    tg.wait(0.25),
                    tg.panCamera(cliffLocation7, cliffLocation8, _ => cameraSpeed),
                    tg.wait(0.25),
                    tg.panCamera(cliffLocation8, cliffLocation9, _ => cameraSpeed),
                    tg.wait(0.25),
                    tg.panCamera(cliffLocation9, cliffLocation10, _ => cameraSpeed),
                    tg.wait(0.25),
                    tg.panCamera(cliffLocation10, _ => playerHero.GetAbsOrigin(), _ => cameraSpeed),
                ]),
                tg.audioDialog(LocalizationKey.Script_4_Wards_7, LocalizationKey.Script_4_Wards_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            ]),
            tg.immediate(_ => freezePlayerHero(false)),
            tg.immediate(_ => {
                highlightUiElement(inventorySlot1UIPath);
                goalPlaceObserverWard.start();
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, markerLocation.x, markerLocation.y, MinimapEventType.TUTORIAL_TASK_ACTIVE, 1);
            }),

            tg.audioDialog(LocalizationKey.Script_4_Wards_8, LocalizationKey.Script_4_Wards_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.immediate(_ => allowUseItem = true),
            tg.completeOnCheck(_ => !playerHero.HasItemInInventory("item_ward_dispenser"), 1),

            tg.immediate(_ => {
                goalPlaceObserverWard.complete();
                allowUseItem = false;
                goalPlaceSentryWard.start();
            }),

            tg.audioDialog(LocalizationKey.Script_4_Wards_9, LocalizationKey.Script_4_Wards_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Wards_12, LocalizationKey.Script_4_Wards_12, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.immediate(_ => allowUseItem = true),
            tg.completeOnCheck(_ => !playerHero.HasItemInInventory("item_ward_sentry"), 1),

            tg.immediate(_ => {
                goalPlaceSentryWard.complete();
                removeHighlight(inventorySlot1UIPath);
            }),

            tg.audioDialog(LocalizationKey.Script_4_Wards_13, LocalizationKey.Script_4_Wards_13, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.immediate(context => {
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, markerLocation.x, markerLocation.y, MinimapEventType.TUTORIAL_TASK_FINISHED, 0.1);
                for (const invisHero of invisHeroInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[invisHero.name];
                    const runDirection = hero.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                    hero.MoveToPosition(hero.GetAbsOrigin().__add(runDirection.__mul(5000)));
                }
                goalAttackRiki.start();
                context[rikiName].StartGesture(GameActivity.DOTA_GENERIC_CHANNEL_1);
                setUnitPacifist(playerHero, false);
            }),

            tg.audioDialog(LocalizationKey.Script_4_Wards_14, LocalizationKey.Script_4_Wards_14, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            tg.immediate(_ => shared.blockades.direJungleLowToHighground.destroy()),
            tg.completeOnCheck(context => playerHero.GetAbsOrigin().__sub(context[rikiName].GetAbsOrigin()).Length2D() < 620, 0.1),

            tg.immediate(context => {
                goalAttackRiki.complete();
                const riki: CDOTA_BaseNPC_Hero = context[rikiName];
                const runDirection = riki.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                riki.MoveToPosition(riki.GetAbsOrigin().__add(runDirection.__mul(800)));
            }),
            tg.wait(3),
            tg.immediate(context => context[rikiName].FadeGesture(GameActivity.DOTA_GENERIC_CHANNEL_1)),
            tg.immediate(_ => goalHoldAlt.start()),
            tg.audioDialog(LocalizationKey.Script_4_Wards_15, LocalizationKey.Script_4_Wards_15, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.waitForModifierKey(ModifierKey.Alt),
            tg.immediate(_ => {
                goalHoldAlt.complete();
                disposeHeroes();
            }),
        ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        complete();
    })
}

function onStop() {
    print("Stopping", sectionName);

    if (graph) {
        graph.stop(GameRules.Addon.context);
        disposeHeroes();
        graph = undefined;
    }
}

function disposeHeroes() {
    for (const invisHero of invisHeroInfo) {
        const hero: CDOTA_BaseNPC_Hero | undefined = GameRules.Addon.context[invisHero.name];
        if (hero && IsValidEntity(hero) && hero.IsAlive())
            hero.RemoveSelf();
        GameRules.Addon.context[invisHero.name] = undefined;
    }
}

function orderFilter(event: ExecuteOrderFilterEvent): boolean {
    if (event.order_type === UnitOrder.CAST_POSITION) {
        if (!allowUseItem) {
            displayDotaErrorMessage("Item usage is currently disabled.")
            return false;
        }
        const targetPosition2D = Vector(event.position_x, event.position_y);
        const distance = markerLocation.__sub(targetPosition2D).Length2D();
        const targetZ = event.position_z;

        const ability = EntIndexToHScript(event.entindex_ability) as CDOTABaseAbility;
        if (ability.GetName() === "item_ward_dispenser" || ability.GetName() === "item_ward_sentry") {
            if (targetZ === markerLocation.z && distance < 150) {
                return true;
            } else {
                displayDotaErrorMessage("Place the ward on the target location.")
                return false;
            }
        }

        return true;
    }

    if (event.order_type === UnitOrder.DROP_ITEM) {
        displayDotaErrorMessage("Dropping items is currently disabled.")
        return false;
    }
    if (event.order_type === UnitOrder.MOVE_ITEM) {
        displayDotaErrorMessage("Moving items is currently disabled.")
        return false;
    }
    if (event.order_type === UnitOrder.CAST_TOGGLE) {
        displayDotaErrorMessage("Toggling items is currently disabled.")
        return false;
    }
    if (event.order_type === UnitOrder.SET_ITEM_COMBINE_LOCK) {
        displayDotaErrorMessage("Locking or combining items is currently disabled.")
        return false;
    }
    return true;
}

export const sectionWards = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    orderFilter
);
