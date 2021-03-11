import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import * as shared from "./Shared"
import { getOrError, getPlayerHero, displayDotaErrorMessage, highlightUiElement, removeHighlight, freezePlayerHero } from "../../util";
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
    requireRiki: true,
    rikiLocation: Vector(-1800, 4000, 256),
    blockades: Object.values(shared.blockades),
};

const markerLocation = Vector(-2200, 3800, 256);
const wardLocationObs = Vector(-3400, 3800);
const wardLocationSentry = Vector(-3400, 4000);
const invisHeroesCenter = Vector(-1800, 4000);
const rikiName = "npc_dota_hero_riki";

//dire mid top
const cliffLocation1 = Vector(-261, 2047);
//dire mid bot
const cliffLocation2 = Vector(2011, -780);
//radiant mid bot
const cliffLocation3 = Vector(770, -2300);
//radiant toplane
const cliffLocation4 = Vector(-5503, 2292);
//radiant jungle top
const cliffLocation5 = Vector(-4376, -1162)
//radiant jungle tier 2 bot
const cliffLocation6 = Vector(-1805, -4973)
//radiant jungle outpost
const cliffLocation7 = Vector(1028, -4103)
//dire tier 1 bot
const cliffLocation8 = Vector(4868, -2300)
//dire tier 2 bot
const cliffLocation9 = Vector(5204, 662)
//dire tier 2 top
const cliffLocation10 = Vector(1101, 4734)

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
const inventorySlot0UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_list_container/inventory_list/inventory_slot_0"

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const goalTracker = new GoalTracker();
    const goalFetchWard = goalTracker.addBoolean("Go pick those up and come back here.");
    const goalPlaceObserverWard = goalTracker.addBoolean("Lets put an observer ward on this high ground.");
    const goalPlaceSentryWard = goalTracker.addBoolean("Lets put a sentry ward on this high ground.");
    const goalAttackRiki = goalTracker.addBoolean("Go attack Riki with right mouse click on him.");
    const goalHoldAlt = goalTracker.addBoolean("Hold Alt button to check sentry range.");

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");

    const observerWardItem = CreateItem("item_ward_observer", undefined, undefined);
    const sentryWardItem = CreateItem("item_ward_sentry", undefined, undefined);

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.setCameraTarget(playerHero),
            tg.fork(invisHeroInfo.map(hero => tg.spawnUnit(hero.name, hero.loc, DotaTeam.BADGUYS, hero.name, true))),

            tg.immediate(context => {
                for (const invisHero of invisHeroInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[invisHero.name];
                    hero.SetAttackCapability(UnitAttackCapability.NO_ATTACK);
                    hero.AddNewModifier(undefined, undefined, "modifier_invisible", undefined);
                    hero.Stop();
                    hero.FaceTowards(playerHero.GetAbsOrigin());
                }
            }),

            tg.withHighlights(tg.seq([
                tg.immediate(_ => {
                    CreateItemOnPositionSync(wardLocationObs, observerWardItem);
                    CreateItemOnPositionSync(wardLocationSentry, sentryWardItem);
                }),

                tg.immediate(_ => goalFetchWard.start()),
                tg.textDialog(LocalizationKey.Script_4_Wards_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),

                tg.completeOnCheck(_ => playerHero.HasItemInInventory("item_ward_dispenser"), 1),
            ]), { type: "arrow", locations: [wardLocationObs, wardLocationSentry] }),

            tg.immediate(_ => goalFetchWard.complete()),
            tg.textDialog(LocalizationKey.Script_4_Wards_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_4_Wards_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_4_Wards_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_4_Wards_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_4_Wards_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),

            // TODO: Camera pan to cliffs
            tg.fork([
                tg.seq([
                    tg.panCameraExponential(playerHero.GetAbsOrigin(), cliffLocation1, 0.9),
                    tg.panCameraExponential(cliffLocation1, cliffLocation2, 0.9),
                    tg.panCameraExponential(cliffLocation2, cliffLocation3, 0.9),
                    tg.panCameraExponential(cliffLocation3, cliffLocation4, 0.9),
                    tg.panCameraExponential(cliffLocation4, cliffLocation5, 0.9),
                    tg.panCameraExponential(cliffLocation5, cliffLocation6, 0.9),
                    tg.panCameraExponential(cliffLocation6, cliffLocation7, 0.9),
                    tg.panCameraExponential(cliffLocation7, cliffLocation8, 0.9),
                    tg.panCameraExponential(cliffLocation8, cliffLocation9, 0.9),
                    tg.panCameraExponential(cliffLocation9, cliffLocation10, 0.9),
                    tg.panCameraExponential(cliffLocation10, playerHero.GetAbsOrigin(), 0.9),
                ]),
                tg.textDialog(LocalizationKey.Script_4_Wards_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            ]),

            tg.immediate(_ => {
                goalPlaceObserverWard.start();
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, markerLocation.x, markerLocation.y, MinimapEventType.TUTORIAL_TASK_ACTIVE, 1);
            }),

            tg.textDialog(LocalizationKey.Script_4_Wards_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),

            tg.completeOnCheck(_ => !playerHero.HasItemInInventory("item_ward_dispenser"), 1),

            tg.immediate(_ => {
                goalPlaceObserverWard.complete();
                goalPlaceSentryWard.start();
                freezePlayerHero(true);
            }),

            tg.textDialog(LocalizationKey.Script_4_Wards_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_4_Wards_10, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_4_Wards_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_4_Wards_12, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),

            tg.immediate(_ => freezePlayerHero(false)),
            tg.completeOnCheck(_ => !playerHero.HasItemInInventory("item_ward_sentry"), 1),

            tg.immediate(_ => goalPlaceSentryWard.complete()),

            tg.textDialog(LocalizationKey.Script_4_Wards_13, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 1),

            tg.immediate(context => {
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, markerLocation.x, markerLocation.y, MinimapEventType.TUTORIAL_TASK_FINISHED, 0.1);
                for (const invisHero of invisHeroInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[invisHero.name];
                    const runDirection = hero.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                    hero.MoveToPosition(hero.GetAbsOrigin().__add(runDirection.__mul(5000)));
                }
                shared.blockades.direJungleLowToHighground.destroy();
                goalAttackRiki.start();
                context[rikiName].StartGesture(GameActivity.DOTA_GENERIC_CHANNEL_1);
            }),
            tg.textDialog(LocalizationKey.Script_4_Wards_14, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),

            tg.completeOnCheck(context => playerHero.GetAbsOrigin().__sub(context[rikiName].GetAbsOrigin()).Length2D() < 400, 0.1),

            tg.immediate(context => {
                goalAttackRiki.complete();
                const riki: CDOTA_BaseNPC_Hero = context[rikiName];
                const runDirection = riki.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                riki.MoveToPosition(riki.GetAbsOrigin().__add(runDirection.__mul(800)));
            }),
            tg.wait(3),
            tg.immediate(context => context[rikiName].FadeGesture(GameActivity.DOTA_GENERIC_CHANNEL_1)),
            tg.immediate(_ => goalHoldAlt.start()),
            tg.textDialog(LocalizationKey.Script_4_Wards_15, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
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
        const targetPosition2D = Vector(event.position_x, event.position_y);
        const distance = markerLocation.__sub(targetPosition2D).Length2D();
        const targetZ = event.position_z;

        const ability = EntIndexToHScript(event.entindex_ability) as CDOTABaseAbility;
        if (ability.GetName() === "item_ward_dispenser" || ability.GetName() === "item_ward_sentry") {
            if (targetZ === markerLocation.z && distance < 200) {
                return true;
            } else {
                displayDotaErrorMessage("Place the ward on the target location.")
                return false;
            }
        }

        return true;
    }

    if (event.order_type === UnitOrder.DROP_ITEM || event.order_type === UnitOrder.MOVE_ITEM || event.order_type === UnitOrder.CAST_TOGGLE) {
        displayDotaErrorMessage("Dropping, moving or toggling your items is disabled during this section.")
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
