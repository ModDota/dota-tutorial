import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { DestroyNeutrals, getOrError, getPlayerHero, unitIsValidAndAlive, highlightUiElement, removeHighlight } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";

let graph: tg.TutorialStep | undefined = undefined;
// Use this variable to detect whether item has been moved // TODO better solution
let movedToStash = false;

const requiredState: RequiredState = {
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroLocation: GetGroundPosition(Vector(-4000, -550), undefined),
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
}

// UI Highlighting Paths
const neutralSlotUIPath = "HUDElements/lower_hud/center_with_stats/inventory_composition_layer_container/inventory_neutral_slot_container/inventory_neutral_slot"
const inventorySlot6UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_backpack_list/inventory_slot_6/ButtonAndLevel"
const inventorySlot7UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_backpack_list/inventory_slot_7/ButtonAndLevel"

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", {
        section: SectionName.Chapter3_Opening,
    });

    const goalTracker = new GoalTracker();
    const goalMoveToCamp = goalTracker.addBoolean("Move to the neutral creep camp");
    const goalKillSatyrs = goalTracker.addBoolean("Kill the neutral creeps (Satyrs)");
    const goalPickupArcane = goalTracker.addBoolean("Pickup the arcane ring");
    const goalUseArcane = goalTracker.addBoolean("Use your new found item.");
    const goalPressAlt = goalTracker.addBoolean("Press alt to see the spawn box"); // TODO: Use this
    const goalMoveOutOfNeutralBox = goalTracker.addBoolean("Move out of the spawn box");
    const goalKillWolves = goalTracker.addBoolean("Kill the neutral creeps (Wolves)");
    const goalPickupItems = goalTracker.addBoolean("Pick up the dropped items");
    const goalSwitchItems = goalTracker.addBoolean("Switch the possessed mask with the arcane ring");
    const goalGiveArcane = goalTracker.addBoolean("Give the arcane ring to warlock");
    const goalStash = goalTracker.addBoolean("Put the item in the neutral stash");
    
    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");

    // Also in orderfilter at the bottom!
    const giveAwayItemName = "item_arcane_ring";
    const dropInStashItemName = "item_mysterious_hat";
    const keepItemName = "item_possessed_mask";

    const units: CDOTA_BaseNPC[] = [];

    playerHero.SetMoveCapability(UnitMoveCapability.GROUND);

    const markerLocation = Vector(-3250, -150);

    const neutralCamp = getOrError(Entities.FindByClassnameNearest(
        "npc_dota_neutral_spawner",
        Vector(-2608, -648, 265),
        100
    ), "Could not find neutral camp spawner");
    const neutralCampPostion = neutralCamp.GetAbsOrigin();

    GameRules.SpawnNeutralCreeps();

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        tg.wait(1),
        // Show message and explain what the "neutral spawn indicators" on the minimap are.
        // Kill them after so that we can make our own.
        tg.immediate(_ => DestroyNeutrals()),

        tg.immediate(_ => goalMoveToCamp.start()),
        tg.goToLocation(markerLocation),
        tg.immediate(_ => {
            goalMoveToCamp.complete();
            goalKillSatyrs.start();
        }),

        // Create the units
        tg.spawnUnit(
            "npc_dota_neutral_satyr_trickster",
            neutralCampPostion.__add(RandomVector(50)),
            DotaTeam.NEUTRALS,
            "trickster_1"
        ),
        tg.spawnUnit(
            "npc_dota_neutral_satyr_trickster",
            neutralCampPostion.__add(RandomVector(50)),
            DotaTeam.NEUTRALS,
            "trickster_2"
        ),
        tg.spawnUnit(
            "npc_dota_neutral_satyr_soulstealer",
            neutralCampPostion.__add(RandomVector(50)),
            DotaTeam.NEUTRALS,
            "soulstealer_1"
        ),
        tg.spawnUnit(
            "npc_dota_neutral_satyr_soulstealer",
            neutralCampPostion.__add(RandomVector(50)),
            DotaTeam.NEUTRALS,
            "soulstealer_2"
        ),

        tg.immediate((ctx) => {
            units.push(ctx["trickster_1"] as CDOTA_BaseNPC);
            units.push(ctx["trickster_2"] as CDOTA_BaseNPC);
            units.push(ctx["soulstealer_1"] as CDOTA_BaseNPC);
        }),

        // Check if they are killed
        tg.fork([
            tg.completeOnCheck(_ => !units.some(unitIsValidAndAlive), 1),
            //This one gives the item
            tg.completeOnCheck(ctx => {
                const unit = ctx["soulstealer_2"] as CDOTA_BaseNPC;
                if (!unitIsValidAndAlive(unit)) {
                    DropNeutralItemAtPositionForHero(giveAwayItemName, unit.GetAbsOrigin(), playerHero, 0, true);
                    return true;
                }
                return false;
            }, 0.1),
        ]),

        tg.immediate(_ => {
            playerHero.HeroLevelUp(true);
            goalKillSatyrs.complete();
            goalPickupArcane.start();
        }),

        // Explain that neutrals drop items, how it works. Tell the player to pick it up.
        tg.completeOnCheck(_ => playerHero.HasItemInInventory(giveAwayItemName), 1),

        // Tell the player that some neutral items have active abilities, tell them to use it.
        tg.immediate(_ => {
            goalPickupArcane.complete();
            highlightUiElement(neutralSlotUIPath, undefined, false);
            goalUseArcane.start();
        }),
        tg.completeOnCheck(_ => {
            const item = playerHero.FindItemInInventory(giveAwayItemName);
            return item !== undefined && !item.IsCooldownReady();
        }, 1),

        tg.immediate(_ => {
            goalUseArcane.complete();
            goalMoveOutOfNeutralBox.start();
            removeHighlight(neutralSlotUIPath)
        }),

        // Teach the player about when neutrals are respawning (Maybe even adjust/freeze the clock?)
        tg.goToLocation(markerLocation),
        tg.immediate(_ => {
            goalMoveOutOfNeutralBox.complete();
            goalKillWolves.start();
            goalPickupItems.start();
        }),
        // Spawn new creeps, this time we do wolves.
        tg.spawnUnit(
            "npc_dota_neutral_alpha_wolf",
            neutralCampPostion.__add(RandomVector(50)),
            DotaTeam.NEUTRALS,
            "alpha_1"
        ),
        tg.spawnUnit(
            "npc_dota_neutral_alpha_wolf",
            neutralCampPostion.__add(RandomVector(50)),
            DotaTeam.NEUTRALS,
            "alpha_2"
        ),
        tg.spawnUnit(
            "npc_dota_neutral_giant_wolf",
            neutralCampPostion.__add(RandomVector(50)),
            DotaTeam.NEUTRALS,
            "giant_1"
        ),
        tg.fork([
            tg.completeOnCheck(ctx => {
                const unit = ctx["alpha_1"] as CDOTA_BaseNPC;
                if (!unitIsValidAndAlive(unit)) {
                    DropNeutralItemAtPositionForHero(keepItemName, unit.GetAbsOrigin(), playerHero, 0, true);
                    return true;
                }
                return false;
            }, 0.1),

            tg.completeOnCheck(ctx => {
                const unit = ctx["giant_1"] as CDOTA_BaseNPC;
                if (!unitIsValidAndAlive(unit)) {
                    DropNeutralItemAtPositionForHero(dropInStashItemName, unit.GetAbsOrigin(), playerHero, 0, true);
                    return true;
                }
                return false;
            }, 0.1),

            tg.completeOnCheck(ctx => {
                const unit = ctx["alpha_2"] as CDOTA_BaseNPC;
                return !unitIsValidAndAlive(unit);
            }, 0.1)
        ]),

        // Tell the player to pick up both items
        tg.fork([
            tg.immediate(_ => goalKillWolves.complete()),
            tg.completeOnCheck(_ => playerHero.HasItemInInventory(keepItemName), 0.1),
            tg.completeOnCheck(_ => playerHero.HasItemInInventory(dropInStashItemName), 0.1)
        ]),

        // Tell the player how to switch items, make sure the possesed mask is in the right slot.
        tg.immediate(_ => {
            goalPickupItems.complete();
            goalSwitchItems.start();
            highlightUiElement(neutralSlotUIPath, undefined, false);
        }),
        tg.completeOnCheck((context) => {
            const item = playerHero.GetItemInSlot(InventorySlot.NEUTRAL_SLOT);
            if (item && item.GetAbilityName() === keepItemName) {
                movedToStash = false;
                goalSwitchItems.complete();
                removeHighlight(neutralSlotUIPath)
                goalGiveArcane.start();
                highlightUiElement(inventorySlot6UIPath, undefined, false);
                highlightUiElement(inventorySlot7UIPath, undefined, false);
                goalStash.start();
                return true;
            }
            return false;
        }, 0.1),

        // Create an allied hero (Warlock) and make them transfer the arcane ring to warlock.
        // Also let them place the mysterious hat in the neutral stash
        tg.spawnUnit("npc_dota_hero_warlock", markerLocation, playerHero.GetTeam(), "warlock"),
        tg.fork([
            tg.completeOnCheck(ctx => {
                const warlock = ctx["warlock"] as CDOTA_BaseNPC_Hero;
                if (warlock.HasItemInInventory(giveAwayItemName)) {
                    goalGiveArcane.complete();
                    return true;
                }
                return false;
            }, 0.1),
            // Checking the neutral stash is impossible?
            tg.completeOnCheck(_ => {
                if (movedToStash) {
                    goalStash.complete();
                    removeHighlight(inventorySlot6UIPath)
                    removeHighlight(inventorySlot7UIPath)
                    return true;
                }
                return false;
            }, 0.1)
        ]),
    ]));

    graph.start(GameRules.Addon.context, () => {
        print("Completed", "Section CH3 Opening");
        complete();
    });
};

