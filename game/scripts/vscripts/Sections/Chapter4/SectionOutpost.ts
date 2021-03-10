import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { getOrError, getPlayerHero, unitIsValidAndAlive, highlightUiElement, removeHighlight } from "../../util";
import { GoalTracker } from "../../Goals";

const sectionName: SectionName = SectionName.Chapter4_Outpost;

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: Vector(-2000, 3800, 128),
    requireRiki: true,
    rikiLocation: Vector(-1000, 4400, 256),
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
};

const dustName = "item_dust";
const dustLocation = Vector(-1700, 3800, 256);

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

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.setCameraTarget(playerHero),

            // Part 0: Pick up and use dust
            // TODO: lock hero position to ensure dust affect on Riki

            tg.textDialog(LocalizationKey.Script_4_Outpost_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_4_Outpost_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 8),
            tg.immediate(_ => {
                goalPickupDust.start();
                CreateItemOnPositionSync(dustLocation, CreateItem(dustName, undefined, undefined));
            }),
            tg.completeOnCheck(_ => playerHero.HasItemInInventory(dustName), 1),

            tg.immediate(_ => {
                goalPickupDust.complete();
                goalGoToLastLocationSawRiki.start();
            }),
            // TODO: save last position saw riki
            tg.goToLocation(Vector(-1500, 4000)),

            tg.immediate(_ => {
                goalGoToLastLocationSawRiki.complete();
                goalUseDust.start();
                highlightUiElement(inventorySlot0UIPath, undefined, true)
            }),

            tg.textDialog(LocalizationKey.Script_4_Outpost_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),

            tg.completeOnCheck(_ => !playerHero.HasItemInInventory(dustName), 1),
            tg.immediate(_ => goalUseDust.complete()),
            tg.wait(1),
            tg.immediate(_ => {
                removeHighlight(inventorySlot0UIPath);
            }),

            tg.textDialog(LocalizationKey.Script_4_Outpost_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),

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

            tg.textDialog(LocalizationKey.Script_4_Outpost_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_4_Outpost_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 8),
            tg.textDialog(LocalizationKey.Script_4_Outpost_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),

            // Part 2: Take outpost
            // TODO: Camera pan on outpost
            tg.immediate(_ => {
                goalTakeOutpost.start();

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

            tg.textDialog(LocalizationKey.Script_4_Outpost_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),

            tg.completeOnCheck(_ => {
                return direOutpost.GetTeam() === DotaTeam.GOODGUYS;
            }, 1),

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

            tg.textDialog(LocalizationKey.Script_4_Outpost_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),

            tg.completeOnCheck(context => {
                const riki = getOrError(context[CustomNpcKeys.Riki] as CDOTA_BaseNPC | undefined);
                return !IsValidEntity(riki) || !riki.IsAlive();
            }, 1),

            tg.immediate(_ => goalKillRiki.complete()),
            
            tg.textDialog(LocalizationKey.Script_4_Outpost_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_4_Outpost_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 5),
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

export const sectionOutpost = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop
);
