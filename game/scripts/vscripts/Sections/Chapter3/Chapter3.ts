import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { DestroyNeutrals, getPlayerHero } from "../../util";
import { GameMode } from "../../GameMode";
import { TutorialContext, TutorialStep } from "../../TutorialGraph/index";

let graph: tg.TutorialStep | undefined = undefined;
// Use this variable to detect whether item has been moved // TODO better solution
let movedToStash = false;

enum NeutralGoalKeys {
    MoveToCamp,
    UpgradeAbility,
    KillNeutralsSatyrs,
    PickupItemArcaneRing,
    UseNeutralItem,
    PressAlt,
    MoveOutOfNeutralBox,
    KillNeutralsWolves,
    PickupItems,
    SwitchItems,
    ShareItem,
    StashItem,
}

enum GoalState {
    Started,
    Completed,
}

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", {
        section: SectionName.Chapter3_Opening,
    });

    // Return a list of goals to display depending on which parts we have started and completed.
    const getGoals = (context: TutorialContext) => {
        const isGoalStarted = (key: NeutralGoalKeys) =>
            context[key] === GoalState.Started ||
            context[key] === GoalState.Completed;
        const isGoalCompleted = (key: NeutralGoalKeys) =>
            context[key] === GoalState.Completed;

        const goals: Goal[] = [];
        const addGoal = (key: NeutralGoalKeys, text: string) => {
            if (isGoalStarted(key)) {
                goals.push({ text: text, completed: isGoalCompleted(key) });
            }
        };

        addGoal(NeutralGoalKeys.MoveToCamp, "Move to the neutral creep camp");
        addGoal(
            NeutralGoalKeys.UpgradeAbility,
            "Upgrade the Dragon Blood ability"
        );
        addGoal(
            NeutralGoalKeys.KillNeutralsSatyrs,
            "Kill the neutral creeps (Satyrs)"
        );
        addGoal(NeutralGoalKeys.PickupItemArcaneRing, "Pickup the arcane ring");
        addGoal(NeutralGoalKeys.UseNeutralItem, "Use your new found item.");
        addGoal(NeutralGoalKeys.PressAlt, "Press alt to see the spawn box");
        addGoal(
            NeutralGoalKeys.MoveOutOfNeutralBox,
            "Move out of the spawn box"
        );
        addGoal(
            NeutralGoalKeys.KillNeutralsWolves,
            "Kill the neutral creeps (Wolves)"
        );
        addGoal(NeutralGoalKeys.PickupItems, "Pick up the dropped items");
        addGoal(
            NeutralGoalKeys.SwitchItems,
            "Switch the possessed mask with the arcane ring"
        );
        addGoal(NeutralGoalKeys.ShareItem, "Give the arcane ring to warlock");
        addGoal(NeutralGoalKeys.ShareItem, "Put the item in the neutral stash");

        return goals;
    };

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    let dragon_knight_dragon_blood = playerHero.FindAbilityByName(
        "dragon_knight_dragon_blood"
    );

    if (!dragon_knight_dragon_blood) {
        dragon_knight_dragon_blood = playerHero.AddAbility(
            "dragon_knight_dragon_blood"
        );
    }

    if (!dragon_knight_dragon_blood) {
        error(
            "dragon_knight_dragon_blood has been renamed or replaced by another ability, this is bad."
        );
    }

    // Also in orderfilter at the bottom!
    const giveAwayItemName = "item_arcane_ring";
    const dropInStashItemName = "item_mysterious_hat";
    const keepItemName = "item_possessed_mask";

    const units: CDOTA_BaseNPC[] = [];

    playerHero.SetMoveCapability(UnitMoveCapability.GROUND);
    playerHero.SetAbsOrigin(GetGroundPosition(Vector(-4000, -550), undefined));

    const markerLocation = Vector(-3250, -150);

    const neutralCamp = Entities.FindByClassnameNearest(
        "npc_dota_neutral_spawner",
        Vector(-2608, -648, 265),
        100
    )!;
    const neutralCampPostion = neutralCamp?.GetAbsOrigin();

    const stepArray: TutorialStep[] = [];

    GameRules.SpawnNeutralCreeps();

    const goToCamp = () => {
        return [
            // Show message and explain what the "neutral spawn indicators" on the minimap are.
            // Kill them after so that we can make our own.
            tg.immediate(() => DestroyNeutrals()),
            tg.immediate(
                (context) =>
                    (context[NeutralGoalKeys.MoveToCamp] = GoalState.Started)
            ),
            tg.goToLocation(markerLocation),
            tg.immediate((context) => {
                context[NeutralGoalKeys.MoveToCamp] = GoalState.Completed;
            }),
        ];
    };

    const upgradeAbility_1 = () => {
        return [
            tg.immediate((context) => {
                context[NeutralGoalKeys.UpgradeAbility] = GoalState.Started;
                if (playerHero.GetLevel() < 2) {
                    playerHero.HeroLevelUp(false);
                }
                playerHero.SetAbilityPoints(1);
            }),
            tg.upgradeAbility(dragon_knight_dragon_blood!),
            tg.immediate((context) => {
                context[NeutralGoalKeys.UpgradeAbility] = GoalState.Completed;
            }),
        ];
    };

    const spawnAndKillSatyrs = () => {
        return [
            // Create the units[
            tg.spawnUnit(
                "npc_dota_neutral_satyr_trickster",
                neutralCampPostion.__add(RandomVector(50)),
                DotaTeam.NEUTRALS,
                "trickster_1"
            ),
            tg.spawnUnit(
                "npc_dota_neutral_satyr_trickster",
                neutralCampPostion.__add(RandomVector(50)),
                DotaTeam.NEUTRALS,
                "trickster_2"
            ),
            tg.spawnUnit(
                "npc_dota_neutral_satyr_soulstealer",
                neutralCampPostion.__add(RandomVector(50)),
                DotaTeam.NEUTRALS,
                "soulstealer_1"
            ),
            tg.spawnUnit(
                "npc_dota_neutral_satyr_soulstealer",
                neutralCampPostion.__add(RandomVector(50)),
                DotaTeam.NEUTRALS,
                "soulstealer_2"
            ),

            tg.immediate((ctx) => {
                units.push(ctx["trickster_1"] as CDOTA_BaseNPC);
                units.push(ctx["trickster_2"] as CDOTA_BaseNPC);
                units.push(ctx["soulstealer_1"] as CDOTA_BaseNPC);
                ctx[NeutralGoalKeys.KillNeutralsSatyrs] = GoalState.Started;
            }),

            // Check if they are killed
            tg.fork([
                tg.completeOnCheck((ctx) => {
                    return units.every((unit) => {
                        return !unit || unit.IsNull() || !unit.IsAlive();
                    });
                }, 1),
                //This one gives the item
                tg.completeOnCheck((ctx) => {
                    const unit = ctx["soulstealer_2"] as CDOTA_BaseNPC;
                    if (!unit || unit.IsNull() || !unit.IsAlive()) {
                        DropNeutralItemAtPositionForHero(
                            giveAwayItemName,
                            unit.GetAbsOrigin(),
                            playerHero,
                            0,
                            true
                        );
                        return true;
                    }
                    return false;
                }, 0.1),
            ]),

            tg.immediate((context) => {
                context[NeutralGoalKeys.KillNeutralsSatyrs] =
                    GoalState.Completed;
            }),
        ];
    };

    const upgradeAbility_2 = () => {
        return [
            tg.immediate((context) => {
                playerHero.HeroLevelUp(true);
                context[NeutralGoalKeys.UpgradeAbility] = GoalState.Started;
            }),
            tg.upgradeAbility(dragon_knight_dragon_blood!),
            tg.immediate((context) => {
                context[NeutralGoalKeys.UpgradeAbility] = GoalState.Completed;
            }),
        ];
    };

    const pickUpArcaneRing = () => {
        return [
            // Explain that neutrals drop items, how it works. Tell the player to pick it up.
            tg.immediate((context) => {
                context[NeutralGoalKeys.PickupItemArcaneRing] =
                    GoalState.Started;
            }),
            tg.completeOnCheck(() => {
                return playerHero.HasItemInInventory(giveAwayItemName);
            }, 0.1),
            tg.immediate((context) => {
                context[NeutralGoalKeys.PickupItemArcaneRing] =
                    GoalState.Completed;
            }),
        ];
    };

    const useArcaneRing = () => {
        return [
            // Tell the player that some neutral items have active abilities, tell them to use it.
            tg.immediate((context) => {
                context[NeutralGoalKeys.UseNeutralItem] = GoalState.Started;
            }),
            tg.completeOnCheck(() => {
                let item = playerHero.FindItemInInventory(giveAwayItemName);
                return item != null && !item.IsCooldownReady();
            }, 0.1),
            tg.immediate((context) => {
                context[NeutralGoalKeys.UseNeutralItem] = GoalState.Completed;
            }),
        ];
    };

    const moveOutOfNeutralBox = () => {
        return [
            // Tell the player that neutrals creeps spawn every minute, considered their box is empty. Mention stacking.
            tg.immediate((context) => {
                context[NeutralGoalKeys.MoveOutOfNeutralBox] =
                    GoalState.Started;
            }),
            tg.goToLocation(markerLocation),
            tg.immediate((context) => {
                context[NeutralGoalKeys.MoveOutOfNeutralBox] =
                    GoalState.Completed;
            }),
        ];
    };

    const spawnAndKillWolves = () => {
        return [
            
            tg.spawnUnit(
                "npc_dota_neutral_alpha_wolf",
                neutralCampPostion.__add(RandomVector(50)),
                DotaTeam.NEUTRALS,
                "alpha_1"
            ),
            tg.spawnUnit(
                "npc_dota_neutral_giant_wolf",
                neutralCampPostion.__add(RandomVector(50)),
                DotaTeam.NEUTRALS,
                "giant_1"
            ),
            tg.spawnUnit(
                "npc_dota_neutral_giant_wolf",
                neutralCampPostion.__add(RandomVector(50)),
                DotaTeam.NEUTRALS,
                "giant_2"
            ),

            tg.immediate((context) => {
                context[NeutralGoalKeys.KillNeutralsWolves] = GoalState.Started;
            }),    


            tg.fork([
                tg.completeOnCheck((ctx) => {
                    const unit = ctx["alpha_1"] as CDOTA_BaseNPC;
                    if (!unit || unit.IsNull() || !unit.IsAlive()) {
                        DropNeutralItemAtPositionForHero(
                            keepItemName,
                            unit.GetAbsOrigin(),
                            playerHero,
                            0,
                            true
                        );
                        return true;
                    }
                    return false;
                }, 0.1),

                tg.completeOnCheck((ctx) => {
                    const unit = ctx["giant_1"] as CDOTA_BaseNPC;
                    if (!unit || unit.IsNull() || !unit.IsAlive()) {
                        DropNeutralItemAtPositionForHero(
                            dropInStashItemName,
                            unit.GetAbsOrigin(),
                            playerHero,
                            0,
                            true
                        );
                        return true;
                    }
                    return false;
                }, 0.1),

                tg.completeOnCheck((ctx) => {
                    const unit = ctx["giant_2"] as CDOTA_BaseNPC;
                    if (!unit || unit.IsNull() || !unit.IsAlive()) {
                        return true;
                    }
                    return false;
                }, 0.1),
            ]),
            tg.immediate((context) => {
                context[NeutralGoalKeys.KillNeutralsWolves] =
                    GoalState.Completed;
            }),
        ];
    };

    const pickupItems = () => {
        // Tell the player to pick up both items
        return [
            tg.immediate((context) => {
                movedToStash = false;
                context[NeutralGoalKeys.PickupItems] = GoalState.Started;
            }),
            tg.completeOnCheck(() => {
                return playerHero.HasItemInInventory(keepItemName);
            }, 0.1),
            tg.completeOnCheck(() => {
                return playerHero.HasItemInInventory(dropInStashItemName);
            }, 0.1),
            tg.immediate((context) => {
                context[NeutralGoalKeys.PickupItems] = GoalState.Completed;
            }),
        ];
    };

    const switchItems = () => {
        // Tell the player how to switch items, make sure the possesed mask is in the right slot.
        return [
            tg.immediate((context) => {
                context[NeutralGoalKeys.SwitchItems] = GoalState.Started;
            }),
            tg.completeOnCheck(() => {
                let item = playerHero.GetItemInSlot(InventorySlot.NEUTRAL_SLOT);
                return item != null && item.GetAbilityName() == keepItemName;
            }, 0.1),
            tg.immediate((context) => {
                context[NeutralGoalKeys.SwitchItems] = GoalState.Completed;
            }),
        ];
    };

    const shareItem = () => {
        return [
            tg.immediate((context) => {
                context[NeutralGoalKeys.ShareItem] = GoalState.Started;
            }),
            tg.spawnUnit(
                "npc_dota_hero_warlock",
                markerLocation,
                playerHero.GetTeam(),
                "warlock"
            ),

            tg.completeOnCheck((ctx) => {
                let warlock = ctx["warlock"] as CDOTA_BaseNPC_Hero;
                return warlock.HasItemInInventory(giveAwayItemName);
            }, 0.1),
            tg.immediate((context) => {
                context[NeutralGoalKeys.ShareItem] = GoalState.Completed;
            }),
        ];
    };

    const stashItem = () => {
        return [
            tg.immediate((context) => {
                context[NeutralGoalKeys.StashItem] = GoalState.Started;
            }),
            tg.completeOnCheck(() => {
                return movedToStash;
            }, 0.1),
            tg.immediate((context) => {
                context[NeutralGoalKeys.StashItem] = GoalState.Completed;
            }),
        ];
    };

    graph = tg.forkAny([
        tg.trackGoals(getGoals),
        tg.seq([
            ...goToCamp(),
            ...upgradeAbility_1(),
            ...spawnAndKillSatyrs(),
            tg.fork([...upgradeAbility_2(), ...pickUpArcaneRing()]),
            ...useArcaneRing(),
            ...moveOutOfNeutralBox(),
            tg.fork([...spawnAndKillWolves(), ...pickupItems()]),
            tg.fork([...switchItems(), ...shareItem(), ...stashItem()]),
        ]),
    ]);

    graph.start(GameRules.Addon.context, () => {
        print("Completed", "Section CH3 Opening");
        complete();
    });
};

