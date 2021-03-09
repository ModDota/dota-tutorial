import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { getOrError, getPlayerHero, displayDotaErrorMessage, highlightUiElement, removeHighlight } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";

const sectionName: SectionName = SectionName.Chapter4_Wards;

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    heroLocation: Vector(-3000, 3800, 128),
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    requireRiki: true,
    rikiLocation: Vector(-1800, 4000, 256),
};

const markerLocation = Vector(-2200, 3800, 256);
const wardLocation = Vector(-3400, 3800);
const wardLocationSentry = Vector(-3400, 4000);
const invisHeroesCenter = Vector(-1800, 4000);

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
const InventorySlot_0_UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_list_container/inventory_list/inventory_slot_0"

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
            tg.fork(invisHeroInfo.map(hero => tg.spawnUnit(hero.name, hero.loc, DotaTeam.BADGUYS, hero.name))),

            tg.immediate(context => {
                for (const invisHero of invisHeroInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[invisHero.name];
                    hero.AddNewModifier(undefined, undefined, "modifier_invisible", undefined);
                }
            }),

            tg.wait(1),

            // Spawn wards and wait for player to pick them up. Also highlight wards during this.
            tg.withHighlights(tg.seq([
                tg.immediate(_ => {
                    CreateItemOnPositionSync(wardLocation, observerWardItem);
                    CreateItemOnPositionSync(wardLocation.__add(Vector(0, 200)), sentryWardItem);
                }),

                tg.immediate(_ => goalFetchWard.start()),

                tg.completeOnCheck(_ => playerHero.HasItemInInventory("item_ward_dispenser"), 1),
            ]), { type: "arrow", locations: [wardLocation, wardLocationSentry] }),

            tg.immediate(_ => {
                goalFetchWard.complete();
                goalPlaceObserverWard.start();
                highlightUiElement(InventorySlot_0_UIPath, undefined, true)
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, markerLocation.x, markerLocation.y, MinimapEventType.TUTORIAL_TASK_ACTIVE, 1);
            }),

            tg.wait(2),

            tg.completeOnCheck(_ => !playerHero.HasItemInInventory("item_ward_dispenser"), 1),

            tg.immediate(_ => {
                goalPlaceObserverWard.complete();
                removeHighlight(InventorySlot_0_UIPath)
                goalPlaceSentryWard.start();
            }),

            tg.completeOnCheck(_ => !playerHero.HasItemInInventory("item_ward_sentry"), 1),

            tg.immediate(_ => goalPlaceSentryWard.complete()),

            tg.immediate(context => {
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, markerLocation.x, markerLocation.y, MinimapEventType.TUTORIAL_TASK_FINISHED, 0.1);
                for (const invisHero of invisHeroInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[invisHero.name];
                    const runDirection = hero.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                    hero.MoveToPosition(hero.GetAbsOrigin().__add(runDirection.__mul(5000)));

                }
                goalAttackRiki.start();
            }),

            tg.completeOnCheck(context => playerHero.GetAbsOrigin().__sub(context["npc_dota_hero_riki"].GetAbsOrigin()).Length2D() < 400, 0.1),

            tg.immediate(context => {
                goalAttackRiki.complete();
                const riki: CDOTA_BaseNPC_Hero = context["npc_dota_hero_riki"];
                const runDirection = riki.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                riki.MoveToPosition(riki.GetAbsOrigin().__add(runDirection.__mul(800)));
            }),
            tg.wait(3),

            tg.immediate(_ => goalHoldAlt.start()),
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
    removeHighlight(InventorySlot_0_UIPath)
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
