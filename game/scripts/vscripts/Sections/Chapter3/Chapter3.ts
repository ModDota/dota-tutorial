import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { freezePlayerHero, getOrError, getPlayerHero, isPointInsidePolygon, unitIsValidAndAlive } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { BaseModifier, registerModifier } from "../../lib/dota_ts_adapter";

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
    requireRiki: true,
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

    entityKilledListenerId = ListenToGameEvent("entity_killed", event => {
        const unit = EntIndexToHScript(event.entindex_killed) as CDOTA_BaseNPC;

        if (creepArr.includes(unit)) {
            if (creepArr.filter((x) => IsValidEntity(x) && x.IsAlive()).length === 1 && creepPhase === 2) {
                DropNeutralItemAtPositionForHero(giveAwayItemName, unit.GetAbsOrigin(), playerHero, 0, true);
            } else if (creepArr.filter((x) => IsValidEntity(x) && x.IsAlive()).length === 1 && creepPhase === 3) {
                DropNeutralItemAtPositionForHero(dropInStashItemName, unit.GetAbsOrigin(), playerHero, 0, true);
            }
        }
    }, undefined);

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
            tg.immediate(_ => {
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
                playerHero.AddNewModifier(undefined, undefined, "modifier_deal_no_damage", undefined);
            }),
            tg.audioDialog(LocalizationKey.Script_3_Opening_19, LocalizationKey.Script_3_Opening_19, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.loop(_ => tryCount < 5, _ => {
                goalTryStackCreeps.setValue(tryCount);
                goalOptionalStackCreeps.setValue(stackCount);

                // Do something if a try was done.
                if (tryCount !== previousTryCount) {
                    previousTryCount = tryCount;

                    if (stackCount === 0) {
                        // Reset try count if we failed the first stack
                        tryCount = 0;
                        return tg.audioDialog(LocalizationKey.Script_3_Opening_20, LocalizationKey.Script_3_Opening_20, ctx => ctx[CustomNpcKeys.SunsFanMudGolem])
                    } else if (playedDialogStacks !== stackCount) {
                        // Play dialog if we didn't play it yet for the stack count
                        playedDialogStacks = stackCount;
                        return tg.audioDialog(stackDialogKeys[stackCount], stackDialogKeys[stackCount], ctx => ctx[CustomNpcKeys.SunsFanMudGolem]);
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

        tg.immediate(_ => goalPickupItem.start()),
        tg.completeOnCheck(() => playerHero.HasItemInInventory(giveAwayItemName), 0.1),
        tg.immediate(_ => goalPickupItem.complete()),
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
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_6, LocalizationKey.Script_3_Neutrals_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_7, LocalizationKey.Script_3_Neutrals_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_8, LocalizationKey.Script_3_Neutrals_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.completeOnCheck(_ => movedToStash === true, 0.1),
        tg.immediate(_ => goalStash.complete()),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_9, LocalizationKey.Script_3_Neutrals_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_10, LocalizationKey.Script_3_Neutrals_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_11, LocalizationKey.Script_3_Neutrals_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_12, LocalizationKey.Script_3_Neutrals_12, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
    ];

    const chaseRiki = () => [
        tg.immediate(_ => goalMoveToRiki.start()),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_13, LocalizationKey.Script_3_Neutrals_13, ctx => ctx[CustomNpcKeys.Riki]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_14, LocalizationKey.Script_3_Neutrals_14, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
    ];

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
