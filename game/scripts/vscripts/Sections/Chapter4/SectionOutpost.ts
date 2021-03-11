import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import * as shared from "./Shared"
import { RequiredState } from "../../Tutorial/RequiredState";
import { getOrError, getPlayerHero, unitIsValidAndAlive, highlightUiElement, removeHighlight, freezePlayerHero, displayDotaErrorMessage, setUnitPacifist } from "../../util";
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
    blockades: Object.values(shared.blockades),
};

let allowUseItem = false;
const dustName = "item_dust";
const dustLocation = Vector(-1700, 3800, 256);
const outpostLocation = Vector(-2000, 4300);
const lastSawRikiLocation = Vector(-1300, 4200);
// UI Highlighting Paths
const inventorySlot0UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_list_container/inventory_list/inventory_slot_0"

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const goalTracker = new GoalTracker();
    const goalPickupDust = goalTracker.addBoolean("Pick up the dust.");
    const goalGoToLastLocationSawRiki = goalTracker.addBoolean("Go to the last position you saw Riki.");
    const goalUseDust = goalTracker.addBoolean("Use the dust.");
    const goalTakeOutpost = goalTracker.addBoolean("Right click on the enemy outpost to take it.");
    const goalKillRiki = goalTracker.addBoolean("Take down Riki.");

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");
    // TODO: Give ranged in dragon form
    playerHero.SetAttackCapability(UnitAttackCapability.MELEE_ATTACK);

    const direOutpost = getOrError(Entities.FindByName(undefined, "npc_dota_watch_tower_top"));
    allowUseItem = false;

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

            tg.goToLocation(lastSawRikiLocation),
            tg.immediate(_ => freezePlayerHero(true)),
            tg.immediate(_ => {
                goalGoToLastLocationSawRiki.complete();
                goalUseDust.start();
                allowUseItem = true;
                highlightUiElement(inventorySlot0UIPath, undefined, true)
            }),
            tg.audioDialog(LocalizationKey.Script_4_Outpost_3, LocalizationKey.Script_4_Outpost_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.completeOnCheck(_ => !playerHero.HasItemInInventory(dustName), 0.2),
            tg.immediate(_ => {
                goalUseDust.complete();
                freezePlayerHero(false);
                removeHighlight(inventorySlot0UIPath);
                setUnitPacifist(playerHero, false);
            }),

            tg.audioDialog(LocalizationKey.Script_4_Outpost_4, LocalizationKey.Script_4_Outpost_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            // Part 1: Find Riki with dust, watch Riki escape
            tg.immediate(context => {
                const riki = getOrError(context[CustomNpcKeys.Riki] as CDOTA_BaseNPC | undefined);
                const smokeScreen = riki.GetAbilityByIndex(0);
                if (smokeScreen) {
                    riki.CastAbilityOnPosition(riki.GetAbsOrigin(), smokeScreen, 0);
                }
            }),
            tg.wait(1),

            tg.immediate(context => {
                const riki = getOrError(context[CustomNpcKeys.Riki] as CDOTA_BaseNPC | undefined);
                const lotusOrb = riki.GetItemInSlot(0) as CDOTABaseAbility;
                if (lotusOrb) {
                    riki.CastAbilityOnTarget(riki, lotusOrb, 0);
                }
            }),
            tg.wait(0.5),

            tg.immediate(context => {
                const riki = getOrError(context[CustomNpcKeys.Riki] as CDOTA_BaseNPC | undefined);
                const tricksOfTheTrade = riki.GetAbilityByIndex(2);
                if (tricksOfTheTrade) {
                    riki.CastAbilityOnPosition(riki.GetAbsOrigin().__add(Vector(-200, 100)), tricksOfTheTrade, 0);
                }
            }),
            tg.wait(3),

            tg.audioDialog(LocalizationKey.Script_4_Outpost_5, LocalizationKey.Script_4_Outpost_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.withHighlights(tg.seq([
                tg.panCameraLinear(_ => playerHero.GetAbsOrigin(), outpostLocation, 2),
                tg.audioDialog(LocalizationKey.Script_4_Outpost_6, LocalizationKey.Script_4_Outpost_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.audioDialog(LocalizationKey.Script_4_Outpost_7, LocalizationKey.Script_4_Outpost_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

                // Part 2: Take outpost
                tg.immediate(_ => {
                    goalTakeOutpost.start();
                    setUnitPacifist(playerHero, false);

                    const dmgToDestroyTower = CreateDamageInfo(playerHero, playerHero, playerHero.GetAbsOrigin(), playerHero.GetAbsOrigin(), 9999, 9999);

                    const direTopTower1 = Entities.FindByName(undefined, "dota_badguys_tower1_top") as CDOTA_BaseNPC_Building | undefined;
                    if (direTopTower1 && unitIsValidAndAlive(direTopTower1)) {
                        direTopTower1.TakeDamage(dmgToDestroyTower);
                    }

                    const direTopTower2 = Entities.FindByName(undefined, "dota_badguys_tower2_top") as CDOTA_BaseNPC_Building | undefined;
                    if (direTopTower2 && unitIsValidAndAlive(direTopTower2)) {
                        direTopTower2.TakeDamage(dmgToDestroyTower);
                    }
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
    removeHighlight(inventorySlot0UIPath);
    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

function orderFilter(event: ExecuteOrderFilterEvent): boolean {
    if (event.order_type === UnitOrder.DROP_ITEM || event.order_type === UnitOrder.MOVE_ITEM) {
        displayDotaErrorMessage("Drop, move items are disabled in this section.")
        return false;
    }
    if (event.order_type === UnitOrder.CAST_NO_TARGET && !allowUseItem) {
        displayDotaErrorMessage("Use item will be allowed later in this section.")
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
