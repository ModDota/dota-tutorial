import { GoalTracker } from "../../Goals";
import { modifier_dk_attack_tower_chapter2 } from "../../modifiers/modifier_dk_attack_tower_chapter2";
import { modifier_dk_death_chapter2_tower } from "../../modifiers/modifier_dk_death_chapter2_tower";
import { modifier_nodamage_chapter2_tower } from "../../modifiers/modifier_nodamage_chapter2_tower";
import { getSoundDuration } from "../../Sounds";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { displayDotaErrorMessage, findRealPlayerID, freezePlayerHero, getOrError, getPathToHighlightAbility, getPathToHighlightUpgradeAbility, getPlayerCameraLocation, getPlayerHero, highlightUiElement, removeContextEntityIfExists, removeHighlight, setRespawnSettings, setUnitPacifist } from "../../util";
import { chapter2Blockades, Chapter2SpecificKeys, radiantCreepsNames, TowerHitSources } from "./shared";

const sectionName: SectionName = SectionName.Chapter2_Tower
let graph: tg.TutorialStep | undefined = undefined
let ignorePlayerOrders = false
let playerMustOrderTrainUltimate = false;
let playerMustOrderTrainAbilities = false;
let playerMustOrderGlyph = false
let hasPlayerOrderedGlyphWhenMust = false
let playerOrderMustCastUltimate = false
let radiantCreepTimer: string | undefined;

// Calculate how long you should be dead while Slacks and Sunsfan explain death
const deathConversations = [LocalizationKey.Script_2_Tower_3, LocalizationKey.Script_2_Tower_4, LocalizationKey.Script_2_Tower_5, LocalizationKey.Script_2_Tower_6]
const deathDuration = deathConversations.map(getSoundDuration).reduce((accumulator, current) => accumulator + current + 0.5, 0)

const requiredState: RequiredState = {
    heroLocation: Vector(-6130, 4860, 128),
    heroLocationTolerance: 800,
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroAbilityMinLevels: [1, 1, 1, 0],
    heroLevel: 3,
    blockades: [
        chapter2Blockades.topToRiverStairs,
        chapter2Blockades.secretShopToRiverStairs,
        chapter2Blockades.radiantJungleStairs,
        chapter2Blockades.radiantBaseT2Divider,
        chapter2Blockades.radiantBaseMid,
        chapter2Blockades.radiantBaseBottom,
        chapter2Blockades.direTopDividerRiver,
        chapter2Blockades.direTopDividerCliff
    ],
    centerCameraOnHero: true,
}

