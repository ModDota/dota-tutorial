import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { freezePlayerHero, getOrError, getPlayerHero, highlightUiElement, isPointInsidePolygon, removeHighlight, setUnitPacifist, unitIsValidAndAlive } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { BaseModifier, registerModifier } from "../../lib/dota_ts_adapter";
import { Blockade } from "../../Blockade";

let graph: tg.TutorialStep | undefined = undefined;

let movedToStash = false;
const markerLocation = Vector(-3250, 4917);
const creepCampBox = [
    Vector(-2915, 4388),
    Vector(-2915, 5203),
    Vector(-2141, 5203),
    Vector(-2141, 4388),
];
let creepPhase = 0;

const giveAwayItemName = "item_arcane_ring";
const dropInStashItemName = "item_mysterious_hat";
const keepItemName = "item_possessed_mask";

const neutralSlotUIPath =
    "HUDElements/lower_hud/center_with_stats/inventory_composition_layer_container/inventory_neutral_slot_container/inventory_neutral_slot";
const inventorySlot6UIPath =
    "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_backpack_list/inventory_slot_6/ButtonAndLevel";

let timeManagerZeroTimeId: number;
let timeManagerResetTimeId: number;
let entityKilledListenerId: EventListenerID;

const GetUnitsInsidePolygon = (polygon: Vector[], radius?: number, midPoint?: Vector) => {
    const units = FindUnitsInRadius(DotaTeam.GOODGUYS, midPoint || Vector(), undefined, radius || FIND_UNITS_EVERYWHERE, UnitTargetTeam.BOTH,
        UnitTargetType.ALL, UnitTargetFlags.NONE, FindOrder.ANY, false);

    return units.filter(unit => isPointInsidePolygon(unit.GetAbsOrigin(), polygon));
};

