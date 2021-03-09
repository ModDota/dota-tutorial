import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { displayDotaErrorMessage, findRealPlayerID, getPathToItemInGuideByID, getPlayerHero, highlightUiElement, removeHighlight } from "../../util";
import { isShopOpen } from "../../Shop";
import { GoalTracker } from "../../Goals";

const sectionName: SectionName = SectionName.Chapter1_ShopUI;
let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroGold: 0,
    heroLevel: 3,
    heroAbilityMinLevels: [1, 1, 1, 0],
    requireFountainTrees: true,
};

let waitingForPlayerToPurchaseTango = false;
let playerBoughtTango = false;

// UI Highlighting Paths
const shopBtnUIPath = "HUDElements/lower_hud/shop_launcher_block/ShopCourierControls/ShopButton"
const tangoInGuideUIPath = "HUDElements/shop/GuideFlyout/ItemsArea/ItemBuildContainer/ItemBuild/Categories/ItemList/Item44"
const inventorySlot0UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/"

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const shopBtnUIPath = "HUDElements/lower_hud/shop_launcher_block/ShopCourierControls/ShopButton"
    const tangoItemID = 44;
    const tangoInGuideUIPath = getPathToItemInGuideByID(tangoItemID)

    const goalTracker = new GoalTracker();
    const goalOpenShop = goalTracker.addBoolean("Open the shop.");
    const goalBuyTango = goalTracker.addBoolean("Use the gold provided to purchase a Tango.");
    const goalEatTree = goalTracker.addBoolean("Use tango to eat a tree and escape.");
    const goalMoveOut = goalTracker.addBoolean("Move to the target location.");

    waitingForPlayerToPurchaseTango = false;
    playerBoughtTango = false;

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.wait(FrameTime()),
            tg.immediate(_ => {
                goalOpenShop.start();
                playerHero.SetGold(90, true);
                highlightUiElement(shopBtnUIPath)
                waitingForPlayerToPurchaseTango = true;
            }),
            tg.completeOnCheck(_ => isShopOpen(), 0.1),
            tg.immediate(_ => {
                goalOpenShop.complete();
                goalBuyTango.start();
                highlightUiElement(tangoInGuideUIPath, undefined, true);
            }),
            tg.completeOnCheck(_ => {
                return playerBoughtTango;
            }, 0.2),
            tg.immediate(_ => {
                removeHighlight(shopBtnUIPath);
                removeHighlight(tangoInGuideUIPath);
                goalBuyTango.complete();
                goalEatTree.start();
                highlightUiElement(inventorySlot0UIPath, undefined, true);
            }),
            tg.completeOnCheck(_ => {
                return playerHero.HasModifier("modifier_tango_heal");
            }, 0.2),
            tg.immediate(_ => {
                goalEatTree.complete();
                removeHighlight(inventorySlot0UIPath);
                goalMoveOut.start();
            }),
            tg.goToLocation(GetGroundPosition(Vector(-6700, -4800), undefined)),
            tg.immediate(_ => {
                goalMoveOut.complete();
            }),
            tg.wait(1),
        ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

function onStop() {
    print("Stopping", sectionName);
    removeHighlight(shopBtnUIPath);
    removeHighlight(tangoInGuideUIPath);
    removeHighlight(inventorySlot0UIPath);
    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const sectionShopUI = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    orderFilter
);

function orderFilter(event: ExecuteOrderFilterEvent): boolean {
    if (event.issuer_player_id_const !== findRealPlayerID()) return true

    if (event.order_type == UnitOrder.PURCHASE_ITEM) {
        if (waitingForPlayerToPurchaseTango) {
            // Only allows buying tango in this phase
            const boughtTango = event.shop_item_name === "item_tango"
            if (boughtTango) {
                playerBoughtTango = true;
                waitingForPlayerToPurchaseTango = false;
            } else {
                displayDotaErrorMessage("Use your gold to buy a Tango.");
                return false;
            }
        }
    }

    return true;
}
