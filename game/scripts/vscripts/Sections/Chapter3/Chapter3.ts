import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { DestroyNeutrals, getOrError, getPlayerHero, unitIsValidAndAlive, highlightUiElement, removeHighlight, isPointInsidePolygon } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { BaseModifier, registerModifier } from "../../lib/dota_ts_adapter";
import { CustomTimeManager } from "../../TimeManager";
import { TutorialContext } from "../../TutorialGraph/index";

let graph: tg.TutorialStep | undefined = undefined;

let movedToStash = false;
let riki: CDOTA_BaseNPC | undefined = undefined;
const creepCampCenter = Vector(-2650, 4760.31);
const markerLocation = Vector(-3250, 4917);
const creepCampRadius = 1000;
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

let entityKilledListenerId: EventListenerID;
let timeManagerZeroTimeId: number;
let timeManagerResetTimeId: number;

const GetUnitsInsidePolygon = (
    polygon: Vector[],
    radius?: number,
    midPoint?: Vector
) => {
    let units = FindUnitsInRadius(
        DotaTeam.GOODGUYS,
        midPoint || Vector(),
        undefined,
        radius || FIND_UNITS_EVERYWHERE,
        UnitTargetTeam.BOTH,
        UnitTargetType.ALL,
        UnitTargetFlags.NONE,
        FindOrder.ANY,
        false
    );

    let inside: CDOTA_BaseNPC[] = [];

    units.forEach((unit) => {
        let loc = unit.GetAbsOrigin();
        let u = unit as CDOTA_BaseNPC;
        if (isPointInsidePolygon(loc, polygon)) {
            inside.push(unit);
        }
    });

    return inside;
};

const requiredState: RequiredState = {
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroLocation: GetGroundPosition(Vector(-3500, 4500), undefined),
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    requireRiki: true,
};