const onSkipTo = () => {
    print("Skipping to", "Section CH3 Opening");
    if (!getPlayerHero()) error("Could not find the player's hero.");
};

const onStop = () => {
    print("Stopping", "Section Opening");

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
};

export const sectionChapter3Opening = new tut.FunctionalSection(
    SectionName.Chapter3_Opening,
    onStart,
    onSkipTo,
    onStop,
    Chapter3OrderFilter
);

// Certain order will need to be filtered, if the player sabotages themselves they will get stuck
export function Chapter3OrderFilter(event: ExecuteOrderFilterEvent): boolean {
    const giveAwayItemName = "item_arcane_ring";
    const dropInStashItemName = "item_mysterious_hat";
    const keepItemName = "item_possessed_mask";

    const unitIndex = event.units["0"];
    if (!unitIndex) {
        return true;
    }
    const unit = EntIndexToHScript(unitIndex) as CDOTA_BaseNPC;

    if (event.order_type == UnitOrder.DROP_ITEM) {
        // Tell the player that dropping items is not a good idea
        return false;
    }

    const itemIndex = event.entindex_ability;
    if (!itemIndex) {
        return true;
    }
    const item = EntIndexToHScript(itemIndex) as CDOTA_Item;

    if (event.order_type == UnitOrder.GIVE_ITEM) {
        if (item.GetAbilityName() == giveAwayItemName) {
            return true;
        } else if (item.GetAbilityName() == keepItemName) {
            // Warn the player that they are giving away the wrong item, you want to keep that!
            return false;
        } else if (item.GetAbilityName() == dropInStashItemName) {
            // Warn the player that they are giving away the wrong item, warlock doesnt want that item right now
            return false;
        }
    }

    if (event.order_type == UnitOrder.DROP_ITEM_AT_FOUNTAIN) {
        if (item.GetAbilityName() == dropInStashItemName) {
            movedToStash = true;
            return true;
        } else if (item.GetAbilityName() == keepItemName) {
            // Warn the player that they are dropping the wrong item, you want to keep that!
            return false;
        } else if (item.GetAbilityName() == dropInStashItemName) {
            // Warn the player that they are dropping  the wrong item, warlock wants it.
            return false;
        }
    }

    return true;
}
