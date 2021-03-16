import { GoalTracker } from "../../Goals";
import { isShopOpen } from "../../Shop";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { displayDotaErrorMessage, findRealPlayerID, freezePlayerHero, getOrError, getPathToItemInGuideByID, getPlayerCameraLocation, getPlayerHero, highlightUiElement, removeHighlight } from "../../util";
import { chapter2Blockades } from "./shared";
import { modifier_courier_chapter_2_ms_bonus } from "../../modifiers/modifier_courier_chapter_2_ms_bonus";

const sectionName: SectionName = SectionName.Chapter2_Creeps
let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    heroLocation: Vector(-4941, 5874, 128),
    heroLocationTolerance: 1800, // prevent teleportations if you're still in the vicinity
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5495, 2930, 128),
    sunsFanLocation: Vector(-5515, 2700, 128),
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroLevel: 6,
    blockades: [
        chapter2Blockades.radiantJungleStairs,
        chapter2Blockades.radiantBaseT2Divider,
        chapter2Blockades.radiantBaseMid,
        chapter2Blockades.radiantBaseBottom,
        chapter2Blockades.direTopDividerCliff,
        chapter2Blockades.direTopJungleBlocker,
        chapter2Blockades.aboveRoshanBlocker,
        chapter2Blockades.belowRoshanBlocker
    ],
    topDireT1TowerStanding: false,
    centerCameraOnHero: true,
}

let playerOrderMustBuyDemonEdge = false
let playerOrderMustBuyRecipeAndCrystalis = false
let playerOrderMustDeliverItemsFromCourier = false
let hasPlayerRequestedToDeliverFromCourier = false
let requiredItemCount = 0;

const demonEdgeName = "item_demon_edge"
const recipeName = "item_recipe_greater_crit"
const crystalisName = "item_lesser_crit"
const daedalusName = "item_greater_crit"
const broadSword = "item_broadsword"
const bladeOfAttack = "item_blades_of_attack"
const crystalisRecipe = "item_recipe_lesser_crit"

