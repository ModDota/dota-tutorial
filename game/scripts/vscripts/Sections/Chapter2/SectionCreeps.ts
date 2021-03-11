import { GoalTracker } from "../../Goals";
import { modifier_dk_last_hit_chapter2_creeps } from "../../modifiers/modifier_dk_last_hit_chapter2_creeps";
import { modifier_sniper_deny_chapter2_creeps } from "../../modifiers/modifier_sniper_deny_chapter2_creeps";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { clearAttachedHighlightParticlesFromUnits, findRealPlayerID, freezePlayerHero, getPlayerHero, highlight, removeContextEntityIfExists, setUnitPacifist } from "../../util";
import { Chapter2SpecificKeys, LastHitStages, radiantCreepsNames, direCreepNames, chapter2Blockades } from "./shared";

const sectionName: SectionName = SectionName.Chapter2_Creeps
let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    heroLocation: Vector(-6288, 3000, 128),
    heroLocationTolerance: 300,
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5495, 2930, 128),
    sunsFanLocation: Vector(-5515, 2700, 128),
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
    ]
}

let lastHitTimer: string | undefined;

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
    const godzSpawnLocation = Vector(-6715, 4402, 128)
    const sniperSpawnLocation = Vector(-5700, 5555, 128)

    const sniperTalkShitLocalizationOptions: LocalizationKey[] = [LocalizationKey.Script_2_Creeps_16, LocalizationKey.Script_2_Creeps_17, LocalizationKey.Script_2_Creeps_18]
    const chosenSniperTalkShitLocalizationOption = sniperTalkShitLocalizationOptions[RandomInt(0, sniperTalkShitLocalizationOptions.length - 1)]

    const lastHitCount = 5;
    const lastHitBreathFireCount = 3;
    const denyCount = 5;

    const goalTracker = new GoalTracker()
    const goalLastHitCreeps = goalTracker.addNumeric(`Last hit ${lastHitCount} creeps`, lastHitCount);
    const goalLastHitCreepsWithBreatheFire = goalTracker.addNumeric(`Last hit ${lastHitBreathFireCount} creeps using Breath Fire`, lastHitBreathFireCount);
    const goalDenyOwnCreeps = goalTracker.addNumeric(`Deny ${denyCount} friendly creeps`, denyCount);
    const goalKillSniper = goalTracker.addBoolean("Kill Sniper.");

    if (!radiantCreeps) {
        radiantCreeps = createLaneCreeps(radiantCreepsNames, radiantCreepsSpawnLocation, DotaTeam.GOODGUYS, false);
        GameRules.Addon.context[Chapter2SpecificKeys.RadiantCreeps] = radiantCreeps;
    }

    if (!direCreeps) {
        direCreeps = createLaneCreeps(direCreepNames, direCreepsSpawnLocation, DotaTeam.BADGUYS, false);
        GameRules.Addon.context[Chapter2SpecificKeys.DireCreeps] = direCreeps;
    }

    graph = tg.withGoals(context => goalTracker.getGoals(),
        tg.seq([
            tg.wait(FrameTime()),
            tg.immediate(_ => {
                freezePlayerHero(true)
                if (radiantCreeps) {
                    for (const radiantCreep of radiantCreeps) {
                        SendCreepToFight(radiantCreep);
                    }
                }

                if (direCreeps) {
                    for (const direCreep of direCreeps) {
                        SendCreepToFight(direCreep)
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
                                    radiantCreeps = createLaneCreeps(radiantCreepsNames, radiantCreepsSpawnLocation, DotaTeam.GOODGUYS, true)
                                    if (currentLastHitStage === LastHitStages.LAST_HIT_DENY) {
                                        highlight(
                                            {
                                                type: "arrow_enemy",
                                                attach: true,
                                                units: radiantCreeps
                                            })
                                    }
                                }

                                if (direCreeps.length == 0) {
                                    direCreeps = createLaneCreeps(direCreepNames, direCreepsSpawnLocation, DotaTeam.BADGUYS, true)
                                    if (currentLastHitStage === LastHitStages.LAST_HIT || currentLastHitStage === LastHitStages.LAST_HIT_BREATHE_FIRE) {
                                        highlight(
                                            {
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
                    tg.setCameraTarget(radiantCreeps[0]),
                    tg.wait(3.5),
                    tg.withHighlights(tg.seq(
                        [
                            tg.audioDialog(LocalizationKey.Script_2_Creeps_1, LocalizationKey.Script_2_Creeps_1, context => context[CustomNpcKeys.SlacksMudGolem]),
                            tg.audioDialog(LocalizationKey.Script_2_Creeps_2, LocalizationKey.Script_2_Creeps_2, context => context[CustomNpcKeys.SunsFanMudGolem]),
                            tg.audioDialog(LocalizationKey.Script_2_Creeps_3, LocalizationKey.Script_2_Creeps_3, context => context[CustomNpcKeys.SlacksMudGolem]),
                        ]),
                        {
                            type: "circle",
                            attach: true,
                            units: (GameRules.Addon.context[Chapter2SpecificKeys.RadiantCreeps] as CDOTA_BaseNPC[]).concat(GameRules.Addon.context[Chapter2SpecificKeys.DireCreeps] as CDOTA_BaseNPC[]),
                            radius: 50
                        }
                    ),

                    tg.immediate(_ => GridNav.DestroyTreesAroundPoint(godzSpawnLocation, 300, true)),
                    tg.wait(1),
                    tg.spawnUnit(CustomNpcKeys.GodzMudGolem, godzSpawnLocation, DotaTeam.GOODGUYS, CustomNpcKeys.GodzMudGolem, true),
                    tg.immediate(context => {
                        const godzMudGolem = context[CustomNpcKeys.GodzMudGolem]
                        setUnitPacifist(godzMudGolem, true);
                    }),
                    tg.setCameraTarget(context => context[CustomNpcKeys.GodzMudGolem]),
                    tg.textDialog(LocalizationKey.Script_2_Creeps_4, context => context[CustomNpcKeys.GodzMudGolem], 3),
                    tg.panCameraLinear(context => context[CustomNpcKeys.GodzMudGolem].GetAbsOrigin(), playerHero.GetAbsOrigin(), 1),
                    tg.immediate(() => freezePlayerHero(false)),
                    tg.immediate(() => {
                        goalLastHitCreeps.start()
                        currentLastHitStage = LastHitStages.LAST_HIT
                        if (direCreeps) {
                            highlight(
                                {
                                    type: "arrow_enemy",
                                    attach: true,
                                    units: direCreeps
                                }
                            )
                        }
                        const modifier = playerHero.AddNewModifier(playerHero, undefined, modifier_dk_last_hit_chapter2_creeps.name, {}) as modifier_dk_last_hit_chapter2_creeps
                        if (modifier) modifier.setCurrentState(LastHitStages.LAST_HIT);
                    }),
                    tg.completeOnCheck(_ => {
                        const currentLastHits = playerHero.GetModifierStackCount(modifier_dk_last_hit_chapter2_creeps.name, playerHero);
                        goalLastHitCreeps.setValue(currentLastHits)
                        return currentLastHits >= lastHitCount;
                    }, 0.1),
                    tg.immediate(() => {
                        goalLastHitCreeps.complete()
                        currentLastHitStage = LastHitStages.LAST_HIT_BREATHE_FIRE
                        goalLastHitCreepsWithBreatheFire.start()
                        if (playerHero.HasModifier(modifier_dk_last_hit_chapter2_creeps.name)) {
                            const modifier = playerHero.FindModifierByName(modifier_dk_last_hit_chapter2_creeps.name) as modifier_dk_last_hit_chapter2_creeps
                            if (modifier) modifier.setCurrentState(LastHitStages.LAST_HIT_BREATHE_FIRE)
                            else {
                                // Technically, this section of code should never happen. But you never know. Programming is black magic sometimes.
                                const modifier = playerHero.AddNewModifier(playerHero, undefined, modifier_dk_last_hit_chapter2_creeps.name, {}) as modifier_dk_last_hit_chapter2_creeps
                                if (modifier) modifier.setCurrentState(LastHitStages.LAST_HIT_BREATHE_FIRE)
                            }
                        }
                    }),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_11, LocalizationKey.Script_2_Creeps_11, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.completeOnCheck(_ => {
                        const currentLastHitWithFire = playerHero.GetModifierStackCount(modifier_dk_last_hit_chapter2_creeps.name, playerHero);
                        goalLastHitCreepsWithBreatheFire.setValue(currentLastHitWithFire)
                        return currentLastHitWithFire >= lastHitBreathFireCount;
                    }, 0.5),
                    tg.immediate(() => {
                        goalLastHitCreepsWithBreatheFire.complete()
                        if (direCreeps) clearAttachedHighlightParticlesFromUnits(direCreeps);
                        currentLastHitStage = undefined;
                        setUnitPacifist(playerHero, true);
                        freezePlayerHero(true);
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Creeps_12, context => context[CustomNpcKeys.GodzMudGolem], 3),
                    tg.immediate(context => {
                        const godzMudGolem = (context[CustomNpcKeys.GodzMudGolem] as CDOTA_BaseNPC);
                        godzMudGolem.ForceKill(false)
                        context[CustomNpcKeys.GodzMudGolem] = undefined;
                    }),
                    tg.spawnUnit(CustomNpcKeys.Sniper, sniperSpawnLocation, DotaTeam.BADGUYS, Chapter2SpecificKeys.sniperEnemyHero, true),
                    tg.immediate(context => {
                        const sniper = context[Chapter2SpecificKeys.sniperEnemyHero]
                        sniper.AddNewModifier(sniper, undefined, modifier_sniper_deny_chapter2_creeps.name, {})
                        sniper.FaceTowards(playerHero.GetAbsOrigin())
                        sniper.StartGesture(GameActivity.DOTA_GENERIC_CHANNEL_1)
                    }),
                    tg.setCameraTarget(context => context[Chapter2SpecificKeys.sniperEnemyHero]),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_13, LocalizationKey.Script_2_Creeps_13, context => context[CustomNpcKeys.SlacksMudGolem]),
                    tg.immediate(context => {
                        const sniper: CDOTA_BaseNPC = context[Chapter2SpecificKeys.sniperEnemyHero];
                        sniper.FadeGesture(GameActivity.DOTA_GENERIC_CHANNEL_1)
                        const modifier = sniper.FindModifierByName(modifier_sniper_deny_chapter2_creeps.name) as modifier_sniper_deny_chapter2_creeps
                        if (modifier) {
                            modifier.isSniperActive = true
                            modifier.sniperDenyingOwnCreeps = true
                        }
                    }),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_14, LocalizationKey.Script_2_Creeps_14, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_15, LocalizationKey.Script_2_Creeps_15, context => context[CustomNpcKeys.SlacksMudGolem]),
                    // no spoken dialog for this yet, unfortunately
                    tg.textDialog(chosenSniperTalkShitLocalizationOption, context => context[Chapter2SpecificKeys.sniperEnemyHero], 3),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_19, LocalizationKey.Script_2_Creeps_19, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.setCameraTarget(undefined),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_20, LocalizationKey.Script_2_Creeps_20, context => context[CustomNpcKeys.SlacksMudGolem]),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_21, LocalizationKey.Script_2_Creeps_21, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.immediate(() => {
                        goalDenyOwnCreeps.start()
                        currentLastHitStage = LastHitStages.LAST_HIT_DENY
                        if (radiantCreeps) {
                            highlight(
                                {
                                    type: "arrow_enemy",
                                    attach: true,
                                    units: radiantCreeps
                                }
                            )
                        }

                        setUnitPacifist(playerHero, false);
                        freezePlayerHero(false);
                        if (playerHero.HasModifier(modifier_dk_last_hit_chapter2_creeps.name)) {
                            const modifier = playerHero.FindModifierByName(modifier_dk_last_hit_chapter2_creeps.name) as modifier_dk_last_hit_chapter2_creeps
                            if (modifier) modifier.setCurrentState(LastHitStages.LAST_HIT_DENY)
                            else {
                                // Technically, this section of code should never happen. But you never know. Programming is black magic sometimes.
                                const modifier = playerHero.AddNewModifier(playerHero, undefined, modifier_dk_last_hit_chapter2_creeps.name, {}) as modifier_dk_last_hit_chapter2_creeps
                                if (modifier) modifier.setCurrentState(LastHitStages.LAST_HIT_DENY)
                            }
                        }
                    }),
                    tg.completeOnCheck(_ => {
                        const currentDenies = playerHero.GetModifierStackCount(modifier_dk_last_hit_chapter2_creeps.name, playerHero);
                        goalDenyOwnCreeps.setValue(currentDenies)
                        return currentDenies >= denyCount;
                    }, 0.1),
                    tg.immediate(() => {
                        goalDenyOwnCreeps.complete()
                        currentLastHitStage = undefined
                        if (radiantCreeps) clearAttachedHighlightParticlesFromUnits(radiantCreeps)
                    }),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_22, LocalizationKey.Script_2_Creeps_22, context => context[CustomNpcKeys.SlacksMudGolem]),
                    tg.audioDialog(LocalizationKey.Script_2_Creeps_23, LocalizationKey.Script_2_Creeps_23, context => context[CustomNpcKeys.SunsFanMudGolem]),
                    tg.withHighlights(
                        tg.seq(
                            [
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
                        (
                            {
                                type: "arrow_enemy",
                                attach: true,
                                units: [context[Chapter2SpecificKeys.sniperEnemyHero]]
                            }
                        )
                    ),

                    // No audio dialog for this yet
                    tg.textDialog(LocalizationKey.Script_2_Creeps_24, context => context[Chapter2SpecificKeys.sniperEnemyHero], 3),
                    tg.immediate(() => {
                        goalKillSniper.complete()

                        if (lastHitTimer) Timers.RemoveTimer(lastHitTimer)
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

    const context = GameRules.Addon.context;
    removeContextEntityIfExists(context, Chapter2SpecificKeys.RadiantCreeps)
    removeContextEntityIfExists(context, Chapter2SpecificKeys.DireCreeps)
    removeContextEntityIfExists(context, Chapter2SpecificKeys.sniperEnemyHero)

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

    let fightPosition = unit.GetTeamNumber() == DotaTeam.GOODGUYS ? direCreepsSpawnLocation : radiantCreepsSpawnLocation;

    ExecuteOrderFromTable({
        OrderType: UnitOrder.ATTACK_MOVE,
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
    return arrayToPush;
}
