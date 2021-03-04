import { GoalTracker } from "../../Goals";
import { modifier_dk_last_hit_chapter2_creeps } from "../../modifiers/modifier_dk_last_hit_chapter2_creeps";
import { modifier_sniper_deny_chapter2_creeps } from "../../modifiers/modifier_sniper_deny_chapter2_creeps";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { findRealPlayerID, getPlayerHero, setUnitPacifist } from "../../util";

const sectionName: SectionName = SectionName.Chapter2_Creeps
let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    heroLocation: Vector(-6288, 3000, 128),
    heroLocationTolerance: 300,
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5495, 2930, 128),
    sunsFanLocation: Vector(-5515, 2700, 128)
}

let canPlayerIssueOrders = true;
let lastHitTimer: string | undefined;

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const radiantCreepsNames = [CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantRangedCreep];
    const direCreepNames = [CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireRangedCreep];

    let radiantCreeps: CDOTA_BaseNPC[] | undefined = GameRules.Addon.context[chapter2SpecificKeys.RadiantCreeps];
    let direCreeps: CDOTA_BaseNPC[] | undefined = GameRules.Addon.context[chapter2SpecificKeys.DireCreeps];

    const radiantCreepsSpawnLocation = Vector(-6288, 3280, 128)
    const direCreepsSpawnLocation = Vector(-5911, 5187, 128)
    const godzSpawnLocation = Vector(-6715, 4402, 128)
    const sniperSpawnLocation = Vector(-5700, 5555, 128)

    const lastHitCount = 5;
    const lastHitBreathFireCount = 3;
    const denyCount = 5;

    const goalTracker = new GoalTracker()
    const goalLastHitCreeps = goalTracker.addNumeric(`Last hit ${lastHitCount} creeps`, lastHitCount);
    const goalLastHitCreepsWithBreatheFire = goalTracker.addNumeric(`Last hit ${lastHitBreathFireCount} creeps using Breath Fire`, lastHitBreathFireCount);
    const goalDenyOwnCreeps = goalTracker.addNumeric(`Deny ${denyCount} friendly creeps`, denyCount);
    const goalKillSniper = goalTracker.addBoolean("Kill Sniper.");

    if (!radiantCreeps) {
        radiantCreeps = createLaneCreeps(radiantCreepsNames, radiantCreepsSpawnLocation, DotaTeam.GOODGUYS, false, radiantCreeps);
        GameRules.Addon.context[chapter2SpecificKeys.RadiantCreeps] = radiantCreeps;
    }

    if (!direCreeps) {
        direCreeps = createLaneCreeps(direCreepNames, direCreepsSpawnLocation, DotaTeam.BADGUYS, false, direCreeps);
        GameRules.Addon.context[chapter2SpecificKeys.DireCreeps] = direCreeps;
    }

    let godzMudGolem: CDOTA_BaseNPC;

    graph = tg.withGoals(context => goalTracker.getGoals(),
        tg.seq([
            tg.wait(FrameTime()),
            tg.immediate(_ => {
                playerHero.Stop();
                canPlayerIssueOrders = false;
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
                                    createLaneCreeps(radiantCreepsNames, radiantCreepsSpawnLocation, DotaTeam.GOODGUYS, true, radiantCreeps)
                                }

                                if (direCreeps.length == 0) {
                                    createLaneCreeps(direCreepNames, direCreepsSpawnLocation, DotaTeam.BADGUYS, true, direCreeps)
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
                    tg.textDialog(LocalizationKey.Script_2_Creeps_1, context => context[CustomNpcKeys.SlacksMudGolem], 15), // should be said by Slack's Golem
                    tg.textDialog(LocalizationKey.Script_2_Creeps_2, context => context[CustomNpcKeys.SunsFanMudGolem], 10), // should be said by Sunsfan's Golem
                    tg.textDialog(LocalizationKey.Script_2_Creeps_3, context => context[CustomNpcKeys.SlacksMudGolem], 8), // should be said by Slack's Golem
                    tg.immediate(_ => GridNav.DestroyTreesAroundPoint(godzSpawnLocation, 300, true)),
                    tg.wait(1),
                    tg.immediate(context => {
                        godzMudGolem = CreateUnitByName(CustomNpcKeys.GodzMudGolem, godzSpawnLocation, true, undefined, undefined, DotaTeam.GOODGUYS)
                        context[CustomNpcKeys.GodzMudGolem] = godzMudGolem;
                        setUnitPacifist(godzMudGolem, true);
                    }),
                    tg.setCameraTarget(context => context[CustomNpcKeys.GodzMudGolem]),
                    tg.textDialog(LocalizationKey.Script_2_Creeps_4, context => context[CustomNpcKeys.GodzMudGolem], 5), // // should be said by Godz's Golem
                    tg.setCameraTarget(playerHero),
                    tg.setCameraTarget(undefined),
                    tg.immediate(() => canPlayerIssueOrders = true),
                    tg.immediate(() => {
                        goalLastHitCreeps.start()
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
                    tg.textDialog(LocalizationKey.Script_2_Creeps_5, context => context[CustomNpcKeys.SunsFanMudGolem], 12), // should be said by Sunsfan's Golem
                    tg.completeOnCheck(_ => {
                        const currentLastHitWithFire = playerHero.GetModifierStackCount(modifier_dk_last_hit_chapter2_creeps.name, playerHero);
                        goalLastHitCreepsWithBreatheFire.setValue(currentLastHitWithFire)
                        return currentLastHitWithFire >= lastHitBreathFireCount;
                    }, 0.5),
                    tg.immediate(() => {
                        goalLastHitCreepsWithBreatheFire.complete()
                        setUnitPacifist(playerHero, true);
                        canPlayerIssueOrders = false;
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Creeps_6, context => context[CustomNpcKeys.GodzMudGolem], 3), // should be said by Godz's Golem
                    tg.immediate(context => {
                        const godzMudGolem = (context[CustomNpcKeys.GodzMudGolem] as CDOTA_BaseNPC);
                        godzMudGolem.ForceKill(false)
                        context[CustomNpcKeys.GodzMudGolem] = undefined;
                    }),
                    tg.immediate(context => {
                        const sniper = CreateUnitByName("npc_dota_hero_sniper", sniperSpawnLocation, true, undefined, undefined, DotaTeam.BADGUYS)
                        context[chapter2SpecificKeys.sniperEnemyHero] = sniper
                        sniper.AddNewModifier(sniper, undefined, modifier_sniper_deny_chapter2_creeps.name, {})
                        sniper.FaceTowards(playerHero.GetAbsOrigin())
                        sniper.StartGesture(GameActivity.DOTA_GENERIC_CHANNEL_1)
                    }),
                    tg.setCameraTarget(context => context[chapter2SpecificKeys.sniperEnemyHero]),
                    tg.textDialog(LocalizationKey.Script_2_Creeps_7, context => context[CustomNpcKeys.SlacksMudGolem], 4), // should be said by Slack's Golem
                    tg.setCameraTarget(undefined),
                    tg.immediate(context => {
                        const sniper: CDOTA_BaseNPC = context[chapter2SpecificKeys.sniperEnemyHero];
                        sniper.FadeGesture(GameActivity.DOTA_GENERIC_CHANNEL_1)
                        const modifier = sniper.FindModifierByName(modifier_sniper_deny_chapter2_creeps.name) as modifier_sniper_deny_chapter2_creeps
                        if (modifier) {
                            modifier.isSniperActive = true
                            modifier.sniperDenyingOwnCreeps = true
                        }
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Creeps_8, context => context[CustomNpcKeys.SunsFanMudGolem], 6), // should be said by Sunsfan's Golem
                    tg.textDialog(LocalizationKey.Script_2_Creeps_9, context => context[CustomNpcKeys.SlacksMudGolem], 12), // should be said by Slack's Golem
                    tg.playGlobalSound("sniperTalkingShit.wav", false),
                    tg.textDialog(LocalizationKey.Script_2_Creeps_10, context => context[CustomNpcKeys.SunsFanMudGolem], 8), // should be said by Sunsfan's Golem
                    tg.setCameraTarget(undefined),
                    tg.textDialog(LocalizationKey.Script_2_Creeps_11, context => context[CustomNpcKeys.SlacksMudGolem], 15), // should be said by Slack's Golem
                    tg.textDialog(LocalizationKey.Script_2_Creeps_12, context => context[CustomNpcKeys.SunsFanMudGolem], 4), // should be said by Sunsfan's Golem
                    tg.immediate(() => {
                        goalDenyOwnCreeps.start()

                        setUnitPacifist(playerHero, false);
                        canPlayerIssueOrders = true;
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
                    }),
                    tg.textDialog(LocalizationKey.Script_2_Creeps_13, context => context[CustomNpcKeys.SlacksMudGolem], 8), // should be said by Slack's Golem
                    tg.textDialog(LocalizationKey.Script_2_Creeps_14, context => context[CustomNpcKeys.SunsFanMudGolem], 4), // should be said by Sunsfan's Golem
                    tg.immediate(context => {
                        goalKillSniper.start()
                        const sniper: CDOTA_BaseNPC = context[chapter2SpecificKeys.sniperEnemyHero]
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
                        const sniper = context[chapter2SpecificKeys.sniperEnemyHero] as CDOTA_BaseNPC;
                        return !sniper.IsAlive()
                    }, 0.5),
                    tg.playGlobalSound("SniperDiesLamely.mp3", true),
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
    const radiantCreeps = context[chapter2SpecificKeys.RadiantCreeps]
    if (radiantCreeps) {
        if (Array.isArray(radiantCreeps)) {
            for (const radiantCreep of radiantCreeps) {
                if (IsValidEntity(radiantCreep)) {
                    UTIL_Remove(radiantCreep)
                }
            }
        }
    }

    const direCreeps = context[chapter2SpecificKeys.DireCreeps]
    if (direCreeps) {
        if (Array.isArray(direCreeps)) {
            for (const direCreep of direCreeps) {
                if (IsValidEntity(direCreep)) {
                    UTIL_Remove(direCreep)
                }
            }
        }
    }

    const sniper = context[chapter2SpecificKeys.sniperEnemyHero]
    if (sniper) {
        if (IsValidEntity(sniper)) {
            UTIL_Remove(sniper);
        }
        context[chapter2SpecificKeys.sniperEnemyHero] = undefined;
    }

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const SectionCreeps = new tut.FunctionalSection(
    SectionName.Chapter2_Creeps,
    requiredState,
    onStart,
    onStop,
    chapter2CreepsOrderFilter
);

export function chapter2CreepsOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (!canPlayerIssueOrders) return false;

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

function createLaneCreeps(creepNames: string[], location: Vector, team: DotaTeam, sendCreepToFight: boolean, arrayToPush: CDOTA_BaseNPC[] | undefined): CDOTA_BaseNPC[] {
    if (!arrayToPush) arrayToPush = [];

    for (const creepName of creepNames) {
        const creep = CreateUnitByName(creepName, location, true, undefined, undefined, team)
        arrayToPush.push(creep);

        if (sendCreepToFight) Timers.CreateTimer(0.1, () => SendCreepToFight(creep))

    }
    return arrayToPush;
}
