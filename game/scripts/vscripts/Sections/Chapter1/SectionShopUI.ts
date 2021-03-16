import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { displayDotaErrorMessage, findRealPlayerID, getPathToItemInGuideByID, freezePlayerHero, getPlayerHero, highlightUiElement, removeHighlight, getPlayerCameraLocation } from "../../util";
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
    lockCameraOnHero: true,
};

let waitingForPlayerToPurchaseTango = false;
let playerBoughtTango = false;

// UI Highlighting Paths
const shopBtnUIPath = "HUDElements/lower_hud/shop_launcher_block/ShopCourierControls/ShopButton"
const tangoInGuideUIPath = "HUDElements/shop/GuideFlyout/ItemsArea/ItemBuildContainer/ItemBuild/Categories/ItemList/Item44"
const inventorySlot0UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_list_container/inventory_list/inventory_slot_0"

// Blockades
const blockadeRadiantBaseMid = new Blockade(Vector(-4793, -3550, 256), Vector(-4061, -4212, 256))
const blockadeRadiantBaseBottom = new Blockade(Vector(-3612, -5557, 256), Vector(-3584, -6567, 256))
const blockadeRadiantBaseTop = new Blockade(Vector(-6124, -3100, 256), Vector(-7067, -3099, 256))

const getMidPoint = (a: Vector, b: Vector) => a.__mul(0.5).__add(b.__mul(0.5))
const middleMidPoint = getMidPoint(blockadeRadiantBaseMid.startLocation, blockadeRadiantBaseMid.endLocation)
const bottomMidPoint = getMidPoint(blockadeRadiantBaseBottom.startLocation, blockadeRadiantBaseBottom.endLocation)
const topMidPoint = getMidPoint(blockadeRadiantBaseTop.startLocation, blockadeRadiantBaseTop.endLocation)

// Locations
const radiantBaseBotExitSide1 = Vector(-3781, -6488, 256)
const radiantBaseBotExitSide2 = Vector(-3799, -5634, 256)
const radiantBaseMidExitSide1 = Vector(-4110, -4338, 256)
const radiantBaseMidExitSide2 = Vector(-4861, -3671, 256)
const radiantBaseTopExitSide1 = Vector(-6085, -3257, 256)
const radiantBaseTopExitSide2 = Vector(-7079, -3242, 256)
const midPositionBeforeTrapLocation = Vector(-4904, -4385, 256)
const rightOfFountain = Vector(-5400, -6400, 256)
const overFountain = Vector(-6700, -5500, 256)
const inFrontOfBarracksLocation = Vector(-6200, -4350, 256)

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const shopBtnUIPath = "HUDElements/lower_hud/shop_launcher_block/ShopCourierControls/ShopButton"
    const tangoItemID = 44;
    const tangoInGuideUIPath = getPathToItemInGuideByID(tangoItemID)

    const goalTracker = new GoalTracker();
    const goalOpenShop = goalTracker.addBoolean(LocalizationKey.Goal_1_Shop_1);
    const goalBuyTango = goalTracker.addBoolean(LocalizationKey.Goal_1_Shop_2);
    const goalEatTree = goalTracker.addBoolean(LocalizationKey.Goal_1_Shop_3);
    const goalMoveOut = goalTracker.addBoolean(LocalizationKey.Goal_1_Shop_4);

    waitingForPlayerToPurchaseTango = false;
    playerBoughtTango = false;

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.wait(FrameTime() * 2),

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

            // Talking about how confusing the shop is and what items are good for
            tg.audioDialog(LocalizationKey.Script_1_Shop_1, LocalizationKey.Script_1_Shop_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_1_Shop_2, LocalizationKey.Script_1_Shop_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_1_Shop_3, LocalizationKey.Script_1_Shop_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            // Show guides video
            tg.audioDialog(LocalizationKey.Script_1_Shop_4, LocalizationKey.Script_1_Shop_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.showVideo("guides"),
            tg.audioDialog(LocalizationKey.Script_1_Shop_5, LocalizationKey.Script_1_Shop_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_1_Shop_6, LocalizationKey.Script_1_Shop_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            // Tell player to buy a tango.
            tg.audioDialog(LocalizationKey.Script_1_Shop_7, LocalizationKey.Script_1_Shop_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            // Give the player some gold and wait for them to buy a tango.
            tg.immediate(_ => {
                goalBuyTango.start();
                highlightUiElement(tangoInGuideUIPath);
                playerHero.SetGold(90, true);
                waitingForPlayerToPurchaseTango = true;
            }),
            tg.completeOnCheck(_ => playerBoughtTango, 0.2),
            tg.immediate(_ => {
                removeHighlight(tangoInGuideUIPath);
                goalBuyTango.complete();
                highlightUiElement(inventorySlot0UIPath);
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
            tg.forkAny([
                tg.goToLocation(midPositionBeforeTrapLocation, [GetGroundPosition(Vector(-5553, -5640), undefined)]),
                tg.completeOnCheck(_ => checkPlayerHeroTryingToEscape(radiantBaseBotExitSide1, radiantBaseBotExitSide2), 0.1),
                tg.completeOnCheck(_ => checkPlayerHeroTryingToEscape(radiantBaseMidExitSide1, radiantBaseMidExitSide2), 0.1),
                tg.completeOnCheck(_ => checkPlayerHeroTryingToEscape(radiantBaseTopExitSide1, radiantBaseTopExitSide2), 0.1)
            ]),

            // Spawn blockades to guide player upwards while dialog is playing.
            tg.immediate(_ => freezePlayerHero(true)),
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_1_Closing_5, LocalizationKey.Script_1_Closing_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.seq([
                    tg.wait(1.5),
                    tg.panCameraExponential(_ => getPlayerCameraLocation(), bottomMidPoint, 2),
                    tg.immediate(_ => blockadeRadiantBaseBottom.spawn()),
                    tg.wait(0.4),
                    tg.panCameraExponential(bottomMidPoint, middleMidPoint, 2),
                    tg.immediate(_ => blockadeRadiantBaseMid.spawn()),
                    tg.wait(0.4),
                    tg.panCameraExponential(middleMidPoint, topMidPoint, 2),
                    tg.immediate(_ => blockadeRadiantBaseTop.spawn()),
                    tg.wait(0.4),
                    tg.panCameraExponential(topMidPoint, _ => playerHero.GetAbsOrigin(), 2),
                ])
            ]),

            // Tell player to escape and wait for them to move to the top.
            tg.immediate(_ => freezePlayerHero(false)),
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_1_Closing_6, LocalizationKey.Script_1_Closing_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.seq([
                    tg.goToLocation(rightOfFountain),
                    tg.goToLocation(overFountain),
                    tg.goToLocation(inFrontOfBarracksLocation),
                ]),
            ]),
            tg.immediate(_ => {
                goalMoveOut.complete();
                blockadeRadiantBaseMid.destroy();
                blockadeRadiantBaseBottom.destroy();
                blockadeRadiantBaseTop.destroy();
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
    blockadeRadiantBaseTop.destroy();
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


function checkPlayerHeroTryingToEscape(startPos: Vector, endPos: Vector): boolean {
    const heroesTryingToEscape = FindUnitsInLine(DotaTeam.GOODGUYS, startPos, endPos, undefined, 180, UnitTargetTeam.FRIENDLY, UnitTargetType.HERO, UnitTargetFlags.NONE)
    return heroesTryingToEscape.length > 0
}