const requiredState: RequiredState = {
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroLocation: GetGroundPosition(Vector(-3500, 4500), undefined),
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    requireODPixelGolem: true,

    requireRiki: true,
    heroItems: { item_greater_crit: 1 },
    blockades: [
        new Blockade(Vector(-1550, 3600), Vector(-1550, 4800)),
        new Blockade(Vector(-1550, 4800), Vector(-2600, 6400)),
        new Blockade(Vector(-2600, 6400), Vector(-3700, 6400)),
        new Blockade(Vector(-3700, 6400), Vector(-4100, 5200)),
        new Blockade(Vector(-4100, 5200), Vector(-4600, 4800)),
        new Blockade(Vector(-4600, 4800), Vector(-4000, 3800)),
        new Blockade(Vector(-4000, 3800), Vector(-1550, 3600)),
    ],
};

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: SectionName.Chapter3_Opening, });

    const goalTracker = new GoalTracker();
    const goalMoveToCamp = goalTracker.addBoolean("Move to the neutral creep camp");
    const goalKillFirstSpawn = goalTracker.addBoolean("Kill the neutral creeps");
    const goalMoveToTarget = goalTracker.addBoolean("Move to the marked location");
    const goalPressAlt = goalTracker.addBoolean("Press 'ALT' to see the spawn box");
    const goalStackCreeps = goalTracker.addBoolean("Stack the creeps");
    const goalTryStackCreeps = goalTracker.addNumeric("Try to stack the creeps again, do it successfully at least once", 5);
    const goalOptionalStackCreeps = goalTracker.addNumeric("(Optional) Successfully stack the creeps again", 5);
    const goalKillStackedCreeps = goalTracker.addBoolean("Kill the stacked creeps");
    const goalPickupItem = goalTracker.addBoolean("Pickup the dropped item");
    const goalKillThirdSpawn = goalTracker.addBoolean("Kill the neutral creeps");
    const goalStash = goalTracker.addBoolean("Put the item in the neutral stash");
    const goalMoveToRiki = goalTracker.addBoolean("Move to riki");

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");

    movedToStash = false;
    let creepArr: CDOTA_BaseNPC[] = [];

    let itemsToDrop = [giveAwayItemName, dropInStashItemName];

    entityKilledListenerId = ListenToGameEvent("entity_killed",(event) => {
            const unit = EntIndexToHScript(event.entindex_killed) as CDOTA_BaseNPC;
            if (unit.IsNeutralUnitType()) {
                if (itemsToDrop.includes(giveAwayItemName) && creepPhase === 2) {
                    DropNeutralItemAtPositionForHero(giveAwayItemName, unit.GetAbsOrigin(), playerHero, 0, true);
                    itemsToDrop.splice(itemsToDrop.indexOf(giveAwayItemName), 1);
                } else if (itemsToDrop.includes(dropInStashItemName) && creepPhase === 3) {
                    DropNeutralItemAtPositionForHero(dropInStashItemName, unit.GetAbsOrigin(), playerHero, 0, true);
                    itemsToDrop.splice(itemsToDrop.indexOf(dropInStashItemName), 1);
                }
            }
        },
        undefined
    );

    const goToCamp = () => [
        tg.immediate(_ => goalMoveToCamp.start()),
        tg.goToLocation(markerLocation),
        tg.immediate(_ => goalMoveToCamp.complete()),
    ];

    const spawnAndKillFirstRound = () => {
        let units: CDOTA_BaseNPC[];
        creepPhase = 1;
        return [
            tg.immediate(_ => {
                goalKillFirstSpawn.start();

                // Make sure the creep spawn box is empty (Hero can't be in there since he's at the marker)
                const units = GetUnitsInsidePolygon(creepCampBox);
                units.forEach(unit => {
                    if (unit.IsBaseNPC() && unit.IsNeutralUnitType()) {
                        UTIL_Remove(unit);
                    }
                });
            }),
            tg.wait(0),
            tg.immediate(_ => GameRules.SpawnNeutralCreeps()),
            tg.audioDialog(LocalizationKey.Script_3_Opening_1, LocalizationKey.Script_3_Opening_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_2, LocalizationKey.Script_3_Opening_2, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_3, LocalizationKey.Script_3_Opening_3, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_4, LocalizationKey.Script_3_Opening_4, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_5, LocalizationKey.Script_3_Opening_5, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_6, LocalizationKey.Script_3_Opening_6, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(_ => units = GetUnitsInsidePolygon(creepCampBox).filter(x => x.IsBaseNPC() && x.IsNeutralUnitType()) as CDOTA_BaseNPC[]),
            // Check if they are killed
            tg.completeOnCheck(_ => units.length === 0 || !units.some(unitIsValidAndAlive), 1),
            tg.immediate(_ => goalKillFirstSpawn.complete()),
        ];
    };

    const respawnCreepsInitially = () => [
        tg.immediate(_ => goalMoveToTarget.start()),
        tg.goToLocation(markerLocation),
        tg.immediate(_ => goalMoveToTarget.complete()),
        tg.immediate(_ => freezePlayerHero(true)),
        tg.audioDialog(LocalizationKey.Script_3_Opening_7, LocalizationKey.Script_3_Opening_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Opening_8, LocalizationKey.Script_3_Opening_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Opening_9, LocalizationKey.Script_3_Opening_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.immediate(_ => GameRules.SpawnNeutralCreeps()),
    ];

    const pressAlt = () => [
        tg.audioDialog(LocalizationKey.Script_3_Opening_10, LocalizationKey.Script_3_Opening_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Opening_11, LocalizationKey.Script_3_Opening_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Opening_12, LocalizationKey.Script_3_Opening_12, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

        tg.immediate(_ => goalPressAlt.start()),
        tg.waitForModifierKey(ModifierKey.Alt),
        tg.immediate(_ => goalPressAlt.complete()),

        tg.audioDialog(LocalizationKey.Script_3_Opening_13, LocalizationKey.Script_3_Opening_13, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Opening_14, LocalizationKey.Script_3_Opening_14, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
    ];

    const stackCreepsPractice = () => {
        let stackCount = 0;
        let tryCount = 0;
        const timeManager = GameRules.Addon.customTimeManager;
        return [
            tg.immediate(_ => {
                playerHero.AddNewModifier(undefined, undefined, "modifier_deal_no_damage", undefined);

                goalStackCreeps.start();
                GameRules.SpawnNeutralCreeps();
                timeManager.customTimeEnabled = true;
                timeManager.time = 45;
                timeManagerResetTimeId = timeManager.registerCallBackOnTime(5, () => timeManager.time = 40);
                timeManagerZeroTimeId = timeManager.registerCallBackOnTime(0, () => {
                    if (GetUnitsInsidePolygon(creepCampBox).length === 0) {
                        stackCount++;
                    }
                    GameRules.SpawnNeutralCreeps();
                    tryCount++;
                });

                playerHero.Hold();
            }),

            tg.audioDialog(LocalizationKey.Script_3_Opening_15, LocalizationKey.Script_3_Opening_15, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.immediate(_ => freezePlayerHero(false)),

            tg.loop(_ => stackCount < 1, _ => {
                if (tryCount === 1) {
                    tryCount = 0;
                    return tg.audioDialog(LocalizationKey.Script_3_Opening_16, LocalizationKey.Script_3_Opening_16, ctx => ctx[CustomNpcKeys.SlacksMudGolem]);
                } else {
                    return tg.wait(0);
                }
            }),
            tg.audioDialog(LocalizationKey.Script_3_Opening_17, LocalizationKey.Script_3_Opening_17, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.immediate(_ => {
                timeManager.unregisterCallBackOnTime(timeManagerResetTimeId);
                timeManager.unregisterCallBackOnTime(timeManagerZeroTimeId);
                playerHero.RemoveModifierByName("modifier_deal_no_damage");
                goalStackCreeps.complete();
            }),
        ];
    };

    const stackDialogKeys = [
        LocalizationKey.Script_3_Opening_20,
        LocalizationKey.Script_3_Opening_21,
        LocalizationKey.Script_3_Opening_22,
        LocalizationKey.Script_3_Opening_23,
        LocalizationKey.Script_3_Opening_24,
        LocalizationKey.Script_3_Opening_25,
    ]

    const stackCreepsMultiple = () => {
        let stackCount = 0;
        let tryCount = 0;
        let previousTryCount = tryCount;
        let playedDialogStacks = 0;

        const timeManager = GameRules.Addon.customTimeManager;
        return [
            tg.audioDialog(LocalizationKey.Script_3_Opening_18, LocalizationKey.Script_3_Opening_18, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(ctx => {
                goalOptionalStackCreeps.start();
                goalTryStackCreeps.start();
                GameRules.SpawnNeutralCreeps();
                timeManager.time = 45;
                creepArr = GetUnitsInsidePolygon(creepCampBox);
                timeManager.customTimeEnabled = true;
                timeManagerResetTimeId = timeManager.registerCallBackOnTime(3, () => timeManager.time = 43);
                timeManagerZeroTimeId = timeManager.registerCallBackOnTime(0, () => {
                    if (GetUnitsInsidePolygon(creepCampBox).length === 0) {
                        stackCount++;
                    }
                    GameRules.SpawnNeutralCreeps();

                    GetUnitsInsidePolygon(creepCampBox).forEach(unit => {
                        if (!creepArr.includes(unit)) {
                            creepArr.push(unit);
                        }
                    });

                    tryCount++;
                });
                playerHero.AddNewModifier(undefined, undefined, "modifier_keep_hero_alive", undefined);
                playerHero.AddNewModifier(undefined, undefined, "modifier_deal_no_damage", undefined);
                let odPixel = ctx[CustomNpcKeys.ODPixelMudGolem] as CDOTA_BaseNPC;
                odPixel.SetAbsOrigin(GetGroundPosition(markerLocation, undefined));
                setUnitPacifist(odPixel, true);
            }),
            tg.audioDialog(LocalizationKey.Script_3_Opening_19, LocalizationKey.Script_3_Opening_19, ctx => ctx[CustomNpcKeys.ODPixelMudGolem]),
            tg.loop(_ => tryCount < 5, _ => {
                goalTryStackCreeps.setValue(tryCount);
                goalOptionalStackCreeps.setValue(stackCount);

                // Do something if a try was done.
                if (tryCount !== previousTryCount) {
                    previousTryCount = tryCount;

                    if (stackCount === 0) {
                        // Reset try count if we failed the first stack
                        tryCount = 0;
                        return tg.audioDialog(LocalizationKey.Script_3_Opening_20, LocalizationKey.Script_3_Opening_20, ctx => ctx[CustomNpcKeys.ODPixelMudGolem])
                    } else if (playedDialogStacks !== stackCount) {
                        // Play dialog if we didn't play it yet for the stack count
                        playedDialogStacks = stackCount;
                        return tg.audioDialog(stackDialogKeys[stackCount], stackDialogKeys[stackCount], ctx => ctx[CustomNpcKeys.ODPixelMudGolem]);
                    }
                }

                return tg.wait(0);
            }),
            tg.immediate(_ => {
                timeManager.unregisterCallBackOnTime(timeManagerResetTimeId);
                timeManager.unregisterCallBackOnTime(timeManagerZeroTimeId);
                playerHero.RemoveModifierByName("modifier_deal_no_damage");
                goalOptionalStackCreeps.setValue(stackCount);
                goalOptionalStackCreeps.complete();
                goalTryStackCreeps.setValue(tryCount);
                goalTryStackCreeps.complete();
            }),
        ];
    };

    const killStackedCamp = () => [
        tg.audioDialog(LocalizationKey.Script_3_Opening_26, LocalizationKey.Script_3_Opening_26, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.immediate(_ => {
            goalKillStackedCreeps.start();
            creepPhase = 2;
        }),
        // itemdrop handled in entity_killed event
        tg.completeOnCheck(_ => creepArr.length === 0 || creepArr.every(x => x.IsNull() || !x.IsAlive()), 0.1),
        tg.immediate(_ => goalKillStackedCreeps.complete()),
    ];

    const pickUpItems = () => [
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_1, LocalizationKey.Script_3_Neutrals_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_2, LocalizationKey.Script_3_Neutrals_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_3, LocalizationKey.Script_3_Neutrals_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.immediate(_ => {
            goalPickupItem.start();
            highlightUiElement(neutralSlotUIPath);
        }),
        
        tg.completeOnCheck(() => playerHero.HasItemInInventory(giveAwayItemName), 0.1),
        tg.immediate(_ => {
            goalPickupItem.complete();
            removeHighlight(neutralSlotUIPath);
        }),
    ];

    const killThirdSpawn = () => [
        tg.immediate(_ => {
            goalKillThirdSpawn.start();
            creepPhase = 3;
            GetUnitsInsidePolygon(creepCampBox).forEach(unit => {
                if (unit.IsBaseNPC() && unit.IsNeutralUnitType()) {
                    UTIL_Remove(unit);
                }
            });
        }),
        tg.wait(0),
        tg.immediate(_ => GameRules.SpawnNeutralCreeps()),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_4, LocalizationKey.Script_3_Neutrals_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_5, LocalizationKey.Script_3_Neutrals_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.wait(0),
        tg.immediate(_ => creepArr = GetUnitsInsidePolygon(creepCampBox).filter((x) => x.IsNeutralUnitType())),
        tg.wait(0),
        tg.completeOnCheck(_ => creepArr.length === 0 || creepArr.every(unit => !unit || unit.IsNull() || !unit.IsAlive()), 1),
        tg.immediate(_ => goalKillThirdSpawn.complete()),
        tg.immediate(_ => goalPickupItem.start()),
        tg.completeOnCheck(_ => playerHero.HasItemInInventory(dropInStashItemName), 0.1),
        tg.immediate(_ => goalPickupItem.complete()),
    ];

    const stashItem = () => [
        tg.immediate(_ => goalStash.start()),
        tg.immediate(_ => highlightUiElement(inventorySlot6UIPath)),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_6, LocalizationKey.Script_3_Neutrals_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_7, LocalizationKey.Script_3_Neutrals_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_8, LocalizationKey.Script_3_Neutrals_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.completeOnCheck(_ => movedToStash === true, 0.1),
        tg.immediate(_ => goalStash.complete()),
        tg.immediate(_ => removeHighlight(inventorySlot6UIPath)),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_9, LocalizationKey.Script_3_Neutrals_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_10, LocalizationKey.Script_3_Neutrals_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_11, LocalizationKey.Script_3_Neutrals_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_12, LocalizationKey.Script_3_Neutrals_12, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
    ];

    const chaseRiki = () => {
        let location = GetGroundPosition(Vector(-2250, 3850), undefined);
        return [
            tg.audioDialog(LocalizationKey.Script_3_Neutrals_13, LocalizationKey.Script_3_Neutrals_13, (ctx) => ctx[CustomNpcKeys.Riki]),
            tg.immediate((ctx) => {
                goalMoveToRiki.start();
                let riki = ctx[CustomNpcKeys.Riki] as CDOTA_BaseNPC;
                riki.SetAbsOrigin(GetGroundPosition(Vector(-2700, 4200), undefined));
                let backstab = riki.FindAbilityByName("riki_backstab");
                print("Backstab",backstab);
                backstab?.SetLevel(0);
                print("Backstab",backstab?.GetLevel());
                riki.RemoveModifierByName("modifier_invisible");
                riki.RemoveModifierByName("modifier_riki_backstab")
                riki.Hold();
            }),
            tg.moveUnit((ctx) => ctx[CustomNpcKeys.Riki], location),
            tg.audioDialog(LocalizationKey.Script_3_Neutrals_14, LocalizationKey.Script_3_Neutrals_14, (ctx) => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.goToLocation(location),
        ];
    };

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        ...goToCamp(),
        ...spawnAndKillFirstRound(),
        ...respawnCreepsInitially(),
        ...pressAlt(),
        ...stackCreepsPractice(),
        ...stackCreepsMultiple(),
        ...killStackedCamp(),
        ...pickUpItems(),
        ...killThirdSpawn(),
        ...stashItem(),
        ...chaseRiki(),
    ]));

    graph.start(GameRules.Addon.context, () => {
        print("Completed", SectionName.Chapter3_Opening);
        complete();
    });
};

const onStop = () => {
    print("Stopping", "Section Opening");

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
        GameRules.Addon.customTimeManager.unregisterCallBackOnTime(timeManagerResetTimeId);
        GameRules.Addon.customTimeManager.unregisterCallBackOnTime(timeManagerZeroTimeId);
        GameRules.Addon.customTimeManager.customTimeEnabled = false;
        const hero = getPlayerHero()
        if (hero && IsValidEntity(hero)) {
            hero.RemoveModifierByName("modifier_deal_no_damage");
            hero.RemoveModifierByName("modifier_keep_hero_alive");
        }
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

@registerModifier()
class modifier_deal_no_damage extends BaseModifier {
    IsHidden() {
        return !IsInToolsMode();
    }

    DeclareFunctions() {
        return [ModifierFunction.TOTALDAMAGEOUTGOING_PERCENTAGE];
    }

    GetModifierTotalDamageOutgoing_Percentage() {
        return -1000;
    }
}

@registerModifier()
class modifier_keep_hero_alive extends BaseModifier {
    IsHidden() {
        return !IsInToolsMode();
    }

    DeclareFunctions() {
        return [ModifierFunction.INCOMING_DAMAGE_PERCENTAGE];
    }

    GetModifierIncomingDamage_Percentage() {
        let parent = this.GetParent();
        let healthPct = parent.GetHealthPercent();
        if (healthPct > 5) {
            return 0;
        }

        return -(100 - healthPct);
    }
}
