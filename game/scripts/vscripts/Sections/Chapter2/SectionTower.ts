import { GoalTracker } from "../../Goals";
import { modifier_dk_attack_tower_chapter2 } from "../../modifiers/modifier_dk_attack_tower_chapter2";
import { modifier_dk_death_chapter2_tower } from "../../modifiers/modifier_dk_death_chapter2_tower";
import { modifier_nodamage_chapter2_tower } from "../../modifiers/modifier_nodamage_chapter2_tower";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { displayDotaErrorMessage, findRealPlayerID, getPlayerHero, removeContextEntityIfExists, setUnitPacifist } from "../../util";
import { chapter2Blockades, Chapter2SpecificKeys, radiantCreepsNames } from "./shared";

const sectionName: SectionName = SectionName.Chapter2_Tower
let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = true;
let playerMustOrderTrainUltimate = false;
let playerMustOrderTrainAbilities = false;
let playerMustOrderGlyph = false
let hasPlayerOrderedGlyphWhenMust = false
let playerOrderMustCastUltimate = false
let radiantCreepTimer: string | undefined;

const requiredState: RequiredState = {
    heroLocation: Vector(-6130, 4860, 128),
    heroLocationTolerance: 800,
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5906, -3892, 256),
    sunsFanLocation: Vector(-5500, -4170, 256),
    heroAbilityMinLevels: [1, 1, 1, 0],
    heroLevel: 3,
    blockades:
        [
            chapter2Blockades.topToRiverStairs,
            chapter2Blockades.secretShopToRiverStairs,
            chapter2Blockades.radiantJungleStairs,
            chapter2Blockades.radiantBaseT2Divider,
            chapter2Blockades.radiantBaseMid,
            chapter2Blockades.radiantBaseBottom,
            chapter2Blockades.direTopDividerRiver,
            chapter2Blockades.direTopDividerCliff
        ]
}

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const teleportAfterRespawnLocation = Vector(-6166, 4926, 128)
    const moveAfterTeleportCloseToTowerLocation = Vector(-5797, 5493, 128)
    const fountainLocation = Vector(-6700, -6700, 384)
    const firstTowerSneakLocation = Vector(-5048, 5767, 128)
    const secondTowerSneakLocation = Vector(-4678, 5777, 128)
    const thirdTowerSneakLocation = Vector(-3975, 5887, 128)
    const finalTowerSneakLocation = Vector(-3353, 6014, 128)

    const items: CDOTA_Item[] = []

    // Get or create the Dire T1 tower
    const direTopTower = getDireTopTower();

    const goalTracker = new GoalTracker()
    const goalAttemptToAttackTower = goalTracker.addBoolean("Attack the enemy's top tower.")
    const goalwaitToRespawn = goalTracker.addBoolean("Wait to respawn.")
    const goalGetBackToTopTowerPosition = goalTracker.addBoolean("Move to position close to the tower.")
    const goalHoldAltToSeeTowerRadius = goalTracker.addBoolean("Hold the Alt key to see the tower's radius.")
    const goalSneakThroughTower = goalTracker.addNumeric("Follow through the points shown", 4)
    const goalSneakBackAgain = goalTracker.addNumeric("Follow points to your starting position", 4)
    const goalAttackTowerWeak = goalTracker.addBoolean("Attack the enemy's top tower.")
    const goalTrainUltimate = goalTracker.addBoolean("Train your ultimate ability.")
    const goalTrainAbilities = goalTracker.addBoolean("Spend remaining ability points on the rest of your abilities.")
    const goalUseUltimate = goalTracker.addBoolean("Use your ultimate ability.")
    const goalAttackTowerStrong = goalTracker.addBoolean("Attack the enemy's top tower.")
    const goalUseGlyph = goalTracker.addBoolean("Use your own Glyph.")
    const goalDestroyTower = goalTracker.addBoolean("Destroy the enemy's top tower.")

    let radiantCreeps: CDOTA_BaseNPC[] = []

    graph = tg.withGoals(context => goalTracker.getGoals(),
        tg.seq([
            tg.setCameraTarget(playerHero),
            tg.wait(FrameTime()),
            tg.setCameraTarget(undefined),
            tg.immediate(context => {
                canPlayerIssueOrders = false;
                playerMustOrderTrainUltimate = false;
                playerMustOrderTrainAbilities = false;
                playerMustOrderGlyph = false
                hasPlayerOrderedGlyphWhenMust = false
                playerOrderMustCastUltimate = false

                // Find and kill all living lane creeps from the previous section
                removeContextEntityIfExists(context, Chapter2SpecificKeys.RadiantCreeps)
                removeContextEntityIfExists(context, Chapter2SpecificKeys.DireCreeps)
            }),
            tg.textDialog(LocalizationKey.Script_2_Tower_1, context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_2_Tower_2, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.immediate(() => {
                canPlayerIssueOrders = true
                goalAttemptToAttackTower.start()
                playerHero.AddNewModifier(playerHero, undefined, modifier_dk_death_chapter2_tower.name, {});
                direTopTower.AddNewModifier(undefined, undefined, modifier_nodamage_chapter2_tower.name, {})
            }),
            tg.completeOnCheck(() => {
                const modifier = playerHero.FindModifierByName(modifier_dk_death_chapter2_tower.name) as modifier_dk_death_chapter2_tower
                if (!modifier) error("Dragon Knight death modifier does not exists")
                return modifier.dkDiedToTower
            }, 0.5),
            tg.immediate(() => {
                goalAttemptToAttackTower.complete()
                goalwaitToRespawn.start()
                canPlayerIssueOrders = false
            }),
            tg.textDialog(LocalizationKey.Script_2_Tower_3, context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_2_Tower_4, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_2_Tower_5, context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_2_Tower_6, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.completeOnCheck(() => {
                const modifier = playerHero.FindModifierByName(modifier_dk_death_chapter2_tower.name) as modifier_dk_death_chapter2_tower
                if (!modifier) error("The modifier does not exists")
                return modifier.dkRespawned
            }, 0.5),
            tg.immediate(() => goalwaitToRespawn.complete()),
            tg.textDialog(LocalizationKey.Script_2_Tower_7, context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.immediate(() => {
                playerHero.RemoveModifierByName(modifier_dk_death_chapter2_tower.name)
                goalGetBackToTopTowerPosition.start()
                playerHero.SetAbsOrigin(teleportAfterRespawnLocation)
                canPlayerIssueOrders = true
            }),
            tg.panCameraExponential(fountainLocation, teleportAfterRespawnLocation, 0.9),
            tg.goToLocation(moveAfterTeleportCloseToTowerLocation),
            tg.immediate(() => {
                goalGetBackToTopTowerPosition.complete()
                playerHero.Stop()
                canPlayerIssueOrders = false
            }),
            tg.textDialog(LocalizationKey.Script_2_Tower_8, context => context[CustomNpcKeys.SlacksMudGolem], 3),
            tg.immediate(() => goalHoldAltToSeeTowerRadius.start()),
            tg.waitForModifierKey(ModifierKey.Alt),
            tg.immediate(() => {
                goalHoldAltToSeeTowerRadius.complete()
                radiantCreeps = createRadiantLaneCreeps();
            }),
            tg.setCameraTarget(direTopTower),
            tg.forkAny([
                tg.seq([
                    tg.immediate(context => {
                        radiantCreepTimer = Timers.CreateTimer(() => {
                            radiantCreeps = radiantCreeps.filter(creep => IsValidEntity(creep) && creep.IsAlive())
                            context[Chapter2SpecificKeys.RadiantCreeps] = radiantCreeps

                            if (radiantCreeps.length === 0) {
                                radiantCreeps = createRadiantLaneCreeps()
                            }

                            return 0.5;
                        })
                    }),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.textDialog(LocalizationKey.Script_2_Tower_9, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
                    tg.setCameraTarget(undefined),
                    tg.immediate(() => {
                        goalSneakThroughTower.start()
                        canPlayerIssueOrders = true
                    }),

                    tg.goToLocation(firstTowerSneakLocation),
                    tg.immediate(() => goalSneakThroughTower.setValue(1)),
                    tg.goToLocation(secondTowerSneakLocation),
                    tg.immediate(() => goalSneakThroughTower.setValue(2)),
                    tg.goToLocation(thirdTowerSneakLocation),
                    tg.immediate(() => goalSneakThroughTower.setValue(3)),
                    tg.goToLocation(finalTowerSneakLocation),
                    tg.immediate(() => {
                        goalSneakThroughTower.setValue(4)
                        goalSneakThroughTower.complete()
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Tower_10, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
                    tg.immediate(() => goalSneakBackAgain.start()),
                    tg.goToLocation(thirdTowerSneakLocation),
                    tg.immediate(() => goalSneakBackAgain.setValue(1)),
                    tg.goToLocation(secondTowerSneakLocation),
                    tg.immediate(() => goalSneakBackAgain.setValue(2)),
                    tg.goToLocation(firstTowerSneakLocation),
                    tg.immediate(() => goalSneakBackAgain.setValue(3)),
                    tg.goToLocation(moveAfterTeleportCloseToTowerLocation),
                    tg.immediate(() => {
                        goalSneakBackAgain.setValue(4)
                        goalSneakBackAgain.complete()
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Tower_11, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
                    tg.immediate(() => {
                        goalAttackTowerWeak.start()
                        direTopTower.RemoveModifierByName(modifier_nodamage_chapter2_tower.name)
                        playerHero.AddNewModifier(playerHero, undefined, modifier_dk_attack_tower_chapter2.name, {})
                    }),
                    tg.completeOnCheck(() => {
                        const modifier = playerHero.FindModifierByName(modifier_dk_attack_tower_chapter2.name) as modifier_dk_attack_tower_chapter2
                        if (!modifier) error("Could not find the modifier for attacking the tower")
                        return modifier.dkAttackedTower
                    }, 0.5),
                    tg.immediate(() => {
                        goalAttackTowerWeak.complete()
                        setUnitPacifist(playerHero, true)
                        ExecuteOrderFromTable(
                            {
                                OrderType: UnitOrder.MOVE_TO_POSITION,
                                Position: moveAfterTeleportCloseToTowerLocation,
                                UnitIndex: playerHero.entindex()
                            })
                        canPlayerIssueOrders = false
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Tower_12, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
                    tg.immediate(() => {
                        const currentHeroLevel = playerHero.GetLevel()
                        const ultimateLevel = 6
                        const levelsToGrant = ultimateLevel - currentHeroLevel
                        playerHero.AddExperience(levelsToGrant, ModifyXpReason.UNSPECIFIED, false, true)
                        const dragonFormAbilityHandle = playerHero.FindAbilityByName("dragon_knight_elder_dragon_form")
                        if (!dragonFormAbilityHandle) error("Could not find the Elder Dragon Form ability")
                        dragonFormAbilityHandle.SetUpgradeRecommended(true)
                        canPlayerIssueOrders = true
                        playerMustOrderTrainUltimate = true
                        playerMustOrderTrainAbilities = true
                        goalTrainUltimate.start()
                        direTopTower.AddNewModifier(undefined, undefined, modifier_nodamage_chapter2_tower.name, {})
                    }),
                    tg.completeOnCheck(() => {
                        const dragonFormAbilityHandle = playerHero.FindAbilityByName("dragon_knight_elder_dragon_form")
                        if (!dragonFormAbilityHandle) error("Could not find the Elder Dragon Form ability")
                        if (dragonFormAbilityHandle.GetLevel() > 0) {
                            dragonFormAbilityHandle.SetUpgradeRecommended(false)
                            playerMustOrderTrainUltimate = false
                            return true
                        }
                        return false
                    }, 0.2),
                    tg.immediate(() => {
                        goalTrainUltimate.complete()
                        goalTrainAbilities.start()
                    }),
                    tg.completeOnCheck(() => {
                        if (playerHero.GetAbilityPoints() === 0) {
                            playerMustOrderTrainAbilities = false
                            return true
                        }

                        return false
                    }, 0.2),
                    tg.immediate(() => {
                        goalTrainAbilities.complete()
                        items.push(playerHero.AddItemByName("item_heart"))
                        items.push(playerHero.AddItemByName("item_power_treads"))
                        items.push(playerHero.AddItemByName("item_rapier"))
                        items.push(playerHero.AddItemByName("item_desolator"))
                        items.push(playerHero.AddItemByName("item_moon_shard"))
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Tower_13, context => context[CustomNpcKeys.SlacksMudGolem], 3),
                    tg.textDialog(LocalizationKey.Script_2_Tower_14, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
                    tg.immediate(() => {
                        goalUseUltimate.start()
                        playerOrderMustCastUltimate = true
                    }),
                    tg.completeOnCheck(() => {
                        return playerHero.HasModifier("modifier_dragon_knight_dragon_form")
                    }, 0.2),
                    tg.immediate(() => {
                        goalUseUltimate.complete()
                        setUnitPacifist(playerHero, false)
                        playerOrderMustCastUltimate = false
                        const modifier = playerHero.FindModifierByName(modifier_dk_attack_tower_chapter2.name) as modifier_dk_attack_tower_chapter2
                        if (!modifier) error("Could not find Dragon Knight's tower attack modifier")
                        modifier.dkCanAttackTowerAgainBeforeGlyph = true
                        direTopTower.RemoveModifierByName(modifier_nodamage_chapter2_tower.name)
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Tower_15, context => context[CustomNpcKeys.SlacksMudGolem], 3),
                    tg.immediate(() => {
                        goalAttackTowerStrong.start()
                    }),
                    tg.completeOnCheck(() => {
                        const modifier = playerHero.FindModifierByName(modifier_dk_attack_tower_chapter2.name) as modifier_dk_attack_tower_chapter2
                        if (!modifier) error("Could not find Dragon Knight's tower attack modifier")
                        return modifier.dkAttackedTowerAgainBeforeGlyph
                    }, 0.1),
                    tg.immediate(() => {
                        goalAttackTowerStrong.complete()
                        ExecuteOrderFromTable(
                            {
                                OrderType: UnitOrder.GLYPH,
                                UnitIndex: direTopTower.entindex(),
                            })

                        canPlayerIssueOrders = false
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Tower_16, context => context[CustomNpcKeys.SlacksMudGolem], 3),
                    tg.immediate(() => {
                        goalUseGlyph.start()
                        canPlayerIssueOrders = true
                        playerMustOrderGlyph = true
                        direTopTower.AddNewModifier(undefined, undefined, modifier_nodamage_chapter2_tower.name, {})
                    }),
                    tg.completeOnCheck(() => {
                        return hasPlayerOrderedGlyphWhenMust
                    }, 0.1),
                    tg.immediate(() => {
                        goalUseGlyph.complete()
                        direTopTower.RemoveModifierByName(modifier_nodamage_chapter2_tower.name)
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Tower_17, context => context[CustomNpcKeys.SunsFanMudGolem], 3),
                    tg.immediate(() => goalDestroyTower.start()),
                    tg.completeOnCheck(() => {
                        return !IsValidEntity(direTopTower) || !direTopTower.IsAlive()
                    }, 0.1),
                    tg.immediate(() => {
                        goalDestroyTower.complete()
                        for (const item of items) {
                            playerHero.RemoveItem(item);
                        }
                        playerHero.RemoveModifierByName("modifier_dragon_knight_dragon_form")
                        playerHero.RemoveModifierByName("modifier_dragon_knight_corrosive_breath")
                        playerHero.RemoveModifierByName(modifier_dk_attack_tower_chapter2.name)
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Tower_18, context => context[CustomNpcKeys.SlacksMudGolem], 3),
                    tg.immediate(() => {
                        if (radiantCreepTimer) Timers.RemoveTimer(radiantCreepTimer)
                        removeContextEntityIfExists(GameRules.Addon.context, Chapter2SpecificKeys.RadiantCreeps)
                    })
                ])
            ])
        ]))

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

const onStop = () => {
    print("Stopping", sectionName);

    const context = GameRules.Addon.context
    removeContextEntityIfExists(context, Chapter2SpecificKeys.RadiantCreeps)

    const direTopTower = getDireTopTower()
    if (direTopTower) {
        direTopTower.RemoveModifierByName(modifier_nodamage_chapter2_tower.name)
    }

    const playerHero = getPlayerHero()
    if (playerHero) {
        playerHero.RemoveModifierByName("modifier_dragon_knight_dragon_form")
        playerHero.RemoveModifierByName("modifier_dragon_knight_corrosive_breath")
        playerHero.RemoveModifierByName(modifier_dk_death_chapter2_tower.name)
        playerHero.RemoveModifierByName(modifier_dk_attack_tower_chapter2.name)
    }

    if (radiantCreepTimer) {
        Timers.RemoveTimer(radiantCreepTimer)
        radiantCreepTimer = undefined;
    }

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const SectionTower = new tut.FunctionalSection(
    SectionName.Chapter2_Tower,
    requiredState,
    onStart,
    onStop,
    chapter2TowerOrderFilter
);

export function chapter2TowerOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (!canPlayerIssueOrders) return false;

    if (playerMustOrderTrainUltimate) {
        if (event.order_type != UnitOrder.TRAIN_ABILITY) {
            displayDotaErrorMessage("Upgrade Elder Dragon Form to continue.")
            return false
        }

        if (event.entindex_ability) {
            const ability = EntIndexToHScript(event.entindex_ability)
            if (ability) {
                if (ability.GetName() === "dragon_knight_elder_dragon_form") return true
                else {
                    displayDotaErrorMessage("Upgrade Elder Dragon Form to continue.")
                    return false
                }
            }
        }
    }

    if (playerMustOrderTrainAbilities) {
        if (event.order_type != UnitOrder.TRAIN_ABILITY) {
            displayDotaErrorMessage("Upgrade the rest of your abilities to continue.")
            return false
        }
        return true
    }

    if (playerMustOrderGlyph) {
        if (event.order_type != UnitOrder.GLYPH) {
            displayDotaErrorMessage("Please use Glyph next to the minimap.")
            return false
        }

        playerMustOrderGlyph = false
        hasPlayerOrderedGlyphWhenMust = true
        return true
    }

    if (playerOrderMustCastUltimate) {
        if (event.order_type != UnitOrder.CAST_NO_TARGET) {
            displayDotaErrorMessage("Cast your Ultimate first!")
            return false
        }
    }

    return true;
}

function getDireTopTower(): CDOTA_BaseNPC_Building {
    const direTopTowerLocation = Vector(-4672, 6016, 128)

    let direTop = Entities.FindByClassnameNearest("npc_dota_tower", direTopTowerLocation, 200) as CDOTA_BaseNPC_Building
    if (!direTop || !IsValidEntity(direTop) || !direTop.IsAlive()) {
        print("Creating new tower")
        direTop = CreateUnitByName(CustomNpcKeys.DireTopT1Tower, direTopTowerLocation, false, undefined, undefined, DotaTeam.BADGUYS) as CDOTA_BaseNPC_Building
        direTop.AddNewModifier(undefined, undefined, "modifier_tower_truesight_aura", {})
        direTop.AddNewModifier(undefined, undefined, "modifier_tower_aura", {})
        direTop.RemoveModifierByName("modifier_invulnerable")
    }
    print("Tower name is", direTop.GetUnitName())

    return direTop
}

function createRadiantLaneCreeps(): CDOTA_BaseNPC[] {
    const radiantCreepsSpawnLocation = Vector(-6145, 4830, 128)

    const radiantCreepsArray = [];

    for (const creepName of radiantCreepsNames) {
        const creep = CreateUnitByName(creepName, radiantCreepsSpawnLocation, true, undefined, undefined, DotaTeam.GOODGUYS)
        radiantCreepsArray.push(creep);

        Timers.CreateTimer(0.1, () => SendCreepToKillTower(creep))

    }
    GameRules.Addon.context[Chapter2SpecificKeys.RadiantCreeps] = radiantCreepsArray
    return radiantCreepsArray;
}

function SendCreepToKillTower(unit: CDOTA_BaseNPC) {

    const direTower = getDireTopTower();

    ExecuteOrderFromTable({
        OrderType: UnitOrder.ATTACK_TARGET,
        TargetIndex: direTower.entindex(),
        UnitIndex: unit.entindex()
    })
}
