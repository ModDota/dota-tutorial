import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { displayDotaErrorMessage, findRealPlayerID, getPathToItemInGuideByID, freezePlayerHero, getPlayerHero, highlightUiElement, removeHighlight } from "../../util";
import { isShopOpen } from "../../Shop";
import { GoalTracker } from "../../Goals";
import { Blockade } from "../../Blockade";

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

const blockadeRadiantBaseMid = new Blockade(Vector(-4793, -3550, 256), Vector(-4061, -4212, 256))
const blockadeRadiantBaseBottom = new Blockade(Vector(-3612, -5557, 256), Vector(-3584, -6567, 256))
const getMidPoint = (a: Vector, b: Vector) => a.__mul(0.5).__add(b.__mul(0.5))
const middleMidPoint = getMidPoint(blockadeRadiantBaseMid.startLocation, blockadeRadiantBaseMid.endLocation)
const bottomMidPoint = getMidPoint(blockadeRadiantBaseBottom.startLocation, blockadeRadiantBaseBottom.endLocation)

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

            // Wait for the player to open their shop.
            tg.immediate(_ => {
                goalOpenShop.start();
                highlightUiElement(shopBtnUIPath);
            }),
            tg.completeOnCheck(_ => isShopOpen(), 0.1),
            tg.immediate(_ => {
                removeHighlight(shopBtnUIPath);
                goalOpenShop.complete();
            }),

            // Shop stuff dialog, tells player to buy a tango.
            tg.audioDialog(LocalizationKey.Script_1_Shop_1, LocalizationKey.Script_1_Shop_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_1_Shop_2, LocalizationKey.Script_1_Shop_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_1_Shop_3, LocalizationKey.Script_1_Shop_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_1_Shop_4, LocalizationKey.Script_1_Shop_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_1_Shop_5, LocalizationKey.Script_1_Shop_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_1_Shop_6, LocalizationKey.Script_1_Shop_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_1_Shop_7, LocalizationKey.Script_1_Shop_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            // Give the player some gold and wait for them to buy a tango.
            tg.immediate(_ => {
                goalBuyTango.start();
                highlightUiElement(tangoInGuideUIPath, undefined, true);
                playerHero.SetGold(90, true);
                waitingForPlayerToPurchaseTango = true;
            }),
            tg.completeOnCheck(_ => playerBoughtTango, 0.2),
            tg.immediate(_ => {
                removeHighlight(tangoInGuideUIPath);
                goalBuyTango.complete();
                highlightUiElement(inventorySlot0UIPath, undefined, true);
            }),

            // Ask the player to use their tango to escape.
            tg.immediate(_ => freezePlayerHero(true)),
            tg.audioDialog(LocalizationKey.Script_1_Closing_1, LocalizationKey.Script_1_Closing_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_1_Closing_2, LocalizationKey.Script_1_Closing_2, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(_ => goalEatTree.start()),
            tg.immediate(_ => freezePlayerHero(false)),

            // Wait for the player to use their tango to escape.
            tg.completeOnCheck(_ => playerHero.HasModifier("modifier_tango_heal"), 0.2),
            tg.immediate(_ => {
                goalEatTree.complete();
                removeHighlight(inventorySlot0UIPath);
            }),

            tg.immediate(_ => freezePlayerHero(true)),
            tg.audioDialog(LocalizationKey.Script_1_Closing_3, LocalizationKey.Script_1_Closing_3, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            // Unlock player camera
            tg.audioDialog(LocalizationKey.Script_1_Closing_4, LocalizationKey.Script_1_Closing_4, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.setCameraTarget(undefined),
            tg.immediate(_ => freezePlayerHero(false)),
            tg.immediate(_ => goalMoveOut.start()),

            // Wait for player to move outside the fountain into the base
            tg.goToLocation(GetGroundPosition(Vector(-4350, -5450), undefined), [GetGroundPosition(Vector(-5250, -6100), undefined)]),

            // Spawn blockades to guide player upwards while dialog is playing.
            tg.immediate(_ => freezePlayerHero(true)),
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_1_Closing_5, LocalizationKey.Script_1_Closing_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.seq([
                    tg.wait(2.5),
                    tg.panCameraExponential(_ => playerHero.GetAbsOrigin(), bottomMidPoint, 4),
                    tg.immediate(_ => blockadeRadiantBaseBottom.spawn()),
                    tg.wait(1.5),
                    tg.panCameraExponential(bottomMidPoint, middleMidPoint, 4),
                    tg.immediate(_ => blockadeRadiantBaseMid.spawn()),
                    tg.wait(1.5),
                    tg.panCameraExponential(middleMidPoint, _ => playerHero.GetAbsOrigin(), 4),
                    tg.setCameraTarget(undefined),
                ])
            ]),

            // Tell player to escape and wait for them to move to the top.
            tg.fork([
                tg.seq([
                    tg.audioDialog(LocalizationKey.Script_1_Closing_6, LocalizationKey.Script_1_Closing_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                    tg.immediate(_ => freezePlayerHero(false)),
                ]),
                tg.goToLocation(GetGroundPosition(Vector(-5750, -3900), undefined), [GetGroundPosition(Vector(-4600, -5000), undefined)]),
            ]),
            tg.immediate(_ => {
                goalMoveOut.complete();
                blockadeRadiantBaseMid.destroy();
                blockadeRadiantBaseBottom.destroy();
            }),
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
    blockadeRadiantBaseMid.destroy();
    blockadeRadiantBaseBottom.destroy();
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
