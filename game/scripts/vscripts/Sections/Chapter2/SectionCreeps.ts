import { GoalTracker } from "../../Goals";
import { modifier_dk_last_hit_chapter2_creeps } from "../../modifiers/modifier_dk_last_hit_chapter2_creeps";
import { modifier_sniper_deny_chapter2_creeps } from "../../modifiers/modifier_sniper_deny_chapter2_creeps";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import * as dg from "../../Dialog"
import { clearAttachedHighlightParticlesFromUnits, findRealPlayerID, getOrError, getPathToHighlightAbility, getPlayerCameraLocation, getPlayerHero, highlight, highlightUiElement, randomChoice, removeContextEntityIfExists, removeHighlight, setUnitPacifist } from "../../util";
import { Chapter2SpecificKeys, LastHitStages, radiantCreepsNames, direCreepNames, chapter2Blockades } from "./shared";
import { modifier_no_health_bar } from "../../modifiers/modifier_no_health_bar";

const sectionName: SectionName = SectionName.Chapter2_Creeps
let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    heroLocation: Vector(-6288, 3000, 128),
    heroLocationTolerance: 300,
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
}

let lastHitTimer: string | undefined;
const abilNameBreatheFire = "dragon_knight_breathe_fire"
let listenerID: EventListenerID | undefined = undefined;
let currentDialogToken: number | undefined = undefined;
let eventTimer: string | undefined = undefined;

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    let radiantCreeps: CDOTA_BaseNPC[] | undefined = GameRules.Addon.context[Chapter2SpecificKeys.RadiantCreeps];
    let direCreeps: CDOTA_BaseNPC[] | undefined = GameRules.Addon.context[Chapter2SpecificKeys.DireCreeps];
    let currentLastHitStage: LastHitStages | undefined;

    const radiantCreepsSpawnLocation = Vector(-6288, 3280, 128)
    const direCreepsSpawnLocation = Vector(-5911, 5187, 128)
    const sheepstickedSpawnLocation = Vector(-6715, 4402, 128)
    const sniperSpawnLocation = Vector(-5700, 5555, 128)

    const sniperTalkShitLocalizationOptions: LocalizationKey[] = [LocalizationKey.Script_2_Creeps_17, LocalizationKey.Script_2_Creeps_18, LocalizationKey.Script_2_Creeps_18_1]
    const chosenSniperTalkShitLocalizationOption = randomChoice(sniperTalkShitLocalizationOptions)

    const sniperDiesLocalizationOptions: LocalizationKey[] = [LocalizationKey.Script_2_Creeps_24, LocalizationKey.Script_2_Creeps_25]
    const chosenSniperDiesLocalizationOption = randomChoice(sniperDiesLocalizationOptions)

    const sniperAdmitsDefeatLocalizationOptions: LocalizationKey[] = [LocalizationKey.Script_2_Creeps_18_2, LocalizationKey.Script_2_Creeps_18_3]
    const chosenSniperAdmitsDefeatLocalizationOption = randomChoice(sniperAdmitsDefeatLocalizationOptions)

    const lastHitCount = 5;
    const lastHitBreathFireCount = 1;
    const denyCount = 3;

    const breatheFireAbilityHighlightPath = getPathToHighlightAbility(0)

    const goalTracker = new GoalTracker()
    const goalLastHitCreeps = goalTracker.addNumeric(LocalizationKey.Goal_2_Creeps_1, lastHitCount);
    const goalLastHitCreepsWithBreatheFire = goalTracker.addNumeric(LocalizationKey.Goal_2_Creeps_2, lastHitBreathFireCount);
    const goalDenyOwnCreeps = goalTracker.addNumeric(LocalizationKey.Goal_2_Creeps_3, denyCount);
    const goalKillSniper = goalTracker.addBoolean(LocalizationKey.Goal_2_Creeps_4);

    if (!radiantCreeps) {
        radiantCreeps = createLaneCreeps(radiantCreepsNames, radiantCreepsSpawnLocation, DOTATeam_t.DOTA_TEAM_GOODGUYS, true);
    }

    direCreeps = createLaneCreeps(direCreepNames, direCreepsSpawnLocation, DOTATeam_t.DOTA_TEAM_BADGUYS, true);

    graph = tg.withGoals(context => goalTracker.getGoals(),
        tg.seq([
            tg.wait(FrameTime()),
            tg.immediate(_ => {
                if (radiantCreeps) {
                    for (const radiantCreep of radiantCreeps) {
                        SendCreepToFight(radiantCreep);
                    }
                }
            }),
            tg.forkAny([
                tg.seq([
                    tg.immediate(() => {
                        lastHitTimer = Timers.CreateTimer(1, () => {
                            if (radiantCreeps && direCreeps) {
                                radiantCreeps = radiantCreeps.filter(radiantCreep => IsValidEntity(radiantCreep) && radiantCreep.IsAlive())
                                direCreeps = direCreeps.filter(direCreep => IsValidEntity(direCreep) && direCreep.IsAlive())

                                if (radiantCreeps.length == 0) {
                                    radiantCreeps = createLaneCreeps(radiantCreepsNames, radiantCreepsSpawnLocation, DOTATeam_t.DOTA_TEAM_GOODGUYS, true)
                                    if (currentLastHitStage === LastHitStages.LAST_HIT_DENY) {
                                        highlight({
                                            type: "arrow_enemy",
                                            attach: true,
                                            units: radiantCreeps
                                        })
                                    }
                                }

                                if (direCreeps.length == 0) {
                                    direCreeps = createLaneCreeps(direCreepNames, direCreepsSpawnLocation, DOTATeam_t.DOTA_TEAM_BADGUYS, true)
                                    if (currentLastHitStage === LastHitStages.LAST_HIT || currentLastHitStage === LastHitStages.LAST_HIT_BREATHE_FIRE) {
                                        highlight({
                                            type: "arrow_enemy",
                                            attach: true,
                                            units: direCreeps
                                        })
                                    }
                                }

                                return 1;
                            }
                        })
                    }),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.wait(2.5),
                    tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => {
                        if (radiantCreeps)
                            return radiantCreeps[0].GetAbsOrigin()
                        return playerHero.GetAbsOrigin()
                    }, 1),
                    tg.withHighlights(tg.seq([
                        tg.audioDialog(LocalizationKey.Script_2_Creeps_1, LocalizationKey.Script_2_Creeps_1, context => context[CustomNpcKeys.SlacksMudGolem]),
                        tg.audioDialog(LocalizationKey.Script_2_Creeps_2, LocalizationKey.Script_2_Creeps_2, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    ]),
                        {
                            type: "circle",
                            attach: true,
                            units: (GameRules.Addon.context[Chapter2SpecificKeys.RadiantCreeps] as CDOTA_BaseNPC[]).concat(GameRules.Addon.context[Chapter2SpecificKeys.DireCreeps] as CDOTA_BaseNPC[]),
                            radius: 50
                        }
                    ),

                    // Fork dialogue instructing last hitting
                    tg.forkAny([
                        tg.seq([
                            tg.audioDialog(LocalizationKey.Script_2_Creeps_3, LocalizationKey.Script_2_Creeps_3, context => context[CustomNpcKeys.SlacksMudGolem]),
                            tg.immediate(_ => GridNav.DestroyTreesAroundPoint(sheepstickedSpawnLocation, 300, true)),
                            tg.wait(1),
                            tg.spawnUnit(CustomNpcKeys.Sheepsticked, sheepstickedSpawnLocation, DOTATeam_t.DOTA_TEAM_GOODGUYS, CustomNpcKeys.Sheepsticked, false),
                            tg.immediate(context => {
                                const sheepsticked = context[CustomNpcKeys.Sheepsticked] as CDOTA_BaseNPC;
                                setUnitPacifist(sheepsticked, true);
                                sheepsticked.AddNewModifier(undefined, undefined, modifier_no_health_bar.name, {});
                            }),
                            tg.audioDialog(LocalizationKey.Script_2_Creeps_4, LocalizationKey.Script_2_Creeps_4, context => context[CustomNpcKeys.Sheepsticked]),
                            tg.neverComplete()
                        ]),
                        tg.seq([
                            tg.immediate(() => {
                                goalLastHitCreeps.start()
                                currentLastHitStage = LastHitStages.LAST_HIT
                                if (direCreeps) {
                                    highlight({
                                        type: "arrow_enemy",
                                        attach: true,
                                        units: direCreeps
                                    })
                                }
                                const modifier = playerHero.AddNewModifier(playerHero, undefined, modifier_dk_last_hit_chapter2_creeps.name, { lastHits: lastHitCount, lastHitBreatheFire: lastHitBreathFireCount, denies: denyCount }) as modifier_dk_last_hit_chapter2_creeps
                                if (modifier) modifier.setCurrentState(LastHitStages.LAST_HIT);
                            }),
                            tg.completeOnCheck(_ => {
                                const lastHitModifier = getOrError(playerHero.FindModifierByName(modifier_dk_last_hit_chapter2_creeps.name)) as modifier_dk_last_hit_chapter2_creeps
                                const currentLastHits = lastHitModifier.GetStackCount()
                                goalLastHitCreeps.setValue(currentLastHits)
                                return currentLastHits >= lastHitCount;
                            }, 0.1),
                        ])
                    ]),
                    tg.immediate(_ => goalLastHitCreeps.complete()),

                    // Fork dialogue instructing breathe fire
                    tg.forkAny([
                        tg.seq([
                            tg.audioDialog(LocalizationKey.Script_2_Creeps_11, LocalizationKey.Script_2_Creeps_11, context => context[CustomNpcKeys.SunsFanMudGolem]),
                            tg.neverComplete()
                        ]),
                        tg.seq([
                            tg.immediate(() => {
                                currentLastHitStage = LastHitStages.LAST_HIT_BREATHE_FIRE
                                goalLastHitCreepsWithBreatheFire.start()
                                highlightUiElement(breatheFireAbilityHighlightPath)
                                if (playerHero.HasModifier(modifier_dk_last_hit_chapter2_creeps.name)) {
                                    const modifier = playerHero.FindModifierByName(modifier_dk_last_hit_chapter2_creeps.name) as modifier_dk_last_hit_chapter2_creeps
                                    if (modifier) modifier.setCurrentState(LastHitStages.LAST_HIT_BREATHE_FIRE)
                                    else {
                                        // Technically, this section of code should never happen. But you never know. Programming is black magic sometimes.
                                        const modifier = playerHero.AddNewModifier(playerHero, undefined, modifier_dk_last_hit_chapter2_creeps.name, { lastHits: lastHitCount, lastHitBreatheFire: lastHitBreathFireCount, denies: denyCount }) as modifier_dk_last_hit_chapter2_creeps
                                        if (modifier) modifier.setCurrentState(LastHitStages.LAST_HIT_BREATHE_FIRE)
                                    }
                                }
                            }),
                            tg.immediate(ctx => listenerID = ListenToGameEvent("dota_player_used_ability", (event: DotaPlayerUsedAbilityEvent) => {
                                if (event.abilityname === abilNameBreatheFire) {
                                    eventTimer = Timers.CreateTimer(1.25, () => {
                                        const currentLastHitWithFire = playerHero.GetModifierStackCount(modifier_dk_last_hit_chapter2_creeps.name, playerHero);
                                        if (currentLastHitWithFire < lastHitBreathFireCount) {
                                            currentDialogToken = dg.playAudio(LocalizationKey.Script_1_BreatheFire_3_failed, LocalizationKey.Script_1_BreatheFire_3_failed, ctx[CustomNpcKeys.SlacksMudGolem], undefined, () => {
                                                currentDialogToken = undefined
                                                const ability = playerHero.FindAbilityByName(abilNameBreatheFire)
                                                if (ability) {
                                                    ability.EndCooldown()
                                                }
                                            })
                                        }
                                    })
                                }
                            }, undefined)),
                            tg.completeOnCheck(_ => {
                                const currentLastHitWithFire = playerHero.GetModifierStackCount(modifier_dk_last_hit_chapter2_creeps.name, playerHero);
                                goalLastHitCreepsWithBreatheFire.setValue(currentLastHitWithFire)
                                return currentLastHitWithFire >= lastHitBreathFireCount;
                            }, 0.1),
                        ]),
                    ]),
                    tg.immediate(() => {
                        goalLastHitCreepsWithBreatheFire.complete()
                        removeHighlight(breatheFireAbilityHighlightPath)
                        if (direCreeps) clearAttachedHighlightParticlesFromUnits(direCreeps);
                        currentLastHitStage = undefined;
                        stopListeningToBreatheFireCasts()
                    }),

                    tg.audioDialog(LocalizationKey.Script_2_Creeps_12, LocalizationKey.Script_2_Creeps_12, context => context[CustomNpcKeys.Sheepsticked]),
                    tg.immediate(context => {
                        const sheepsticked = (context[CustomNpcKeys.Sheepsticked] as CDOTA_BaseNPC);
                        sheepsticked.ForceKill(false)
                        context[CustomNpcKeys.Sheepsticked] = undefined;
                    }),
                    tg.spawnUnit(CustomNpcKeys.Sniper, sniperSpawnLocation, DOTATeam_t.DOTA_TEAM_BADGUYS, Chapter2SpecificKeys.sniperEnemyHero, true),
                    tg.immediate(context => {
                        const sniper = context[Chapter2SpecificKeys.sniperEnemyHero]
                        sniper.AddNewModifier(sniper, undefined, modifier_sniper_deny_chapter2_creeps.name, {})
                        sniper.FaceTowards(playerHero.GetAbsOrigin())
                        sniper.StartGesture(GameActivity_t.ACT_DOTA_GENERIC_CHANNEL_1)
                    }),
                    tg.panCameraExponential(_ => getPlayerCameraLocation(), context => context[Chapter2SpecificKeys.sniperEnemyHero].GetAbsOrigin(), 2),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_16, LocalizationKey.Script_2_Creeps_16, context => context[Chapter2SpecificKeys.sniperEnemyHero]),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_13, LocalizationKey.Script_2_Creeps_13, context => context[CustomNpcKeys.SlacksMudGolem]),
                    tg.immediate(context => {
                        const sniper: CDOTA_BaseNPC = context[Chapter2SpecificKeys.sniperEnemyHero];
                        sniper.FadeGesture(GameActivity_t.ACT_DOTA_GENERIC_CHANNEL_1)
                        const modifier = sniper.FindModifierByName(modifier_sniper_deny_chapter2_creeps.name) as modifier_sniper_deny_chapter2_creeps
                        if (modifier) {
                            modifier.isSniperActive = true
                            modifier.sniperDenyingOwnCreeps = true
                        }
                    }),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_14, LocalizationKey.Script_2_Creeps_14, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_15, LocalizationKey.Script_2_Creeps_15, context => context[CustomNpcKeys.SlacksMudGolem]),
                    tg.audioDialog(chosenSniperTalkShitLocalizationOption, chosenSniperTalkShitLocalizationOption, context => context[Chapter2SpecificKeys.sniperEnemyHero]),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_19, LocalizationKey.Script_2_Creeps_19, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.setCameraTarget(undefined),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_20, LocalizationKey.Script_2_Creeps_20, context => context[CustomNpcKeys.SlacksMudGolem]),
                    // No fork since it's pretty short dialogue
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_21, LocalizationKey.Script_2_Creeps_21, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.immediate(() => {
                        goalDenyOwnCreeps.start()
                        currentLastHitStage = LastHitStages.LAST_HIT_DENY
                        if (radiantCreeps) {
                            highlight({
                                type: "arrow_enemy",
                                attach: true,
                                units: radiantCreeps
                            })
                        }

                        if (playerHero.HasModifier(modifier_dk_last_hit_chapter2_creeps.name)) {
                            const modifier = playerHero.FindModifierByName(modifier_dk_last_hit_chapter2_creeps.name) as modifier_dk_last_hit_chapter2_creeps
                            if (modifier) modifier.setCurrentState(LastHitStages.LAST_HIT_DENY)
                            else {
                                // Technically, this section of code should never happen. But you never know. Programming is black magic sometimes.
                                const modifier = playerHero.AddNewModifier(playerHero, undefined, modifier_dk_last_hit_chapter2_creeps.name, { lastHits: lastHitCount, lastHitBreatheFire: lastHitBreathFireCount, denies: denyCount }) as modifier_dk_last_hit_chapter2_creeps
                                if (modifier) modifier.setCurrentState(LastHitStages.LAST_HIT_DENY)
                            }
                        }
                    }),
                    tg.completeOnCheck(_ => {
                        const currentDenies = playerHero.GetModifierStackCount(modifier_dk_last_hit_chapter2_creeps.name, playerHero);
                        goalDenyOwnCreeps.setValue(currentDenies)
                        return currentDenies >= denyCount;
                    }, 0.1),
                    tg.audioDialog(chosenSniperAdmitsDefeatLocalizationOption, chosenSniperAdmitsDefeatLocalizationOption, context => context[Chapter2SpecificKeys.sniperEnemyHero]),
                    tg.immediate(() => {
                        goalDenyOwnCreeps.complete()
                        currentLastHitStage = undefined
                        if (radiantCreeps) clearAttachedHighlightParticlesFromUnits(radiantCreeps)
                    }),

                    // Fork kill sniper dialogue
                    tg.forkAny([
                        tg.seq([
                            tg.audioDialog(LocalizationKey.Script_2_Creeps_22, LocalizationKey.Script_2_Creeps_22, context => context[CustomNpcKeys.SlacksMudGolem]),
                            tg.audioDialog(LocalizationKey.Script_2_Creeps_23, LocalizationKey.Script_2_Creeps_23, context => context[CustomNpcKeys.SunsFanMudGolem]),
                            tg.neverComplete()
                        ]),
                        tg.withHighlights(tg.seq([
                            tg.immediate(context => {
                                goalKillSniper.start()
                                const sniper: CDOTA_BaseNPC = context[Chapter2SpecificKeys.sniperEnemyHero]
                                if (sniper) {
                                    if (sniper.HasModifier(modifier_sniper_deny_chapter2_creeps.name)) {
                                        const modifier = sniper.FindModifierByName(modifier_sniper_deny_chapter2_creeps.name) as modifier_sniper_deny_chapter2_creeps;
                                        if (modifier) {
                                            modifier.sniperDenyingOwnCreeps = false;
                                        }
                                    }
                                }
                            }),
                            tg.completeOnCheck(context => {
                                const sniper = context[Chapter2SpecificKeys.sniperEnemyHero] as CDOTA_BaseNPC;
                                return !sniper.IsAlive()
                            }, 0.25),
                        ]),
                            context =>
                            ({
                                type: "arrow_enemy",
                                attach: true,
                                units: [context[Chapter2SpecificKeys.sniperEnemyHero]]
                            })
                        ),
                    ]),

                    tg.audioDialog(chosenSniperDiesLocalizationOption, chosenSniperDiesLocalizationOption, context => context[Chapter2SpecificKeys.sniperEnemyHero]),
                    tg.immediate(context => {
                        goalKillSniper.complete()

                        if (lastHitTimer) Timers.RemoveTimer(lastHitTimer)
                        removeContextEntityIfExists(context, Chapter2SpecificKeys.RadiantCreeps)
                        removeContextEntityIfExists(context, Chapter2SpecificKeys.DireCreeps)
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

    const hero = getPlayerHero();
    if (hero) {
        if (hero.HasModifier(modifier_dk_last_hit_chapter2_creeps.name)) {
            hero.RemoveModifierByName(modifier_dk_last_hit_chapter2_creeps.name);
        }
    }

    if (lastHitTimer) {
        Timers.RemoveTimer(lastHitTimer)
        lastHitTimer = undefined;
    }

    if (currentDialogToken !== undefined) {
        dg.stop(currentDialogToken)
        currentDialogToken = undefined
    }

    stopListeningToBreatheFireCasts()

    const context = GameRules.Addon.context;
    removeContextEntityIfExists(context, Chapter2SpecificKeys.RadiantCreeps)
    removeContextEntityIfExists(context, Chapter2SpecificKeys.DireCreeps)
    removeContextEntityIfExists(context, Chapter2SpecificKeys.sniperEnemyHero)
    removeContextEntityIfExists(context, CustomNpcKeys.Sheepsticked)

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const sectionCreeps = new tut.FunctionalSection(
    SectionName.Chapter2_Creeps,
    requiredState,
    onStart,
    onStop,
    chapter2CreepsOrderFilter
);

export function chapter2CreepsOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    return true;
}

function SendCreepToFight(unit: CDOTA_BaseNPC) {
    const radiantCreepsSpawnLocation = Vector(-6288, 3280, 128)
    const direCreepsSpawnLocation = Vector(-5911, 5187, 128)

    let fightPosition = unit.GetTeamNumber() == DOTATeam_t.DOTA_TEAM_GOODGUYS ? direCreepsSpawnLocation : radiantCreepsSpawnLocation;

    ExecuteOrderFromTable({
        OrderType: dotaunitorder_t.DOTA_UNIT_ORDER_ATTACK_MOVE,
        Position: fightPosition,
        UnitIndex: unit.entindex()
    })
}

function createLaneCreeps(creepNames: string[], location: Vector, team: DotaTeam, sendCreepToFight: boolean): CDOTA_BaseNPC[] {
    const arrayToPush = [];

    for (const creepName of creepNames) {
        const creep = CreateUnitByName(creepName, location, true, undefined, undefined, team)
        arrayToPush.push(creep);

        if (sendCreepToFight) Timers.CreateTimer(0.1, () => SendCreepToFight(creep))
    }

    if (team === DOTATeam_t.DOTA_TEAM_GOODGUYS)
        GameRules.Addon.context[Chapter2SpecificKeys.RadiantCreeps] = arrayToPush
    else
        GameRules.Addon.context[Chapter2SpecificKeys.DireCreeps] = arrayToPush

    return arrayToPush;
}

function stopListeningToBreatheFireCasts() {
    if (listenerID) {
        StopListeningToGameEvent(listenerID)
        listenerID = undefined
    }

    if (eventTimer) {
        Timers.RemoveTimer(eventTimer)
        eventTimer = undefined
    }
}
