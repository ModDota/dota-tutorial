import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import * as shared from "./Shared"
import { RequiredState } from "../../Tutorial/RequiredState";
import { getOrError, getPlayerHero, unitIsValidAndAlive, highlightUiElement, removeHighlight, freezePlayerHero, displayDotaErrorMessage, setUnitPacifist, getPlayerCameraLocation, findRealPlayerID, printEventTable } from "../../util";
import { GoalTracker } from "../../Goals";

const sectionName: SectionName = SectionName.Chapter4_Outpost;

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: Vector(-2000, 3800, 256),
    requireRiki: true,
    rikiLocation: Vector(-1000, 4400, 256),
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroItems: { "item_greater_crit": 1 },
    blockades: Object.values(shared.blockades),
    clearWards: false,
    topDireT1TowerStanding: false,
    topDireT2TowerStanding: false,
};

let canPlayerTakeOutpost = false
let allowUseItem = false;
const dustName = "item_dust";
const dustLocation = Vector(-1700, 3800, 256);
const outpostLocation = Vector(-2000, 4300);
const lastSawRikiLocation = Vector(-1300, 4200);
const rikiName = CustomNpcKeys.Riki;
// UI Highlighting Paths
const inventorySlot1UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_list_container/inventory_list/inventory_slot_1";

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const goalTracker = new GoalTracker();
    const goalPickupDust = goalTracker.addBoolean(LocalizationKey.Goal_4_Outpost_1);
    const goalGoToLastLocationSawRiki = goalTracker.addBoolean(LocalizationKey.Goal_4_Outpost_2);
    const goalUseDust = goalTracker.addBoolean(LocalizationKey.Goal_4_Outpost_3);
    const goalTakeOutpost = goalTracker.addBoolean(LocalizationKey.Goal_4_Outpost_4);
    const goalKillRiki = goalTracker.addBoolean(LocalizationKey.Goal_4_Outpost_5);

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");

    const direOutpost = getOrError(Entities.FindByName(undefined, "npc_dota_watch_tower_top"));
    if (direOutpost && direOutpost.GetTeamNumber() === DotaTeam.GOODGUYS) direOutpost.SetTeam(DotaTeam.BADGUYS)
    allowUseItem = false;
    canPlayerTakeOutpost = false

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(_ => shared.blockades.direJungleLowToHighground.destroy()),
            tg.immediate(_ => setUnitPacifist(playerHero, true)),
            // Part 0: Pick up and use dust
            tg.audioDialog(LocalizationKey.Script_4_Outpost_1, LocalizationKey.Script_4_Outpost_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.withHighlights(tg.seq([
                tg.immediate(_ => {
                    goalPickupDust.start();
                    CreateItemOnPositionSync(dustLocation, CreateItem(dustName, undefined, undefined));
                }),
                tg.audioDialog(LocalizationKey.Script_4_Outpost_2, LocalizationKey.Script_4_Outpost_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.completeOnCheck(_ => playerHero.HasItemInInventory(dustName), 0.2)
            ]), { type: "arrow", locations: [dustLocation] }),

            tg.immediate(_ => {
                goalPickupDust.complete();
                goalGoToLastLocationSawRiki.start();
            }),

            tg.goToLocation(GetGroundPosition(lastSawRikiLocation, undefined)),
            tg.immediate(_ => playerHero.SetMoveCapability(UnitMoveCapability.NONE)),
            tg.immediate(_ => {
                goalGoToLastLocationSawRiki.complete();
                goalUseDust.start();
                allowUseItem = true;
                highlightUiElement(inventorySlot1UIPath);
            }),
            tg.audioDialog(LocalizationKey.Script_4_Outpost_3, LocalizationKey.Script_4_Outpost_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.completeOnCheck(_ => !playerHero.HasItemInInventory(dustName), 0.2),
            tg.immediate(_ => {
                goalUseDust.complete();
                removeHighlight(inventorySlot1UIPath);
                setUnitPacifist(playerHero, false);
            }),

            // Part 1: Find Riki with dust, watch Riki escape
            tg.immediate(context => {
                const riki = getOrError(context[CustomNpcKeys.Riki] as CDOTA_BaseNPC | undefined);
                const smokeScreen = riki.GetAbilityByIndex(0);
                if (smokeScreen) {
                    riki.CastAbilityOnPosition(playerHero.GetAbsOrigin().__add(Vector(100, 100)), smokeScreen, 0);
                }
            }),
            tg.audioDialog(LocalizationKey.Script_4_RTZ_foundme, LocalizationKey.Script_4_RTZ_foundme, ctx => ctx[rikiName]),
            tg.audioDialog(LocalizationKey.Script_4_Outpost_4, LocalizationKey.Script_4_Outpost_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            tg.immediate(context => {
                const riki = getOrError(context[CustomNpcKeys.Riki] as CDOTA_BaseNPC | undefined);
                const lotusOrb = riki.GetItemInSlot(0) as CDOTABaseAbility;
                if (lotusOrb) {
                    riki.CastAbilityOnTarget(riki, lotusOrb, 0);
                }
            }),
            tg.wait(0.5),
            tg.immediate(_ => playerHero.SetMoveCapability(UnitMoveCapability.GROUND)),
            tg.immediate(context => {
                const riki = getOrError(context[CustomNpcKeys.Riki] as CDOTA_BaseNPC | undefined);
                const tricksOfTheTrade = riki.GetAbilityByIndex(2);
                if (tricksOfTheTrade) {
                    riki.CastAbilityOnPosition(riki.GetAbsOrigin().__add(Vector(-200, 100)), tricksOfTheTrade, 0);
                }
            }),
            tg.audioDialog(LocalizationKey.Script_4_RTZ_getaway, LocalizationKey.Script_4_RTZ_getaway, ctx => ctx[rikiName], 2.5),
            tg.audioDialog(LocalizationKey.Script_4_Outpost_5, LocalizationKey.Script_4_Outpost_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.withHighlights(tg.seq([
                tg.panCameraLinear(_ => getPlayerCameraLocation(), outpostLocation, 2),
                tg.audioDialog(LocalizationKey.Script_4_Outpost_6, LocalizationKey.Script_4_Outpost_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.audioDialog(LocalizationKey.Script_4_Outpost_7, LocalizationKey.Script_4_Outpost_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

                // Part 2: Take outpost
                tg.immediate(_ => {
                    goalTakeOutpost.start();
                    canPlayerTakeOutpost = true
                }),

                tg.audioDialog(LocalizationKey.Script_4_Outpost_8, LocalizationKey.Script_4_Outpost_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

                tg.completeOnCheck(_ => {
                    return direOutpost.GetTeam() === DotaTeam.GOODGUYS;
                }, 1),
            ]), { type: "circle", units: [direOutpost as CDOTA_BaseNPC_Building], radius: 300 }),

            // Part 3: Take down Riki
            tg.immediate(_ => {
                goalTakeOutpost.complete();
                goalKillRiki.start();
            }),

            tg.immediate(context => {
                const riki = getOrError(context[CustomNpcKeys.Riki] as CDOTA_BaseNPC | undefined);
                riki.SetAttackCapability(UnitAttackCapability.MELEE_ATTACK);
                riki.MoveToTargetToAttack(playerHero);
            }),

            tg.audioDialog(LocalizationKey.Script_4_Outpost_9, LocalizationKey.Script_4_Outpost_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.completeOnCheck(context => {
                const riki = getOrError(context[CustomNpcKeys.Riki] as CDOTA_BaseNPC | undefined);
                return !IsValidEntity(riki) || !riki.IsAlive();
            }, 1),
            tg.audioDialog(LocalizationKey.Script_4_RTZ_pain, LocalizationKey.Script_4_RTZ_pain, ctx => ctx[rikiName]),
            tg.audioDialog(LocalizationKey.Script_4_RTZ_death, LocalizationKey.Script_4_RTZ_death, ctx => ctx[rikiName]),
            tg.immediate(_ => goalKillRiki.complete()),
            tg.audioDialog(LocalizationKey.Script_4_Outpost_10, LocalizationKey.Script_4_Outpost_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Outpost_11, LocalizationKey.Script_4_Outpost_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        complete();
    });
}

function onStop() {
    print("Stopping", sectionName);
    removeHighlight(inventorySlot1UIPath);
    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

function orderFilter(event: ExecuteOrderFilterEvent): boolean {
    if (event.issuer_player_id_const !== findRealPlayerID()) return true

    if (event.order_type === UnitOrder.ATTACK_TARGET && event.entindex_target) {
        const target = EntIndexToHScript(event.entindex_target)
        const topOutpost = getOrError(Entities.FindByName(undefined, "npc_dota_watch_tower_top"))
        if (target === topOutpost && !canPlayerTakeOutpost) {
            displayDotaErrorMessage(LocalizationKey.Error_Outpost_1)
            return false
        }
    }

    if (event.order_type === UnitOrder.DROP_ITEM || event.order_type === UnitOrder.MOVE_ITEM) {
        displayDotaErrorMessage(LocalizationKey.Error_Outpost_2)
        return false;
    }
    if (event.order_type === UnitOrder.CAST_NO_TARGET && !allowUseItem) {
        displayDotaErrorMessage(LocalizationKey.Error_Outpost_3)
        return false;
    }
    return true;
}

export const sectionOutpost = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    orderFilter,
);