// UI Highlighting Paths
const glyphUIPath = "HUDElements/minimap_container/GlyphScanContainer/glyph/NormalRoot/GlyphButton"
const respawnTimerPaths = [
    "HUDElements/topbar/TopBarRadiantTeamContainer/TopBarRadiantTeam/RadiantTeamScorePlayers/TopBarRadiantPlayersContainer/RadiantPlayer0/RespawnContainer/RespawnTimer/RespawnTimerLabel",
    "HUDElements/lower_hud/center_with_stats/center_block/PortraitGroup/PortraitContainer",
]

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

    const elderDragonFormAbility = "dragon_knight_elder_dragon_form"
    const elderDragonFormHighlightAbilityPath = getPathToHighlightAbility(3);

    const items: CDOTA_Item[] = []

    // Get the Dire T1 tower
    const direTopTower = getOrError(getDireTopTower());
    const direTopTowerNoDamageModifier = direTopTower.AddNewModifier(undefined, undefined, modifier_nodamage_chapter2_tower.name, {}) as modifier_nodamage_chapter2_tower
    direTopTowerNoDamageModifier.hitSources = TowerHitSources.NONE

    const goalTracker = new GoalTracker()
    const goalAttemptToAttackTower = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_1)
    const goalwaitToRespawn = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_2)
    const goalGetBackToTopTowerPosition = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_3)
    const goalHoldAltToSeeTowerRadius = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_4)
    const goalSneakThroughTower = goalTracker.addNumeric(LocalizationKey.Goal_2_Tower_5, 4)
    const goalSneakBackAgain = goalTracker.addNumeric(LocalizationKey.Goal_2_Tower_6, 4)
    const goalAttackTowerWeak = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_7)
    const goalTrainUltimate = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_8)
    const goalTrainAbilities = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_9)
    const goalUseUltimate = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_10)
    const goalAttackTowerStrong = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_11)
    const goalUseGlyph = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_12)
    const goalDestroyTower = goalTracker.addBoolean(LocalizationKey.Goal_2_Tower_13)

    let radiantCreeps: CDOTA_BaseNPC[] = []

    graph = tg.withGoals(context => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(context => {
                playerMustOrderTrainUltimate = false;
                playerMustOrderTrainAbilities = false;
                playerMustOrderGlyph = false
                hasPlayerOrderedGlyphWhenMust = false
                playerOrderMustCastUltimate = false

                // Find and kill all living lane creeps from the previous section
                removeContextEntityIfExists(context, Chapter2SpecificKeys.RadiantCreeps)
                removeContextEntityIfExists(context, Chapter2SpecificKeys.DireCreeps)
            }),
            tg.audioDialog(LocalizationKey.Script_2_Tower_1, LocalizationKey.Script_2_Tower_1, context => context[CustomNpcKeys.SlacksMudGolem]),

            // Fork dialogue ordering attack on tower
            tg.forkAny([
                tg.fork([
                    tg.audioDialog(LocalizationKey.Script_2_Tower_2, LocalizationKey.Script_2_Tower_2, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.seq([
                        tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => direTopTower.GetAbsOrigin(), 2),
                        tg.wait(1),
                        tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), 2),
                    ]),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.immediate(() => {
                        setRespawnSettings(Vector(-6700, -6700, 384), deathDuration)
                        goalAttemptToAttackTower.start()
                        playerHero.AddNewModifier(playerHero, undefined, modifier_dk_death_chapter2_tower.name, {});
                    }),
                    tg.withHighlights(tg.completeOnCheck(() => {
                        const modifier = playerHero.FindModifierByName(modifier_dk_death_chapter2_tower.name) as modifier_dk_death_chapter2_tower
                        if (!modifier) error("Dragon Knight death modifier does not exist")
                        return modifier.dkDiedToTower
                    }, 0.5), _ => ({
                        type: "arrow_enemy",
                        units: [direTopTower],
                        attach: true
                    })),
                ]),
            ]),
            tg.immediate(() => {
                goalAttemptToAttackTower.complete()
                goalwaitToRespawn.start()
                freezePlayerHero(true)
                respawnTimerPaths.forEach(path => highlightUiElement(path))
            }),

            tg.audioDialog(LocalizationKey.Script_2_Tower_3, LocalizationKey.Script_2_Tower_3, context => context[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_2_Tower_4, LocalizationKey.Script_2_Tower_4, context => context[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_2_Tower_5, LocalizationKey.Script_2_Tower_5, context => context[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_2_Tower_6, LocalizationKey.Script_2_Tower_6, context => context[CustomNpcKeys.SunsFanMudGolem]),
            tg.immediate(() => {
                if (!playerHero.IsAlive()) playerHero.RespawnHero(false, false)
                respawnTimerPaths.forEach(removeHighlight)
            }),
            tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => fountainLocation, 1.5),
            tg.completeOnCheck(() => {
                const modifier = playerHero.FindModifierByName(modifier_dk_death_chapter2_tower.name) as modifier_dk_death_chapter2_tower
                if (!modifier) error("The modifier does not exist")
                return modifier.dkRespawned
            }, 0.5),
            tg.immediate(() => {
                goalwaitToRespawn.complete()
                setRespawnSettings(Vector(-6130, 4860, 128), 5)
            }),
            tg.audioDialog(LocalizationKey.Script_2_Tower_7, LocalizationKey.Script_2_Tower_7, context => context[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(() => {
                playerHero.RemoveModifierByName(modifier_dk_death_chapter2_tower.name)
                goalGetBackToTopTowerPosition.start()
                playerHero.SetAbsOrigin(teleportAfterRespawnLocation)
                freezePlayerHero(false)
            }),
            tg.panCameraExponential(_ => fountainLocation, _ => playerHero.GetAbsOrigin(), 1.5),
            tg.goToLocation(moveAfterTeleportCloseToTowerLocation, _ => []),
            tg.immediate(() => {
                goalGetBackToTopTowerPosition.complete()
                playerHero.Stop()
                freezePlayerHero(true)
            }),

            // Fork alt btn dialogue
            tg.forkAny([
                tg.seq([
                    tg.setCameraTarget(playerHero),
                    tg.audioDialog(LocalizationKey.Script_2_Tower_8, LocalizationKey.Script_2_Tower_8, context => context[CustomNpcKeys.SlacksMudGolem]),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.immediate(() => goalHoldAltToSeeTowerRadius.start()),
                    tg.waitForModifierKey(ModifierKey.Alt),
                ])
            ]),
            tg.immediate(() => {
                goalHoldAltToSeeTowerRadius.complete()
                radiantCreeps = createRadiantLaneCreeps();
            }),

            tg.wait(1),
            tg.setCameraTarget(_ => radiantCreeps[0]),

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
                    tg.wait(2),
                    tg.audioDialog(LocalizationKey.Script_2_Tower_9, LocalizationKey.Script_2_Tower_9, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), 2),
                    tg.immediate(() => {
                        goalSneakThroughTower.start()
                        freezePlayerHero(false)
                    }),

                    tg.goToLocation(firstTowerSneakLocation, _ => []),
                    tg.immediate(() => goalSneakThroughTower.setValue(1)),
                    tg.goToLocation(secondTowerSneakLocation, _ => []),
                    tg.immediate(() => goalSneakThroughTower.setValue(2)),
                    tg.goToLocation(thirdTowerSneakLocation, _ => []),
                    tg.immediate(() => goalSneakThroughTower.setValue(3)),
                    tg.goToLocation(finalTowerSneakLocation, _ => []),
                    tg.immediate(() => {
                        goalSneakThroughTower.setValue(4)
                        goalSneakThroughTower.complete()
                    }),

                    // Fork movement back from behind tower to initial position dialogue
                    tg.forkAny([
                        tg.seq([
                            tg.audioDialog(LocalizationKey.Script_2_Tower_10, LocalizationKey.Script_2_Tower_10, context => context[CustomNpcKeys.SunsFanMudGolem]),
                            tg.neverComplete()
                        ]),
                        tg.seq([
                            tg.immediate(() => {
                                goalSneakBackAgain.start()
                            }),
                            tg.goToLocation(thirdTowerSneakLocation, _ => []),
                            tg.immediate(() => goalSneakBackAgain.setValue(1)),
                            tg.goToLocation(secondTowerSneakLocation, _ => []),
                            tg.immediate(() => goalSneakBackAgain.setValue(2)),
                            tg.goToLocation(firstTowerSneakLocation, _ => []),
                            tg.immediate(() => goalSneakBackAgain.setValue(3)),
                            tg.goToLocation(moveAfterTeleportCloseToTowerLocation, []),
                        ]),
                    ]),

                    tg.immediate(() => {
                        goalSneakBackAgain.setValue(4)
                        goalSneakBackAgain.complete()
                    }),

                    // Fork retry attack on tower dialogue
                    tg.forkAny([
                        tg.seq([
                            tg.audioDialog(LocalizationKey.Script_2_Tower_11, LocalizationKey.Script_2_Tower_11, context => context[CustomNpcKeys.SunsFanMudGolem]),
                            tg.neverComplete()
                        ]),
                        tg.seq([
                            tg.immediate(() => {
                                goalAttackTowerWeak.start()
                                playerHero.AddNewModifier(playerHero, undefined, modifier_dk_attack_tower_chapter2.name, {})
                                direTopTowerNoDamageModifier.hitSources = TowerHitSources.DK_ONLY
                            }),
                            tg.withHighlights(tg.completeOnCheck(() => {
                                const modifier = playerHero.FindModifierByName(modifier_dk_attack_tower_chapter2.name) as modifier_dk_attack_tower_chapter2
                                if (!modifier) error("Could not find the modifier for attacking the tower")
                                return modifier.dkAttackedTower
                            }, 0.5), _ => ({
                                type: "arrow_enemy",
                                attach: true,
                                units: [direTopTower]
                            })),
                        ])
                    ]),
                    tg.immediate(() => {
                        goalAttackTowerWeak.complete()
                        direTopTowerNoDamageModifier.hitSources = TowerHitSources.NONE
                        setUnitPacifist(playerHero, true)
                        ExecuteOrderFromTable({
                            OrderType: dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_TO_POSITION,
                            Position: moveAfterTeleportCloseToTowerLocation,
                            UnitIndex: playerHero.entindex()
                        })
                        ignorePlayerOrders = true
                    }),

                    // Fork upgrade abilities dialogue
                    tg.forkAny([
                        tg.seq([
                            tg.audioDialog(LocalizationKey.Script_2_Tower_12, LocalizationKey.Script_2_Tower_12, context => context[CustomNpcKeys.SunsFanMudGolem]),
                            tg.neverComplete()
                        ]),
                        tg.seq([
                            tg.immediate(() => {
                                const currentHeroLevel = playerHero.GetLevel()
                                const ultimateLevel = 6
                                const levelsToGrant = ultimateLevel - currentHeroLevel
                                playerHero.AddExperience(levelsToGrant, EDOTA_ModifyXP_Reason.DOTA_ModifyXP_Unspecified, false, true)
                                const dragonFormAbilityHandle = playerHero.FindAbilityByName(elderDragonFormAbility)
                                if (!dragonFormAbilityHandle) error("Could not find the Elder Dragon Form ability")
                                highlightUiElement(getPathToHighlightUpgradeAbility(3), undefined, HighlightMouseButton.Left)
                                ignorePlayerOrders = false
                                playerMustOrderTrainUltimate = true
                                playerMustOrderTrainAbilities = true
                                goalTrainUltimate.start()
                            }),
                            tg.immediate(() => {
                                items.push(playerHero.AddItemByName("item_heart"))
                                items.push(playerHero.AddItemByName("item_power_treads"))
                                items.push(playerHero.AddItemByName("item_rapier"))
                                items.push(playerHero.AddItemByName("item_desolator"))
                                items.push(playerHero.AddItemByName("item_moon_shard"))
                            }),
                            tg.completeOnCheck(() => {
                                const dragonFormAbilityHandle = playerHero.FindAbilityByName(elderDragonFormAbility)
                                if (!dragonFormAbilityHandle) error("Could not find the Elder Dragon Form ability")
                                if (dragonFormAbilityHandle.GetLevel() > 0) {
                                    removeHighlight(getPathToHighlightUpgradeAbility(3))
                                    playerMustOrderTrainUltimate = false
                                    return true
                                }
                                return false
                            }, 0.2),
                            tg.immediate(() => {
                                goalTrainUltimate.complete()
                                goalTrainAbilities.start()
                                highlightUiElement(getPathToHighlightUpgradeAbility(0), undefined, HighlightMouseButton.Left)
                                highlightUiElement(getPathToHighlightUpgradeAbility(1))
                                highlightUiElement(getPathToHighlightUpgradeAbility(2))
                            }),
                            tg.completeOnCheck(() => {
                                if (playerHero.GetAbilityPoints() === 0) {
                                    playerMustOrderTrainAbilities = false
                                    return true
                                }

                                return false
                            }, 0.2),
                        ])
                    ]),
                    tg.immediate(() => {
                        goalTrainAbilities.complete()
                        removeHighlight(getPathToHighlightUpgradeAbility(0))
                        removeHighlight(getPathToHighlightUpgradeAbility(1))
                        removeHighlight(getPathToHighlightUpgradeAbility(2))
                    }),

                    // Fork use ulti dialogue
                    tg.forkAny([
                        tg.seq([
                            tg.audioDialog(LocalizationKey.Script_2_Tower_13, LocalizationKey.Script_2_Tower_13, context => context[CustomNpcKeys.SlacksMudGolem]),
                            tg.audioDialog(LocalizationKey.Script_2_Tower_14, LocalizationKey.Script_2_Tower_14, context => context[CustomNpcKeys.SunsFanMudGolem]),
                            tg.neverComplete()
                        ]),
                        tg.seq([
                            tg.immediate(() => {
                                goalUseUltimate.start()
                                highlightUiElement(elderDragonFormHighlightAbilityPath, undefined, HighlightMouseButton.Left)
                                playerOrderMustCastUltimate = true
                            }),
                            tg.completeOnCheck(() => {
                                return playerHero.HasModifier("modifier_dragon_knight_dragon_form")
                            }, 0.2),
                        ])
                    ]),
                    tg.immediate(() => {
                        goalUseUltimate.complete()
                        removeHighlight(elderDragonFormHighlightAbilityPath)
                        setUnitPacifist(playerHero, false)
                        playerOrderMustCastUltimate = false
                        const modifier = playerHero.FindModifierByName(modifier_dk_attack_tower_chapter2.name) as modifier_dk_attack_tower_chapter2
                        if (!modifier) error("Could not find Dragon Knight's tower attack modifier")
                        modifier.dkCanAttackTowerAgainBeforeGlyph = true
                        direTopTowerNoDamageModifier.hitSources = TowerHitSources.DK_ONLY
                    }),

                    // No fork since it's pretty short dialogue
                    tg.audioDialog(LocalizationKey.Script_2_Tower_15, LocalizationKey.Script_2_Tower_15, context => context[CustomNpcKeys.SlacksMudGolem]),
                    tg.immediate(() => {
                        goalAttackTowerStrong.start()
                    }),
                    tg.withHighlights(tg.completeOnCheck(() => {
                        const modifier = playerHero.FindModifierByName(modifier_dk_attack_tower_chapter2.name) as modifier_dk_attack_tower_chapter2
                        if (!modifier) error("Could not find Dragon Knight's tower attack modifier")
                        return modifier.dkAttackedTowerAgainBeforeGlyph
                    }, 0.1),
                        _ =>
                        ({
                            type: "arrow_enemy",
                            attach: true,
                            units: [direTopTower]
                        })
                    ),
                    tg.immediate(() => {
                        goalAttackTowerStrong.complete()
                        ExecuteOrderFromTable(
                            {
                                OrderType: dotaunitorder_t.DOTA_UNIT_ORDER_GLYPH,
                                UnitIndex: direTopTower.entindex(),
                            })
                    }),
                    tg.wait(1),
                    tg.immediate(_ => setUnitPacifist(playerHero, true)),

                    // Seemed confusing to fork since glyph icon is only mentioned at the end of the dialogue, so keep as is
                    tg.audioDialog(LocalizationKey.Script_2_Tower_16, LocalizationKey.Script_2_Tower_16, context => context[CustomNpcKeys.SlacksMudGolem]),
                    tg.immediate(() => {
                        goalUseGlyph.start()
                        highlightUiElement(glyphUIPath, undefined, HighlightMouseButton.Left)
                        playerMustOrderGlyph = true
                        direTopTowerNoDamageModifier.hitSources = TowerHitSources.NONE
                    }),
                    tg.completeOnCheck(() => {
                        return hasPlayerOrderedGlyphWhenMust
                    }, 0.1),
                    tg.immediate(() => {
                        goalUseGlyph.complete()
                        removeHighlight(glyphUIPath)
                        setUnitPacifist(playerHero, false)
                        for (const radiantCreep of radiantCreeps) {
                            radiantCreep.AddNewModifier(undefined, undefined, "modifier_fountain_glyph", { duration: 7 })
                        }
                    }),

                    // Fork destroy tower dialogue
                    tg.forkAny([
                        tg.seq([
                            tg.audioDialog(LocalizationKey.Script_2_Tower_17, LocalizationKey.Script_2_Tower_17, context => context[CustomNpcKeys.SunsFanMudGolem]),
                            tg.neverComplete()
                        ]),
                        tg.seq([
                            tg.immediate(() => {
                                goalDestroyTower.start()
                                direTopTowerNoDamageModifier.hitSources = TowerHitSources.ALL
                            }),
                            tg.withHighlights(tg.completeOnCheck(() => {
                                return !IsValidEntity(direTopTower) || !direTopTower.IsAlive()
                            }, 0.1),
                                _ => ({
                                    type: "arrow_enemy",
                                    attach: true,
                                    units: [direTopTower]
                                })
                            ),
                        ])
                    ]),
                    tg.immediate(() => {
                        goalDestroyTower.complete()
                        for (const item of items) {
                            playerHero.RemoveItem(item);
                        }
                        playerHero.RemoveModifierByName(modifier_dk_attack_tower_chapter2.name)
                    }),

                    tg.audioDialog(LocalizationKey.Script_2_Tower_18, LocalizationKey.Script_2_Tower_18, context => context[CustomNpcKeys.SlacksMudGolem]),
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

    for (let index = 0; index <= 3; index++) {
        removeHighlight(getPathToHighlightUpgradeAbility(index))
    }

    removeHighlight(getPathToHighlightAbility(3))

    removeHighlight(glyphUIPath);
    respawnTimerPaths.forEach(removeHighlight)
    const context = GameRules.Addon.context
    removeContextEntityIfExists(context, Chapter2SpecificKeys.RadiantCreeps)

    const direTopTower = getDireTopTower()
    if (direTopTower) {
        direTopTower.RemoveModifierByName(modifier_nodamage_chapter2_tower.name)
    }

    const playerHero = getPlayerHero()
    if (playerHero) {
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

export const sectionTower = new tut.FunctionalSection(
    SectionName.Chapter2_Tower,
    requiredState,
    onStart,
    onStop,
    chapter2TowerOrderFilter
);

export function chapter2TowerOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (playerMustOrderTrainUltimate && event.order_type != dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_TO_POSITION) {
        if (event.order_type != dotaunitorder_t.DOTA_UNIT_ORDER_TRAIN_ABILITY) {
            displayDotaErrorMessage(LocalizationKey.Error_Tower_1)
            return false
        }

        if (event.entindex_ability) {
            const ability = EntIndexToHScript(event.entindex_ability)
            if (ability) {
                if (ability.GetName() === "dragon_knight_elder_dragon_form") return true
                else {
                    displayDotaErrorMessage(LocalizationKey.Error_Tower_1)
                    return false
                }
            }
        }
    }

    if (playerMustOrderTrainAbilities) {
        if (event.order_type != dotaunitorder_t.DOTA_UNIT_ORDER_TRAIN_ABILITY && event.order_type != dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_TO_POSITION) {
            displayDotaErrorMessage(LocalizationKey.Error_Tower_2)
            return false
        }
        return true
    }

    if (playerMustOrderGlyph) {
        if (event.order_type != dotaunitorder_t.DOTA_UNIT_ORDER_GLYPH && event.order_type != dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_TO_POSITION) {
            displayDotaErrorMessage(LocalizationKey.Error_Tower_3)
            return false
        }

        if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_GLYPH) {
            playerMustOrderGlyph = false
            hasPlayerOrderedGlyphWhenMust = true
        }

        return true
    }

    if (playerOrderMustCastUltimate) {
        if (event.order_type != dotaunitorder_t.DOTA_UNIT_ORDER_CAST_NO_TARGET && event.order_type != dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_TO_POSITION) {
            displayDotaErrorMessage(LocalizationKey.Error_Tower_4)
            return false
        }
    }

    if (ignorePlayerOrders) return false;

    return true;
}

function getDireTopTower(): CDOTA_BaseNPC_Building | undefined {
    const direTopTowerLocation = Vector(-4672, 6016, 128)

    let direTop = Entities.FindByClassnameNearest("npc_dota_tower", direTopTowerLocation, 200) as CDOTA_BaseNPC_Building
    return direTop
}

function createRadiantLaneCreeps(): CDOTA_BaseNPC[] {
    const radiantCreepsSpawnLocation = Vector(-6145, 4830, 128)

    const radiantCreepsArray = [];

    for (const creepName of radiantCreepsNames) {
        const creep = CreateUnitByName(creepName, radiantCreepsSpawnLocation, true, undefined, undefined, DOTATeam_t.DOTA_TEAM_GOODGUYS)
        radiantCreepsArray.push(creep);

        Timers.CreateTimer(0.1, () => SendCreepToKillTower(creep))

    }
    GameRules.Addon.context[Chapter2SpecificKeys.RadiantCreeps] = radiantCreepsArray
    return radiantCreepsArray;
}

function SendCreepToKillTower(unit: CDOTA_BaseNPC) {

    const direTower = getOrError(getDireTopTower());

    ExecuteOrderFromTable({
        OrderType: dotaunitorder_t.DOTA_UNIT_ORDER_ATTACK_TARGET,
        TargetIndex: direTower.entindex(),
        UnitIndex: unit.entindex()
    })
}