// UI Highlighting Paths
const neutralSlotUIPath = "HUDElements/lower_hud/center_with_stats/inventory_composition_layer_container/inventory_neutral_slot_container/inventory_neutral_slot"
const inventorySlot6UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_backpack_list/inventory_slot_6/ButtonAndLevel"
const inventorySlot7UIPath = "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_backpack_list/inventory_slot_7/ButtonAndLevel"

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", {
        section: SectionName.Chapter3_Opening,
    });

    const goalTracker = new GoalTracker();
    const goalMoveToCamp = goalTracker.addBoolean(
        "Move to the neutral creep camp"
    );

    const goalKillFirstSpawn = goalTracker.addBoolean(
        "Kill the neutral creeps"
    );

    const goalPressAlt = goalTracker.addBoolean(
        "Press alt to see the spawn box"
    );
    const goalMoveOutOfNeutralBox = goalTracker.addBoolean(
        "Move out of the spawn box"
    );

    const goalStackCreeps = goalTracker.addBoolean("Stack the creeps");
    

    const goalStackCreepsMultipleTimes = goalTracker.addBoolean(
        "Stack the creeps at least once!"
    );
    const goalStackCreepsOptional = goalTracker.addNumeric("Stack the creeps as much you can",5);

    const goalKillStackedCreeps = goalTracker.addBoolean(
        "Kill the stacked creeps"
    );

    const goalPickupItem = goalTracker.addBoolean("Pickup the dropped item");

    const goalKillThirdSpawn = goalTracker.addBoolean(
        "Kill the neutral creeps"
    );

    const goalStash = goalTracker.addBoolean(
        "Put the item in the neutral stash"
    );

    const goalMoveToRiki = goalTracker.addBoolean("Move to riki");

    const playerHero = getOrError(
        getPlayerHero(),
        "Could not find the player's hero."
    );

    // Also in orderfilter at the bottom!

    let itemsToDrop = [dropInStashItemName, giveAwayItemName];

    movedToStash = false;
    let creepArr: CDOTA_BaseNPC[] = [];

    entityKilledListenerId = ListenToGameEvent(
        "entity_killed",
        (event) => {
            let unit = EntIndexToHScript(
                event.entindex_killed
            ) as CDOTA_BaseNPC;

            if (creepArr.includes(unit)) {
                if (
                    creepArr.filter((x) => IsValidEntity(x) && x.IsAlive())
                        .length == 1 &&
                    creepPhase == 2
                ) {
                    DropNeutralItemAtPositionForHero(
                        giveAwayItemName,
                        unit.GetAbsOrigin(),
                        playerHero,
                        0,
                        true
                    );
                } else if (
                    creepArr.filter((x) => IsValidEntity(x) && x.IsAlive())
                        .length == 1 &&
                    creepPhase == 3
                ) {
                    DropNeutralItemAtPositionForHero(
                        dropInStashItemName,
                        unit.GetAbsOrigin(),
                        playerHero,
                        0,
                        true
                    );
                }
            }
        },
        undefined
    );

    const goToCamp = () => [
        tg.seq([
            tg.immediate((_) => goalMoveToCamp.start()),
            tg.goToLocation(markerLocation),
            tg.immediate((_) => goalMoveToCamp.complete()),
        ]),
    ];

    const spawnAndKillFirstRound = () => {
        let units: CDOTA_BaseNPC[];
        creepPhase = 1;
        return [
            tg.seq([
                tg.immediate((ctx) => {
                    goalKillFirstSpawn.start();

                    // Make sure the creep spawn box is empty (Hero can't be in there since he's at the marker)
                    let units = GetUnitsInsidePolygon(creepCampBox);
                    units.forEach((unit) => {
                        if (unit.IsBaseNPC() && unit.IsNeutralUnitType()) {
                            UTIL_Remove(unit);
                        }
                    });
                }),
                tg.wait(0),
                tg.immediate((_) => GameRules.SpawnNeutralCreeps()),
                tg.audioDialog(
                    LocalizationKey.Script_3_Opening_1,
                    LocalizationKey.Script_3_Opening_1,
                    (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                    3
                ),
                tg.audioDialog(
                    LocalizationKey.Script_3_Opening_2,
                    LocalizationKey.Script_3_Opening_2,
                    (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                    3
                ),
                tg.audioDialog(
                    LocalizationKey.Script_3_Opening_3,
                    LocalizationKey.Script_3_Opening_3,
                    (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                    3
                ),
                tg.audioDialog(
                    LocalizationKey.Script_3_Opening_4,
                    LocalizationKey.Script_3_Opening_4,
                    (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                    3
                ),
                tg.audioDialog(
                    LocalizationKey.Script_3_Opening_5,
                    LocalizationKey.Script_3_Opening_5,
                    (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                    3
                ),
                tg.audioDialog(
                    LocalizationKey.Script_3_Opening_6,
                    LocalizationKey.Script_3_Opening_6,
                    (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                    3
                ),
                tg.immediate((ctx) => {
                    units = GetUnitsInsidePolygon(creepCampBox).filter(
                        (x) => x.IsBaseNPC() && x.IsNeutralUnitType()
                    ) as CDOTA_BaseNPC[];
                }),
                // Check if they are killed
                tg.fork([
                    tg.completeOnCheck((ctx) => {
                        return (
                            units.length == 0 ||
                            units.every((unit) => {
                                return (
                                    !unit || unit.IsNull() || !unit.IsAlive()
                                );
                            })
                        );
                    }, 1),
                ]),
                tg.immediate((_) => goalKillFirstSpawn.complete()),
            ]),
        ];
    };

    const pressAlt = () => [
        tg.seq([
            tg.immediate((_) => goalPressAlt.start()),
            tg.waitForModifierKey(ModifierKey.Alt),
            tg.audioDialog(
                LocalizationKey.Script_3_Opening_7,
                LocalizationKey.Script_3_Opening_7,
                (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                3
            ),
            tg.immediate((_) => goalPressAlt.complete()),
        ]),
    ];

    const moveOutSpawnBox = () => [
        tg.seq([
            tg.immediate((_) => goalMoveOutOfNeutralBox.start()),
            tg.completeOnCheck((_) => {
                let loc = playerHero.GetAbsOrigin();
                return !isPointInsidePolygon(loc, creepCampBox);
            }, 0.1),
            tg.immediate((_) => goalMoveOutOfNeutralBox.complete()),
            tg.wait(2),
            tg.audioDialog(
                LocalizationKey.Script_3_Opening_8,
                LocalizationKey.Script_3_Opening_8,
                (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                3
            ),
            tg.audioDialog(
                LocalizationKey.Script_3_Opening_9,
                LocalizationKey.Script_3_Opening_9,
                (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                3
            ),
        ]),
    ];

    const stackCreepsPractice = () => {
        let stackCount = 0;
        let tryCount = 0;
        const timeManager = GameRules.Addon.customTimeManager;
        return [
            tg.seq([
                tg.immediate((_) => {
                    playerHero.AddNewModifier(
                        undefined,
                        undefined,
                        "modifier_deal_no_damage",
                        undefined
                    );

                    goalStackCreeps.start();
                    GameRules.SpawnNeutralCreeps();
                    timeManager.customTimeEnabled = true;
                    timeManager.time = 45;
                    timeManagerResetTimeId = timeManager.registerCallBackOnTime(
                        5,
                        () => {
                            timeManager.time = 40;
                        }
                    );
                    timeManagerZeroTimeId = timeManager.registerCallBackOnTime(
                        0,
                        () => {
                            if (
                                GetUnitsInsidePolygon(creepCampBox).length === 0
                            ) {
                                stackCount++;
                            }
                            GameRules.SpawnNeutralCreeps();
                            tryCount++;
                        }
                    );

                    playerHero.Hold();
                }),

                tg.audioDialog(
                    LocalizationKey.Script_3_Opening_10,
                    LocalizationKey.Script_3_Opening_10,
                    (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                    3
                ),

                tg.loop(
                    (_) => {
                        if (timeManager.time === 0 && tryCount === 1) {
                            return stackCount === 0;
                        }
                        return true;
                    },
                    () => {
                        if (tryCount === 1) {
                            tryCount = 0;
                            return tg.audioDialog(
                                LocalizationKey.Script_3_Opening_16,
                                LocalizationKey.Script_3_Opening_16,
                                (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                                3
                            );
                        } else {
                            return tg.wait(0);
                        }
                    }
                ),
                tg.audioDialog(
                    LocalizationKey.Script_3_Opening_17,
                    LocalizationKey.Script_3_Opening_17,
                    (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                    3
                ),
                tg.immediate((_) => {
                    // Commented because removing them seems weird, the player won't understand what's happening
                    // let units = GetUnitsInsidePolygon(creepCampBox).filter(
                    //     (x) => x.IsBaseNPC() && x.IsNeutralUnitType()
                    // );
                    // units.forEach((x) => UTIL_Remove(x));

                    timeManager.unRegisterCallBackOnTime(
                        timeManagerResetTimeId
                    );
                    timeManager.unRegisterCallBackOnTime(timeManagerZeroTimeId);
                    playerHero.RemoveModifierByName("modifier_deal_no_damage");
                    goalStackCreeps.complete();
                }),
            ]),
        ];
    };

    const stackCreepsMultiple = () => {
        let units: CDOTA_BaseNPC[] = [];
        let stackCount = 0;
        let tryCount = 0;
        let stackTries = 5;
        let completed = true;
        const timeManager = GameRules.Addon.customTimeManager;
        return [
            tg.seq([
                tg.immediate((_) => {
                    goalStackCreepsMultipleTimes.start();
                    goalStackCreepsOptional.start();
                    GameRules.SpawnNeutralCreeps();
                    timeManager.time = 45;
                    creepArr = GetUnitsInsidePolygon(creepCampBox);
                    timeManager.customTimeEnabled = true;
                    timeManagerResetTimeId = timeManager.registerCallBackOnTime(
                        3,
                        () => {
                            timeManager.time = 43;
                        }
                    );
                    timeManagerZeroTimeId = timeManager.registerCallBackOnTime(
                        0,
                        () => {
                            if (
                                GetUnitsInsidePolygon(creepCampBox).length === 0
                            ) {
                                stackCount++;
                            }
                            GameRules.SpawnNeutralCreeps();

                            GetUnitsInsidePolygon(creepCampBox).forEach(
                                (unit) => {
                                    if (!creepArr.includes(unit)) {
                                        creepArr.push(unit);
                                    }
                                }
                            );

                            tryCount++;
                        }
                    );
                    playerHero.AddNewModifier(
                        undefined,
                        undefined,
                        "modifier_deal_no_damage",
                        undefined
                    );
                }),
                tg.audioDialog(
                    LocalizationKey.Script_3_Opening_19,
                    LocalizationKey.Script_3_Opening_19,
                    (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                    3
                ),
                tg.loop(
                    (_) => completed,
                    (ctx: TutorialContext) => {
                        completed = !(timeManager.time === 0 && tryCount === stackTries);
                        goalStackCreepsOptional.setValue(tryCount)
                        if (completed === false) {
                            switch (stackCount) {
                                case 0:
                                    completed = true;
                                    tryCount = 0;
                                    return tg.audioDialog(
                                        LocalizationKey.Script_3_Opening_20,
                                        LocalizationKey.Script_3_Opening_20,
                                        (ctx) =>
                                            ctx[CustomNpcKeys.SunsFanMudGolem],
                                        3
                                    );
                                case 1:
                                    goalStackCreepsMultipleTimes.complete();
                                    return tg.audioDialog(
                                        LocalizationKey.Script_3_Opening_21,
                                        LocalizationKey.Script_3_Opening_21,
                                        (ctx) =>
                                            ctx[CustomNpcKeys.SunsFanMudGolem],
                                        3
                                    );
                                case 2:
                                    goalStackCreepsMultipleTimes.complete();
                                    return tg.audioDialog(
                                        LocalizationKey.Script_3_Opening_22,
                                        LocalizationKey.Script_3_Opening_22,
                                        (ctx) =>
                                            ctx[CustomNpcKeys.SunsFanMudGolem],
                                        3
                                    );
                                case 3:
                                    goalStackCreepsMultipleTimes.complete();
                                    return tg.audioDialog(
                                        LocalizationKey.Script_3_Opening_23,
                                        LocalizationKey.Script_3_Opening_23,
                                        (ctx) =>
                                            ctx[CustomNpcKeys.SunsFanMudGolem],
                                        3
                                    );
                                // Not reachable but added just in case...
                                case 4:
                                    goalStackCreepsMultipleTimes.complete();
                                    return tg.audioDialog(
                                        LocalizationKey.Script_3_Opening_24,
                                        LocalizationKey.Script_3_Opening_24,
                                        (ctx) =>
                                            ctx[CustomNpcKeys.SunsFanMudGolem],
                                        3
                                    );
                                case 5:
                                    goalStackCreepsMultipleTimes.complete();
                                    return tg.audioDialog(
                                        LocalizationKey.Script_3_Opening_25,
                                        LocalizationKey.Script_3_Opening_25,
                                        (ctx) =>
                                            ctx[CustomNpcKeys.SunsFanMudGolem],
                                        3
                                    );
                                default:
                                    break;
                            }
                        }
                        return tg.wait(0);
                    }
                ),
                tg.immediate((_) => {
                    timeManager.unRegisterCallBackOnTime(
                        timeManagerResetTimeId
                    );
                    timeManager.unRegisterCallBackOnTime(timeManagerZeroTimeId);
                    playerHero.RemoveModifierByName("modifier_deal_no_damage");
                    goalStackCreepsMultipleTimes.complete();
                    goalStackCreepsMultipleTimes.complete();
                }),
            ]),
        ];
    };

    const killStackedCamp = () => [
        tg.seq([
            tg.audioDialog(
                LocalizationKey.Script_3_Opening_26,
                LocalizationKey.Script_3_Opening_26,
                (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                3
            ),
            tg.immediate((_) => {
                goalKillStackedCreeps.start();
                creepPhase = 2;
            }),
            tg.completeOnCheck((_) => {
                // itemdrop handled in entity_killed event
                return (
                    creepArr.length === 0 ||
                    creepArr.every((x) => x.IsNull() || !x.IsAlive())
                );
            }, 0.1),
            tg.immediate((_) => goalKillStackedCreeps.complete()),
        ]),
    ];

    const pickUpItems = () => [
        tg.seq([
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_1,
                LocalizationKey.Script_3_Neutrals_1,
                (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                3
            ),
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_2,
                LocalizationKey.Script_3_Neutrals_2,
                (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                3
            ),
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_3,
                LocalizationKey.Script_3_Neutrals_3,
                (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                3
            ),

            tg.immediate((_) => goalPickupItem.start()),
            tg.fork([
                tg.completeOnCheck(() => {
                    return playerHero.HasItemInInventory(giveAwayItemName);
                }, 0.1),
            ]),
            tg.immediate((_) => goalPickupItem.complete()),
        ]),
    ];

    const killThirdSpawn = () => {
        return [
            tg.seq([
                tg.immediate((_) => {
                    goalKillThirdSpawn.start();
                    creepPhase = 3;
                    let units = GetUnitsInsidePolygon(creepCampBox);
                    units.forEach((unit) => {
                        if (unit.IsBaseNPC() && unit.IsNeutralUnitType()) {
                            UTIL_Remove(unit);
                        }
                    });
                }),
                tg.wait(0),
                tg.immediate((_) => GameRules.SpawnNeutralCreeps()),
                tg.audioDialog(
                    LocalizationKey.Script_3_Neutrals_4,
                    LocalizationKey.Script_3_Neutrals_4,
                    (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                    3
                ),
                tg.audioDialog(
                    LocalizationKey.Script_3_Neutrals_5,
                    LocalizationKey.Script_3_Neutrals_5,
                    (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                    3
                ),
                tg.wait(0),
                tg.immediate(
                    (_) =>
                        (creepArr = GetUnitsInsidePolygon(
                            creepCampBox
                        ).filter((x) => x.IsNeutralUnitType()))
                ),
                tg.wait(0),
                tg.completeOnCheck((ctx) => {
                    return (
                        creepArr.length == 0 ||
                        creepArr.every((unit) => {
                            return !unit || unit.IsNull() || !unit.IsAlive();
                        })
                    );
                }, 1),
                tg.immediate((_) => goalKillThirdSpawn.complete()),
                tg.immediate((_) => goalPickupItem.start()),
                tg.completeOnCheck(
                    (_) => playerHero.HasItemInInventory(dropInStashItemName),
                    0.1
                ),
                tg.immediate((_) => goalPickupItem.complete()),
            ]),
        ];
    };

    const stashItem = () => [
        tg.seq([
            tg.immediate((_) => goalStash.start()),
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_6,
                LocalizationKey.Script_3_Neutrals_6,
                (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                3
            ),
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_7,
                LocalizationKey.Script_3_Neutrals_7,
                (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                3
            ),
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_8,
                LocalizationKey.Script_3_Neutrals_8,
                (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                3
            ),
            tg.completeOnCheck((_) => {
                return movedToStash === true;
            }, 0.1),
            tg.immediate((_) => goalStash.complete()),
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_9,
                LocalizationKey.Script_3_Neutrals_9,
                (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                3
            ),
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_10,
                LocalizationKey.Script_3_Neutrals_10,
                (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                3
            ),
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_11,
                LocalizationKey.Script_3_Neutrals_11,
                (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                3
            ),
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_12,
                LocalizationKey.Script_3_Neutrals_12,
                (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                3
            ),
            tg.audioDialog(
                LocalizationKey.Script_3_Neutrals_13,
                LocalizationKey.Script_3_Neutrals_13,
                (ctx) => ctx[CustomNpcKeys.SunsFanMudGolem],
                3
            ),
        ]),
    ];

    const chaseRiki = () => {
        return [
            tg.seq([
                tg.immediate((_) => {
                    goalMoveToRiki.start();
                }),
                tg.audioDialog(
                    LocalizationKey.Script_3_Neutrals_1,
                    LocalizationKey.Script_3_Neutrals_1,
                    (ctx) => ctx[CustomNpcKeys.Riki],
                    3
                ),
                tg.audioDialog(
                    LocalizationKey.Script_3_Neutrals_14,
                    LocalizationKey.Script_3_Neutrals_14,
                    (ctx) => ctx[CustomNpcKeys.SlacksMudGolem],
                    3
                ),
            ]),
        ];
    };

    graph = tg.withGoals(
        (_) => goalTracker.getGoals(),
        tg.seq([
            ...goToCamp(),
            ...spawnAndKillFirstRound(),
            ...pressAlt(),
            ...moveOutSpawnBox(),
            ...stackCreepsPractice(),
            ...stackCreepsMultiple(),
            ...killStackedCamp(),
            ...pickUpItems(),
            ...killThirdSpawn(),
            ...stashItem(),
            ...chaseRiki(),
        ])
    );

    graph.start(GameRules.Addon.context, () => {
        print("Completed", "Section CH3 Opening");
        complete();
    });
};

const onStop = () => {
    print("Stopping", "Section Opening");

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
        GameRules.Addon.customTimeManager.unRegisterCallBackOnTime(
            timeManagerResetTimeId
        );
        GameRules.Addon.customTimeManager.unRegisterCallBackOnTime(
            timeManagerZeroTimeId
        );
        GameRules.Addon.customTimeManager.customTimeEnabled = false;
        getPlayerHero()?.RemoveModifierByName("modifier_deal_no_damage");
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
        return [
            //ModifierFunction.DAMAGEOUTGOING_PERCENTAGE,
            ModifierFunction.TOTALDAMAGEOUTGOING_PERCENTAGE,
        ];
    }

    GetModifierTotalDamageOutgoing_Percentage() {
        return -1000;
    }

    GetModifierDamageOutgoing_Percentage() {
        return -1000;
    }
}