const onStop = () => {
    print("Stopping", "Section Opening");
    removeHighlight(inventorySlot6UIPath)
    removeHighlight(inventorySlot7UIPath)
    removeHighlight(neutralSlotUIPath)
    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
};

export const sectionOpening = new tut.FunctionalSection(
    SectionName.Chapter3_Opening,
    requiredState,
    onStart,
    onStop,
    orderFilter
);

// Certain order will need to be filtered, if the player sabotages themselves they will get stuck
function orderFilter(event: ExecuteOrderFilterEvent): boolean {
    const giveAwayItemName = "item_arcane_ring";
    const dropInStashItemName = "item_mysterious_hat";
    const keepItemName = "item_possessed_mask";

    const unitIndex = event.units["0"];
    if (!unitIndex) {
        return true;
    }

    if (event.order_type === UnitOrder.DROP_ITEM) {
        // Tell the player that dropping items is not a good idea
        return false;
    }

    const itemIndex = event.entindex_ability;
    if (!itemIndex) {
        return true;
    }
    const item = EntIndexToHScript(itemIndex) as CDOTA_Item;

    if (event.order_type === UnitOrder.GIVE_ITEM) {
        if (item.GetAbilityName() === giveAwayItemName) {
            return true;
        } else if (item.GetAbilityName() === keepItemName) {
            // Warn the player that they are giving away the wrong item, you want to keep that!
            return false;
        } else if (item.GetAbilityName() === dropInStashItemName) {
            // Warn the player that they are giving away the wrong item, warlock doesnt want that item right now
            return false;
        }
    }

    if (event.order_type === UnitOrder.DROP_ITEM_AT_FOUNTAIN) {
        if (item.GetAbilityName() === dropInStashItemName) {
            movedToStash = true;
            return true;
        } else if (item.GetAbilityName() === keepItemName) {
            // Warn the player that they are dropping the wrong item, you want to keep that!
            return false;
        } else if (item.GetAbilityName() === dropInStashItemName) {
            // Warn the player that they are dropping  the wrong item, warlock wants it.
            return false;
        }
    }

    return true;
}
