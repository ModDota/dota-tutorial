import { GoalTracker } from "../../Goals";
import { isShopOpen } from "../../Shop";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { displayDotaErrorMessage, findRealPlayerID, getOrError, getPathToItemInGuideByID, getPlayerHero, highlightUiElement, printEventTable, removeHighlight } from "../../util";
import { chapter2Blockades, radiantCreepsNames } from "./shared";

const sectionName: SectionName = SectionName.Chapter2_Creeps
let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    heroLocation: Vector(-4941, 5874, 128),
    heroLocationTolerance: 300,
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
    topDireT1TowerStanding: false
}

let canPlayerIssueOrders = true;
let playerOrderMustBuyDemonEdge = false
let playerOrderMustBuyRecipeAndCrysalis = false
let playerOrderMustDeliverItemsFromCourier = false
let hasPlayerRequestedToDeliverFromCourier = false

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
    const direSecretShopLocation = Vector(4804, 1304, 128)
    const inFrontOfRadiantSecretShopLocation = Vector(-4840, 1822, 128)
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

    canPlayerIssueOrders = true;
    playerOrderMustBuyDemonEdge = false
    playerOrderMustBuyRecipeAndCrysalis = false
    playerOrderMustDeliverItemsFromCourier = false
    hasPlayerRequestedToDeliverFromCourier = false

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const playerCourier = getOrError(getPlayerCourier())

    const goalTracker = new GoalTracker()
    const goalMoveToSecretShop = goalTracker.addBoolean("Move to Radiant's secret shop.")
    const goalOpenShop = goalTracker.addBoolean("Open the shop")
    const goalBuyDemonEdge = goalTracker.addBoolean("Buy a Demon Edge with the gold provided.")
    const goalBuyCrystalisAndRecipe = goalTracker.addNumeric("Buy Crystalis and the Daedalus Recipe.", 2)
    const goalRequestItemsToBeDeliveredFromCourier = goalTracker.addBoolean("Request courier to deliver the items to you.")
    const goalWaitToCourierToDeliverItems = goalTracker.addBoolean("Wait for the courier to deliver the items to you.")
    const goalMoveToFinalPosition = goalTracker.addBoolean("Move into the Dire jungle.")

    graph = tg.withGoals(context => goalTracker.getGoals(),
        tg.seq([
            tg.setCameraTarget(undefined),
            tg.textDialog("Now that you’ve killed some creeps....", context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog("As we mentioned previously....", context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.immediate(context => {
                MinimapEvent(DotaTeam.GOODGUYS, context[CustomNpcKeys.SlacksMudGolem], radiantSecretShopLocation.x, radiantSecretShopLocation.y, MinimapEventType.TEAMMATE_TELEPORTING, 10)
                MinimapEvent(DotaTeam.GOODGUYS, context[CustomNpcKeys.SunsFanMudGolem], direSecretShopLocation.x, direSecretShopLocation.y, MinimapEventType.TEAMMATE_TELEPORTING, 10)
            }),
            tg.textDialog("Your minimap will show the 2 locations of this shop...", context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.immediate(context => {
                MinimapEvent(DotaTeam.GOODGUYS, context[CustomNpcKeys.SlacksMudGolem], radiantSecretShopLocation.x, radiantSecretShopLocation.y, MinimapEventType.CANCEL_TELEPORTING, 10)
                MinimapEvent(DotaTeam.GOODGUYS, context[CustomNpcKeys.SunsFanMudGolem], direSecretShopLocation.x, direSecretShopLocation.y, MinimapEventType.CANCEL_TELEPORTING, 10)
            }),
            tg.immediate(() => {
                goalMoveToSecretShop.start()
            }),
            tg.goToLocation(inFrontOfRadiantSecretShopLocation),
            tg.immediate(() => {
                goalMoveToSecretShop.complete()
            }),
            tg.textDialog("There is a powerful damage item called...", context => context[CustomNpcKeys.SunsFanMudGolem], 3),
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
                playerHero.SetGold(2200, false)
                playerOrderMustBuyDemonEdge = true

                // For some reason the highlighting doesn't work, I have no idea why :/
                // highlightUiElement(getPathToItemInGuideByID(44), undefined, true);
                // highlightUiElement(demonEdgeGuideUIPath, undefined, true);
                // highlightUiElement(crystalisGuideUIPath, undefined, true);
                // highlightUiElement(daedalusGuideUIPath, undefined, true);
            }),
            tg.completeOnCheck(() => {
                return playerHero.HasItemInInventory(demonEdgeName)
            }, 0.2),
            tg.immediate(() => {
                playerOrderMustBuyDemonEdge = false
                goalBuyDemonEdge.complete()
            }),
            tg.textDialog("In order to complete the daedalus...", context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.immediate(() => {
                playerHero.SetGold(2950, false)
                playerOrderMustBuyRecipeAndCrysalis = true
                goalBuyCrystalisAndRecipe.start()
                goalBuyCrystalisAndRecipe.setValue(0)
            }),
            tg.completeOnCheck(() => {
                let requiredItemCount = 0;
                for (let index = DOTA_ITEM_STASH_MIN; index < DOTA_ITEM_STASH_MAX; index++) {
                    const item = playerHero.GetItemInSlot(index)
                    if (item) {
                        if (item.GetAbilityName() === recipeName) requiredItemCount++
                        if (item.GetAbilityName() === crystalisName) requiredItemCount++
                    }
                }
                goalBuyCrystalisAndRecipe.setValue(requiredItemCount)

                return requiredItemCount === 2
            }, 0.2),
            tg.immediate(() => {
                goalBuyCrystalisAndRecipe.complete()
                playerOrderMustBuyRecipeAndCrysalis = false
                canPlayerIssueOrders = false
            }),
            tg.textDialog("Keep in mind that for the regular shop...", context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog("Ok, now I don’t know about you...", context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog("Everyone starts with a cute little courier...", context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.immediate(() => {
                highlightUiElement("HUDElements/lower_hud/shop_launcher_block/quickbuy/ShopCourierControls/CourierControls/DeliverItemsButton")
            }),
            tg.textDialog("Now just hit the deliver button on the courier and it will come...", context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.immediate(() => {
                canPlayerIssueOrders = true
                playerOrderMustDeliverItemsFromCourier = true
                goalRequestItemsToBeDeliveredFromCourier.start()
            }),
            tg.completeOnCheck(() => {
                return hasPlayerRequestedToDeliverFromCourier
            }, 0.2),
            tg.immediate(() => {
                goalRequestItemsToBeDeliveredFromCourier.complete()
                goalWaitToCourierToDeliverItems.start()
                playerOrderMustDeliverItemsFromCourier = false
                canPlayerIssueOrders = false
            }),
            tg.panCameraLinear(playerHero.GetAbsOrigin(), playerCourier.GetAbsOrigin(), 0.5),
            tg.setCameraTarget(playerCourier),
            tg.completeOnCheck(() => {
                return playerHero.HasItemInInventory(daedalusName)
            }, 0.2),
            tg.immediate(() => goalWaitToCourierToDeliverItems.complete()),
            tg.setCameraTarget(undefined),
            tg.textDialog("Congratulations, you’ve successfully used...", context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog("these little critters can die, ....", context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog("ok, you have some items...", context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog("use your minimap to...", context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.immediate(() => {
                canPlayerIssueOrders = true
                goalMoveToFinalPosition.start()
            }),
            tg.goToLocation(finalMovementPositionLocation),
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

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const SectionCourier = new tut.FunctionalSection(
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

    if (playerOrderMustBuyRecipeAndCrysalis) {
        print(event.shop_item_name, event.order_type)
        if (event.order_type !== UnitOrder.PURCHASE_ITEM) {
            print("Not a purchase order")
            displayDotaErrorMessage("Buy the Daedalus recipe and Crystalis to continue")
            return false
        }

        if (!allowedItems.has(event.shop_item_name)) {
            print(`${event.shop_item_name} not included in the allowed items list`)
            displayDotaErrorMessage("Buy the Daedalus recipe and Crystalis to continue")
            return false
        }

        allowedItems.delete(event.shop_item_name)
        return true
    }

    if (playerOrderMustDeliverItemsFromCourier) {
        for (const [string, entityIndex] of Object.entries(event.units)) {
            const unit = EntIndexToHScript(entityIndex) as CDOTA_BaseNPC;
            if (unit) {
                units.push(unit);
            }
        }

        if (units.length == 1) {
            const unit = units[0]
            if (unit.GetName() === "npc_dota_courier" && UnitOrder.CAST_NO_TARGET) {
                if (event.entindex_ability > 0) {
                    const ability = EntIndexToHScript(event.entindex_ability) as CDOTABaseAbility
                    if (ability && IsValidEntity(ability)) {
                        if (ability.GetAbilityName() === "courier_take_stash_and_transfer_items") {
                            // Player ordered courier to deliver
                            hasPlayerRequestedToDeliverFromCourier = true
                            return true
                        }
                    }
                }
            }
        }

        displayDotaErrorMessage("Request the courier to deliver items.")
        return false
    }

    if (!canPlayerIssueOrders) return false;

    return true;
}

function getPlayerCourier(): CDOTA_Unit_Courier | undefined {
    const playerHero = getOrError(getPlayerHero())
    const playerOwner = playerHero.GetPlayerOwnerID()

    const couriers = Entities.FindAllByClassname("npc_dota_courier") as CDOTA_Unit_Courier[]
    for (const courier of couriers) {
        if (courier.IsCourier()) {
            if (courier.GetPlayerOwnerID() === playerOwner) {
                return courier
            }
        }
    }

    return undefined;
}
