import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import * as shared from "./Shared"
import { getOrError, getPlayerHero, displayDotaErrorMessage, highlightUiElement, removeHighlight, setUnitPacifist, getPlayerCameraLocation } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { modifier_abs_no_damage } from "../../modifiers/modifier_abs_no_damage";
import { getCommunitySpeaker, getRandomCommunitySound } from "../../Sounds";

const sectionName: SectionName = SectionName.Chapter4_Wards;

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: Vector(-3000, 3800, 128),
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroItems: { "item_greater_crit": 1, "item_mysterious_hat": 1 },
    requireRiki: true,
    rikiLocation: Vector(-1800, 4000, 256),
    blockades: Object.values(shared.blockades),
    topDireT1TowerStanding: false
};

const markerLocation = Vector(-2200, 3700, 256);
const wardLocationObs = Vector(-3400, 3800);
const wardLocationSentry = Vector(-3400, 4000);
const rikiName = CustomNpcKeys.Riki;
const panCameraWardSpotsAlpha = 1.5;

let allowUseItem = false;
let wardMarkerActive = false

//dire jungle top
const cliffLocation1 = Vector(1027, 4881);
//dire mid top
const cliffLocation2 = Vector(-261, 2047);
//radiant jungle top
const cliffLocation3 = Vector(-4354, -1006);
//radiant top tower
const cliffLocation4 = Vector(-5371, 2321);

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
    wardMarkerActive = false;

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(_ => setUnitPacifist(playerHero, true)),
            tg.fork(invisHeroInfo.map(hero => tg.spawnUnit(hero.name, hero.loc, DOTATeam_t.DOTA_TEAM_BADGUYS, hero.name, true))),

            tg.immediate(context => {
                for (const invisHero of invisHeroInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[invisHero.name];
                    hero.SetAttackCapability(DOTAUnitAttackCapability_t.DOTA_UNIT_CAP_NO_ATTACK);
                    hero.FaceTowards(playerHero.GetAbsOrigin());
                    setUnitPacifist(hero, true);

                    // For some reason this modifier does not make heroes semi-transparent?
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
            tg.audioDialog(LocalizationKey.Script_4_Wards_6, LocalizationKey.Script_4_Wards_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            tg.forkAny([
                tg.seq([
                    tg.panCameraExponential(_ => getPlayerCameraLocation(), cliffLocation1, panCameraWardSpotsAlpha),
                    tg.wait(0.25),
                    tg.panCameraExponential(cliffLocation1, cliffLocation2, panCameraWardSpotsAlpha),
                    tg.wait(0.25),
                    tg.panCameraExponential(cliffLocation2, cliffLocation3, panCameraWardSpotsAlpha),
                    tg.wait(0.25),
                    tg.panCameraExponential(cliffLocation3, cliffLocation4, panCameraWardSpotsAlpha),
                    tg.wait(4),
                ]),
                tg.audioDialog(LocalizationKey.Script_4_Wards_7, LocalizationKey.Script_4_Wards_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            ]),
            tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), panCameraWardSpotsAlpha),
            tg.immediate(_ => {
                highlightUiElement(inventorySlot1UIPath);
                goalPlaceObserverWard.start();
                MinimapEvent(DOTATeam_t.DOTA_TEAM_GOODGUYS, getPlayerHero() as CBaseEntity, markerLocation.x, markerLocation.y, DOTAMinimapEvent_t.DOTA_MINIMAP_EVENT_TUTORIAL_TASK_ACTIVE, 1);
                wardMarkerActive = true;
            }),

            tg.forkAny([
                tg.seq([
                    tg.audioDialog(LocalizationKey.Script_4_Wards_8, LocalizationKey.Script_4_Wards_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.immediate(_ => allowUseItem = true),
                    tg.completeOnCheck(_ => !playerHero.HasItemInInventory("item_ward_dispenser"), FrameTime()),
                ])
            ]),
            tg.immediate(_ => {
                goalPlaceObserverWard.complete();
                allowUseItem = false;
            }),

            tg.audioDialog(LocalizationKey.Script_4_Wards_9, LocalizationKey.Script_4_Wards_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            tg.forkAny([
                tg.seq([
                    tg.audioDialog(LocalizationKey.Script_4_Wards_12, LocalizationKey.Script_4_Wards_12, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.immediate(_ => {
                        allowUseItem = true
                        goalPlaceSentryWard.start();
                    }),
                    tg.completeOnCheck(_ => !playerHero.HasItemInInventory("item_ward_sentry"), 0.2),
                ])
            ]),
            tg.immediate(_ => {
                goalPlaceSentryWard.complete();
                removeHighlight(inventorySlot1UIPath);
            }),

            tg.audioDialog(getRandomCommunitySound(LocalizationKey.General_Scared), LocalizationKey.General_Scared, _ => getCommunitySpeaker()),

            tg.immediate(context => {
                MinimapEvent(DOTATeam_t.DOTA_TEAM_GOODGUYS, getPlayerHero() as CBaseEntity, markerLocation.x, markerLocation.y, DOTAMinimapEvent_t.DOTA_MINIMAP_EVENT_TUTORIAL_TASK_FINISHED, 0.1);
                wardMarkerActive = false;
                for (const invisHero of invisHeroInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[invisHero.name];
                    const runDirection = hero.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                    hero.MoveToPosition(hero.GetAbsOrigin().__add(runDirection.__mul(5000)));
                }
                goalAttackRiki.start();
                const riki = context[rikiName] as CDOTA_BaseNPC
                riki.StartGesture(GameActivity_t.ACT_DOTA_GENERIC_CHANNEL_1);
                riki.AddNewModifier(undefined, undefined, modifier_abs_no_damage.name, {})
                setUnitPacifist(playerHero, false);
            }),

            tg.forkAny([
                tg.seq([
                    tg.audioDialog(LocalizationKey.Script_4_Wards_14, LocalizationKey.Script_4_Wards_14, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.immediate(_ => shared.blockades.direJungleLowToHighground.destroy()),
                    tg.completeOnCheck(context => playerHero.GetAbsOrigin().__sub(context[rikiName].GetAbsOrigin()).Length2D() < 620, 0.1),
                ])
            ]),
            tg.immediate(context => {
                goalAttackRiki.complete();
                const riki: CDOTA_BaseNPC_Hero = context[rikiName];
                const runDirection = riki.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                riki.MoveToPosition(riki.GetAbsOrigin().__add(runDirection.__mul(800)));
            }),

            tg.audioDialog(LocalizationKey.Script_4_RTZ_cya, LocalizationKey.Script_4_RTZ_cya, ctx => ctx[rikiName], 2.5),
            tg.immediate(context => context[rikiName].FadeGesture(GameActivity_t.ACT_DOTA_GENERIC_CHANNEL_1)),
            tg.immediate(_ => goalHoldAlt.start()),

            tg.forkAny([
                tg.seq([
                    tg.audioDialog(LocalizationKey.Script_4_Wards_15, LocalizationKey.Script_4_Wards_15, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.waitForModifierKey(ModifierKey.Alt),
                ])
            ]),
            tg.immediate(context => {
                goalHoldAlt.complete();
                disposeHeroes();
                (context[rikiName] as CDOTA_BaseNPC).RemoveModifierByName(modifier_abs_no_damage.name)
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

    if (wardMarkerActive) {
        MinimapEvent(DOTATeam_t.DOTA_TEAM_GOODGUYS, getOrError(getPlayerHero()), Vector(0, 0, 0).x, Vector(0, 0, 0).y, DOTAMinimapEvent_t.DOTA_MINIMAP_EVENT_TUTORIAL_TASK_FINISHED, 0.1)
    }
    (GameRules.Addon.context[rikiName] as CDOTA_BaseNPC).RemoveModifierByName(modifier_abs_no_damage.name)

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
    if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_CAST_POSITION) {
        if (!allowUseItem) {
            displayDotaErrorMessage(LocalizationKey.Error_Wards_1)
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
                displayDotaErrorMessage(LocalizationKey.Error_Wards_2)
                return false;
            }
        }

        return true;
    }

    if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_ATTACK_TARGET && event.entindex_target) {
        const target = EntIndexToHScript(event.entindex_target)
        const topOutpost = getOrError(Entities.FindByName(undefined, "npc_dota_watch_tower_top"))
        if (target === topOutpost) {
            displayDotaErrorMessage(LocalizationKey.Error_Wards_3)
            return false
        }
    }

    if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_DROP_ITEM) {
        displayDotaErrorMessage(LocalizationKey.Error_Wards_4)
        return false;
    }
    if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_ITEM) {
        displayDotaErrorMessage(LocalizationKey.Error_Wards_5)
        return false;
    }
    if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_CAST_TOGGLE) {
        displayDotaErrorMessage(LocalizationKey.Error_Wards_6)
        return false;
    }
    if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_SET_ITEM_COMBINE_LOCK) {
        displayDotaErrorMessage(LocalizationKey.Error_Wards_7)
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