const allowedItems: Set<String> = new Set()

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const radiantSecretShopLocation = Vector(-5082, 2011, 128)
    const direSecretShopLocation = Vector(4804, -1304, 128)
    const inFrontOfTheRiverLocation = Vector(-3661, 3761, 128)
    const insideRiverLocation = Vector(-3930, 2480, 0)
    const inFrontOfRadiantSecretShopLocation = Vector(-4840, 1822, 128)
    const upSecretShopRamp = Vector(-4380, 2020, 128)
    const upDireRamp = Vector(-3675, 3400, 128)
    const finalMovementPositionLocation = Vector(-3538, 3861, 128)

    allowedItems.add(recipeName)
    allowedItems.add(crystalisName)
    allowedItems.add(broadSword)
    allowedItems.add(bladeOfAttack)
    allowedItems.add(crystalisRecipe)

    const shopBtnUIPath = "HUDElements/lower_hud/shop_launcher_block/ShopCourierControls/ShopButton"
    const demonEdgeGuideUIPath = getPathToItemInGuideByID(51)
    const crystalisGuideUIPath = getPathToItemInGuideByID(149)
    const daedalusGuideUIPath = getPathToItemInGuideByID(140)
    const deliverItemsUIPath = "HUDElements/lower_hud/shop_launcher_block/quickbuy/ShopCourierControls/CourierControls/DeliverItemsButton"
    requiredItemCount = 0;

    playerOrderMustBuyDemonEdge = false
    playerOrderMustBuyRecipeAndCrystalis = false
    playerOrderMustDeliverItemsFromCourier = false
    hasPlayerRequestedToDeliverFromCourier = false

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const playerCourier = getOrError(getPlayerCourier())

    const goalTracker = new GoalTracker()
    const goalMoveToSecretShop = goalTracker.addBoolean(LocalizationKey.Goal_2_Courier_1)
    const goalOpenShop = goalTracker.addBoolean(LocalizationKey.Goal_2_Courier_2)
    const goalBuyDemonEdge = goalTracker.addBoolean(LocalizationKey.Goal_2_Courier_3)
    const goalBuyCrystalisAndRecipe = goalTracker.addBoolean(LocalizationKey.Goal_2_Courier_4)
    const goalRequestItemsToBeDeliveredFromCourier = goalTracker.addBoolean(LocalizationKey.Goal_2_Courier_5)
    const goalWaitToCourierToDeliverItems = goalTracker.addBoolean(LocalizationKey.Goal_2_Courier_6)
    const goalMoveToFinalPosition = goalTracker.addBoolean(LocalizationKey.Goal_2_Courier_7)

    graph = tg.withGoals(context => goalTracker.getGoals(), tg.seq([
        tg.immediate(() => freezePlayerHero(true)),
        tg.audioDialog(LocalizationKey.Script_2_Courier_1, LocalizationKey.Script_2_Courier_1, context => context[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_2_Courier_2, LocalizationKey.Script_2_Courier_2, context => context[CustomNpcKeys.SunsFanMudGolem]),
        tg.immediate(context => {
            MinimapEvent(DotaTeam.GOODGUYS, context[CustomNpcKeys.SlacksMudGolem], radiantSecretShopLocation.x, radiantSecretShopLocation.y, MinimapEventType.TEAMMATE_TELEPORTING, 10)
            MinimapEvent(DotaTeam.GOODGUYS, context[CustomNpcKeys.SunsFanMudGolem], direSecretShopLocation.x, direSecretShopLocation.y, MinimapEventType.TEAMMATE_TELEPORTING, 10)
        }),
        tg.audioDialog(LocalizationKey.Script_2_Courier_3, LocalizationKey.Script_2_Courier_3, context => context[CustomNpcKeys.SlacksMudGolem]),
        tg.immediate(context => {
            MinimapEvent(DotaTeam.GOODGUYS, context[CustomNpcKeys.SlacksMudGolem], radiantSecretShopLocation.x, radiantSecretShopLocation.y, MinimapEventType.CANCEL_TELEPORTING, 10)
            MinimapEvent(DotaTeam.GOODGUYS, context[CustomNpcKeys.SunsFanMudGolem], direSecretShopLocation.x, direSecretShopLocation.y, MinimapEventType.CANCEL_TELEPORTING, 10)
        }),
        tg.immediate(() => {
            goalMoveToSecretShop.start()
            freezePlayerHero(false)
        }),
        tg.goToLocation(inFrontOfRadiantSecretShopLocation, _ => [inFrontOfTheRiverLocation, insideRiverLocation, upSecretShopRamp]),
        tg.immediate(() => {
            goalMoveToSecretShop.complete()
        }),
        tg.audioDialog(LocalizationKey.Script_2_Courier_4, LocalizationKey.Script_2_Courier_4, context => context[CustomNpcKeys.SunsFanMudGolem]),
        tg.immediate(() => {
            highlightUiElement(shopBtnUIPath)
            goalOpenShop.start()
        }),
        tg.completeOnCheck(() => {
            return isShopOpen()
        }, 0.2),
        tg.immediate(() => {
            removeHighlight(shopBtnUIPath)
            goalOpenShop.complete()
            goalBuyDemonEdge.start()
            playerHero.SetGold(5150, false)
            playerOrderMustBuyDemonEdge = true
            Timers.CreateTimer(() => {
                highlightUiElement(demonEdgeGuideUIPath);
            })
        }),
        tg.completeOnCheck(() => {
            return playerHero.HasItemInInventory(demonEdgeName)
        }, 0.2),
        tg.immediate(() => {
            playerOrderMustBuyDemonEdge = false
            freezePlayerHero(true)
            removeHighlight(demonEdgeGuideUIPath)
            goalBuyDemonEdge.complete()
        }),
        tg.audioDialog(LocalizationKey.Script_2_Courier_5, LocalizationKey.Script_2_Courier_5, context => context[CustomNpcKeys.SlacksMudGolem]),
        tg.immediate(() => {
            freezePlayerHero(false)
            playerOrderMustBuyRecipeAndCrystalis = true
            highlightUiElement(crystalisGuideUIPath);
            highlightUiElement(daedalusGuideUIPath);
            goalBuyCrystalisAndRecipe.start()
        }),
        tg.completeOnCheck(() => {
            return requiredItemCount === 4
        }, 0.2),
        tg.immediate(() => {
            goalBuyCrystalisAndRecipe.complete()
            removeHighlight(crystalisGuideUIPath)
            removeHighlight(daedalusGuideUIPath)
            playerOrderMustBuyRecipeAndCrystalis = false
            freezePlayerHero(true)
        }),
        tg.audioDialog(LocalizationKey.Script_2_Courier_6, LocalizationKey.Script_2_Courier_6, context => context[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_2_Courier_7, LocalizationKey.Script_2_Courier_7, context => context[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_2_Courier_8, LocalizationKey.Script_2_Courier_8, context => context[CustomNpcKeys.SlacksMudGolem]),
        tg.immediate(() => {
            highlightUiElement(deliverItemsUIPath)
        }),
        tg.audioDialog(LocalizationKey.Script_2_Courier_9, LocalizationKey.Script_2_Courier_9, context => context[CustomNpcKeys.SlacksMudGolem]),
        tg.immediate(() => {
            freezePlayerHero(false)
            playerOrderMustDeliverItemsFromCourier = true
            goalRequestItemsToBeDeliveredFromCourier.start()
        }),
        tg.completeOnCheck(() => {
            return hasPlayerRequestedToDeliverFromCourier
        }, 0.2),
        tg.immediate(() => {
            goalRequestItemsToBeDeliveredFromCourier.complete()
            goalWaitToCourierToDeliverItems.start()
            playerCourier.AddNewModifier(undefined, undefined, modifier_courier_chapter_2_ms_bonus.name, {})
            playerOrderMustDeliverItemsFromCourier = false
            removeHighlight(deliverItemsUIPath)
            freezePlayerHero(true)
        }),
        tg.panCameraLinear(_ => getPlayerCameraLocation(), _ => playerCourier.GetAbsOrigin(), 0.5),
        tg.setCameraTarget(playerCourier),
        tg.completeOnCheck(() => {
            return playerHero.HasItemInInventory(daedalusName)
        }, 0.2),
        tg.immediate(() => {
            goalWaitToCourierToDeliverItems.complete()
            playerCourier.RemoveModifierByName(modifier_courier_chapter_2_ms_bonus.name)
        }),
        tg.setCameraTarget(undefined),
        tg.audioDialog(LocalizationKey.Script_2_Courier_10, LocalizationKey.Script_2_Courier_10, context => context[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_2_Courier_11, LocalizationKey.Script_2_Courier_11, context => context[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_2_Courier_12, LocalizationKey.Script_2_Courier_12, context => context[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_2_Courier_13, LocalizationKey.Script_2_Courier_13, context => context[CustomNpcKeys.SlacksMudGolem]),
        tg.immediate(() => {
            freezePlayerHero(false)
            goalMoveToFinalPosition.start()
        }),
        tg.goToLocation(finalMovementPositionLocation, _ => [upSecretShopRamp, insideRiverLocation, upDireRamp]),
        tg.immediate(() => goalMoveToFinalPosition.complete())
    ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

const onStop = () => {
    print("Stopping", sectionName);

    const courier = getOrError(getPlayerCourier())
    if (courier) {
        // Clear items from the courier
        for (let index = 0; index < DOTA_ITEM_MAX; index++) {
            const item = courier.GetItemInSlot(index)
            if (item) {
                courier.RemoveItem(item)
            }
        }

        if (courier.HasModifier(modifier_courier_chapter_2_ms_bonus.name)) {
            courier.RemoveModifierByName(modifier_courier_chapter_2_ms_bonus.name)
        }
    }

    // Clear stash if skipped
    const playerHero = getOrError(getPlayerHero())
    for (let index = DOTA_ITEM_STASH_MIN; index < DOTA_ITEM_STASH_MAX; index++) {
        const item = playerHero.GetItemInSlot(index)
        if (item) {
            playerHero.RemoveItem(item)
        }
    }

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const sectionCourier = new tut.FunctionalSection(
    SectionName.Chapter2_Courier,
    requiredState,
    onStart,
    onStop,
    chapter2CourierOrderFilter
);

export function chapter2CourierOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;


    const units: CDOTA_BaseNPC[] = []

    if (playerOrderMustBuyDemonEdge) {
        if (event.order_type !== UnitOrder.PURCHASE_ITEM || event.shop_item_name !== demonEdgeName) {
            displayDotaErrorMessage("Buy a Demon Edge to continue.")
            return false;
        }

        return true
    }

    if (playerOrderMustBuyRecipeAndCrystalis) {
        if (event.order_type !== UnitOrder.PURCHASE_ITEM) {
            displayDotaErrorMessage("Buy the Daedalus recipe and Crystalis to continue")
            return false
        }

        if (!allowedItems.has(event.shop_item_name)) {
            displayDotaErrorMessage("Buy the Daedalus recipe and Crystalis to continue")
            return false
        }

        allowedItems.delete(event.shop_item_name)
        requiredItemCount++;
        return true
    }

    if (playerOrderMustDeliverItemsFromCourier) {
        for (const [string, entityIndex] of Object.entries(event.units)) {
            const unit = EntIndexToHScript(entityIndex) as CDOTA_BaseNPC;
            if (unit) {
                units.push(unit);
            }
        }

        if (units.length == 1 && event.entindex_ability > 0) {
            const unit = units[0]
            if (unit.GetName() === "npc_dota_courier" && UnitOrder.CAST_NO_TARGET) {

                const ability = EntIndexToHScript(event.entindex_ability) as CDOTABaseAbility
                if (ability && IsValidEntity(ability) && ability.GetAbilityName() === "courier_take_stash_and_transfer_items") {
                    // Player ordered courier to deliver
                    hasPlayerRequestedToDeliverFromCourier = true
                    return true
                }
            }
        }

        displayDotaErrorMessage("Request the courier to deliver items.")
        return false
    }

    return true;
}

function getPlayerCourier(): CDOTA_Unit_Courier | undefined {
    const playerHero = getOrError(getPlayerHero())
    const playerOwner = playerHero.GetPlayerOwnerID()

    const couriers = Entities.FindAllByClassname("npc_dota_courier") as CDOTA_Unit_Courier[]
    for (const courier of couriers) {
        if (courier.IsCourier() && courier.GetPlayerOwnerID() === playerOwner) {
            return courier
        }
    }

    return undefined;
}
