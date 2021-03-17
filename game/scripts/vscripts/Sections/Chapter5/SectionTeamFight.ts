import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import * as shared from "./Shared"
import { displayDotaErrorMessage, freezePlayerHero, getOrError, getPlayerCameraLocation, getPlayerHero, setUnitPacifist, unitIsValidAndAlive } from "../../util";

const sectionName: SectionName = SectionName.Chapter5_TeamFight;

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: shared.outsidePitLocation,
    heroLocationTolerance: 200,
    heroLevel: 25,
    heroAbilityMinLevels: [4, 4, 4, 3],
    heroItems: Object.fromEntries([...shared.preRoshKillItems, shared.itemAegis].map(itemName => [itemName, 1])),
    blockades: [
        shared.chapter5Blockades.direJungleLowgroundRiver,
        shared.chapter5Blockades.topLaneRiver,
        shared.chapter5Blockades.radiantSecretShopRiver,
        shared.chapter5Blockades.direOutpostRiver,
        shared.chapter5Blockades.radiantAncientsRiver,
        shared.chapter5Blockades.radiantMidTopRiver,
        shared.chapter5Blockades.direMidTopRiver,
        shared.chapter5Blockades.midRiverTopSide,
        shared.chapter5Blockades.roshan,
    ],
    removeElderDragonForm: false,
    topDireT1TowerStanding: false,
    topDireT2TowerStanding: false
}

const radiantFountainLocation = Vector(-6850, -6500, 384)
const totalEnemyCount = shared.enemyHeroesInfo.length

let playerUsedTp = false
let waitingForPlayerTp = false

function onStart(complete: () => void) {
    print("Starting", sectionName)

    const goalTracker = new GoalTracker()
    const goalSpotEnemies = goalTracker.addBoolean(LocalizationKey.Goal_5_5v5_1)
    const goalKillEnemyHeroes = goalTracker.addNumeric(LocalizationKey.Goal_5_5v5_2, totalEnemyCount)
    const goalUseTp = goalTracker.addBoolean(LocalizationKey.Goal_5_5v5_3)
    const goalPromiseCarryTp = goalTracker.addBoolean(LocalizationKey.Goal_5_5v5_4)

    const playerHero = getOrError(getPlayerHero(), "Could not get player hero")

    let voicePressed = false

    playerUsedTp = false
    waitingForPlayerTp = false

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(_ => {
                playerHero.SetHealth(playerHero.GetMaxHealth())
                playerHero.SetMana(playerHero.GetMaxMana())
            }),
            tg.panCameraLinear(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), 1),
            shared.spawnFriendlyHeroes(shared.outsidePitLocation),
            shared.spawnEnemyHeroes(shared.enemyLocation),

            // Setup positions, items and abilities
            tg.immediate(ctx => ctx[CustomNpcKeys.Pudge].SetAbsOrigin(Vector(-1825, 750, 0))),
            tg.immediate(ctx => setupEnemyHeroes(ctx)),

            // Pacify everyone so they don't aggro before the fight starts
            tg.fork(shared.allHeroesInfo.map((heroInfo) => {
                return tg.immediate(ctx => setUnitPacifist(ctx[heroInfo.name], true))
            })),

            // Pan to enemies and back while dialog is playing
            tg.immediate(_ => GameRules.SetTimeOfDay(0.5)),
            tg.immediate(_ => goalSpotEnemies.start()),
            tg.immediate(_ => freezePlayerHero(true)),
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_5_5v5_1, LocalizationKey.Script_5_5v5_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.seq([
                    tg.panCameraExponential(_ => getPlayerCameraLocation(), shared.enemyLocation, 2),
                    tg.wait(0.75),
                    tg.immediate(_ => goalSpotEnemies.complete()),
                    tg.wait(0.75),
                    tg.immediate(_ => goalKillEnemyHeroes.start()),
                    tg.wait(0.75),
                    tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), 2),
                ])
            ]),
            tg.immediate(_ => freezePlayerHero(false)),

            // Start teamfight
            tg.fork(shared.allHeroesInfo.map((heroInfo) => {
                return tg.immediate(ctx => setUnitPacifist(ctx[heroInfo.name], false))
            })),
            tg.immediate(ctx => shared.getLivingHeroes(ctx).forEach(hero => {
                ExecuteOrderFromTable({
                    OrderType: UnitOrder.ATTACK_MOVE,
                    Position: (hero.GetTeam() === DotaTeam.GOODGUYS ? shared.enemyLocation : shared.outsidePitLocation).__add(RandomVector(300)),
                    UnitIndex: hero.entindex(),
                })
            })),
            // TODO: Add logic for if the player dies (although not a disaster atm. either since they just respawn)
            tg.fork([
                tg.seq([
                    // Wait for every enemy to die
                    tg.loop(ctx => shared.getLivingEnemyHeroes(ctx).length > 0, ctx => tg.seq([
                        tg.immediate(_ => goalKillEnemyHeroes.setValue(totalEnemyCount - shared.getLivingEnemyHeroes(ctx).length)),
                        tg.wait(1),
                    ])),
                    tg.immediate(_ => goalKillEnemyHeroes.setValue(totalEnemyCount)),
                    tg.immediate(_ => goalKillEnemyHeroes.complete()),
                ]),

                // Friendlies teamfight logic
                useAbilityStep(ctx => ctx[CustomNpcKeys.Mirana], ctx => ctx[CustomNpcKeys.Pudge], "mirana_arrow", UnitOrder.CAST_POSITION),
                tg.seq([
                    tg.fork(shared.friendlyHeroesInfo.map(friendlyHeroInfo => {
                        return tg.completeOnCheck(ctx => ctx[friendlyHeroInfo.name].IsAttacking(), 1)
                    })),
                    tg.forkAny([
                        tg.completeOnCheck(ctx => shared.getLivingEnemyHeroes(ctx).length === 0, 1),
                        tg.seq([
                            useAbilityStep(ctx => ctx[CustomNpcKeys.Juggernaut], ctx => ctx[CustomNpcKeys.Juggernaut], "juggernaut_blade_fury", UnitOrder.CAST_NO_TARGET),
                            useAbilityStep(ctx => ctx[CustomNpcKeys.Tidehunter], ctx => ctx[CustomNpcKeys.Tidehunter], "tidehunter_ravage", UnitOrder.CAST_NO_TARGET),
                            tg.completeOnCheck(ctx => !ctx[CustomNpcKeys.Windrunner].IsStunned(), 1),
                            useAbilityStep(ctx => ctx[CustomNpcKeys.Lion], ctx => ctx[CustomNpcKeys.Windrunner], "lion_impale", UnitOrder.CAST_TARGET),
                            tg.wait(2),
                            useAbilityStep(ctx => ctx[CustomNpcKeys.Lion], ctx => ctx[CustomNpcKeys.Windrunner], "lion_voodoo", UnitOrder.CAST_TARGET),
                        ]),
                    ])
                ]),

                // Enemies teamfight logic
                useAbilityStep(ctx => ctx[CustomNpcKeys.Pudge], _ => playerHero.GetAbsOrigin(), "pudge_meat_hook", UnitOrder.CAST_POSITION),
                tg.seq([
                    tg.forkAny([
                        tg.completeOnCheck(ctx => shared.getLivingEnemyHeroes(ctx).length === 0, 1),
                        tg.fork([
                            useAbilityStep(ctx => ctx[CustomNpcKeys.Wisp], ctx => ctx[CustomNpcKeys.Wisp], "wisp_overcharge", UnitOrder.CAST_NO_TARGET),
                            useAbilityStep(ctx => ctx[CustomNpcKeys.Wisp], ctx => ctx[CustomNpcKeys.Luna], "wisp_tether", UnitOrder.CAST_TARGET),
                            tg.seq([
                                useAbilityStep(ctx => ctx[CustomNpcKeys.Jakiro], ctx => ctx[CustomNpcKeys.Tidehunter], "jakiro_ice_path", UnitOrder.CAST_POSITION),
                                tg.wait(1),
                                useAbilityStep(ctx => ctx[CustomNpcKeys.Jakiro], ctx => ctx[CustomNpcKeys.Tidehunter], "jakiro_macropyre", UnitOrder.CAST_POSITION),
                                tg.wait(1),
                                useAbilityStep(ctx => ctx[CustomNpcKeys.Luna], ctx => ctx[CustomNpcKeys.Luna], "luna_eclipse", UnitOrder.CAST_NO_TARGET),
                            ]),
                            tg.wait(1),
                            useAbilityStep(ctx => ctx[CustomNpcKeys.Windrunner], ctx => ctx[CustomNpcKeys.Tidehunter], "windrunner_shackleshot", UnitOrder.CAST_TARGET),
                            useAbilityStep(ctx => ctx[CustomNpcKeys.Windrunner], _ => playerHero, "windrunner_focusfire", UnitOrder.CAST_TARGET)
                        ]),
                    ])
                ])
            ]),

            // Play win dialog
            tg.immediate(ctx => shared.getLivingFriendlyHeroes(ctx).forEach(hero => hero.StartGesture(GameActivity.DOTA_VICTORY))),
            tg.audioDialog(LocalizationKey.Script_5_5v5_5, LocalizationKey.Script_5_5v5_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            // Add tp scroll
            tg.immediate(_ => playerHero.AddItemByName("item_tpscroll").EndCooldown()),
            tg.audioDialog(LocalizationKey.Script_5_5v5_6, LocalizationKey.Script_5_5v5_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_5v5_7, LocalizationKey.Script_5_5v5_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_5v5_8, LocalizationKey.Script_5_5v5_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            // Wait for player to try to use the tp
            tg.immediate(_ => goalUseTp.start()),
            tg.immediate(_ => waitingForPlayerTp = true),
            tg.completeOnCheck(_ => playerUsedTp, 0.1),
            tg.immediate(_ => goalUseTp.complete()),

            // More dialog about importance of tps and bait player into using voice
            tg.audioDialog(LocalizationKey.Script_5_5v5_9, LocalizationKey.Script_5_5v5_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_5v5_10, LocalizationKey.Script_5_5v5_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_5v5_11, LocalizationKey.Script_5_5v5_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            // Wait for player to use their voice, or not
            tg.immediate(_ => goalPromiseCarryTp.start()),
            tg.forkAny([
                tg.seq([
                    tg.waitForVoiceChat(),
                    tg.immediate(_ => voicePressed = true),
                    tg.audioDialog(LocalizationKey.Script_5_5v5_12, LocalizationKey.Script_5_5v5_12, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                ]),
                tg.seq([
                    tg.wait(6),
                    tg.completeOnCheck(_ => !voicePressed, 0.1),
                    tg.audioDialog(LocalizationKey.Script_5_5v5_13, LocalizationKey.Script_5_5v5_13, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                ])
            ]),
            tg.immediate(_ => goalPromiseCarryTp.complete()),

            // Actually tp the player to the fountain
            tg.immediate(_ => freezePlayerHero(true)),
            tg.immediate(_ => playerHero.RemoveItem(getOrError(playerHero.FindItemInInventory("item_tpscroll"), "Could not find tp scroll"))),
            tg.immediate(_ => playerHero.SetAbsOrigin(radiantFountainLocation)),
            tg.panCameraExponential(_ => getPlayerCameraLocation(), radiantFountainLocation, 2),
            tg.immediate(ctx => shared.disposeHeroes(ctx, shared.allHeroesInfo)),
            tg.immediate(_ => freezePlayerHero(false)),
        ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

function onStop() {
    print("Stopping", sectionName)

    shared.disposeHeroes(GameRules.Addon.context, shared.allHeroesInfo)

    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }
}

function orderFilter(event: ExecuteOrderFilterEvent) {
    if (event.order_type === UnitOrder.CAST_POSITION) {
        // Prevent the player from using their tp.
        const ability = getOrError(EntIndexToHScript(event.entindex_ability) as CDOTABaseAbility | undefined, "Could not get ability")
        if (ability.GetAbilityName() === "item_tpscroll") {
            // Record when the player uses their tp while we're waiting for it.
            if (waitingForPlayerTp) {
                if (Vector(event.position_x, event.position_y).__sub(radiantFountainLocation).Length2D() < 1000) {
                    playerUsedTp = true
                } else {
                    displayDotaErrorMessage("Teleport to your fountain by double-tapping the Town Portal Scroll.")
                }
            }

            return false
        }
    }

    return true
}

export const sectionTeamFight = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    orderFilter,
);

function setupEnemyHeroes(context: tg.TutorialContext) {
    if (unitIsValidAndAlive(context[CustomNpcKeys.Luna])) {
        context[CustomNpcKeys.Luna].AddItemByName("item_butterfly")
        context[CustomNpcKeys.Luna].AddItemByName("item_manta")
        const eclipse = context[CustomNpcKeys.Luna].FindAbilityByName("luna_eclipse")

        if (eclipse)
            eclipse.SetLevel(2)
    }

    if (unitIsValidAndAlive(context[CustomNpcKeys.Wisp])) {
        context[CustomNpcKeys.Wisp].AddItemByName("item_mekansm")
        context[CustomNpcKeys.Wisp].AddItemByName("item_spirit_vessel")
        const overcharge = context[CustomNpcKeys.Wisp].FindAbilityByName("wisp_overcharge")

        if (overcharge)
            overcharge.SetLevel(4)
    }

    if (unitIsValidAndAlive(context[CustomNpcKeys.Jakiro])) {
        context[CustomNpcKeys.Jakiro].AddItemByName("item_ghost")
        context[CustomNpcKeys.Jakiro].AddItemByName("item_glimmer_cape")
        const macroPyre = context[CustomNpcKeys.Jakiro].FindAbilityByName("jakiro_macropyre")

        if (macroPyre)
            macroPyre.SetLevel(2)
    }

    if (unitIsValidAndAlive(context[CustomNpcKeys.Pudge])) {
        context[CustomNpcKeys.Pudge].AddItemByName("item_pipe")
        context[CustomNpcKeys.Pudge].AddItemByName("item_vanguard")
    }

    if (unitIsValidAndAlive(context[CustomNpcKeys.Windrunner])) {
        context[CustomNpcKeys.Windrunner].AddItemByName("item_ultimate_scepter")
        context[CustomNpcKeys.Windrunner].AddItemByName("item_lesser_crit")
        const focusFire = context[CustomNpcKeys.Windrunner].FindAbilityByName("windrunner_focusfire")

        if (focusFire)
            focusFire.SetLevel(2)
    }
}

/**
 * Creates a tutorial step that orders a unit to use an ability. Completes on ability cast.
 * @param unit Unit casting the ability.
 * @param target Target of the ability, entity or Vector position.
 * @param abilityName Name of the ability
 * @param orderType Order type used for casting the ability
 */
const useAbilityStep = (unit: tg.StepArgument<CDOTA_BaseNPC>, target: tg.StepArgument<CDOTA_BaseNPC | Vector>, abilityName: tg.StepArgument<string>, orderType: tg.StepArgument<UnitOrder>) => {
    let checkTimer: string | undefined = undefined

    const cleanup = () => {
        if (checkTimer) {
            Timers.RemoveTimer(checkTimer)
            checkTimer = undefined
        }
    }

    return tg.step((context, complete) => {
        const actualUnit = tg.getArg(unit, context)
        const actualTarget = tg.getArg(target, context)
        const actualAbilityName = tg.getArg(abilityName, context)
        const actualOrderType = tg.getArg(orderType, context)

        const ability = actualUnit.FindAbilityByName(actualAbilityName)

        let order: ExecuteOrderOptions;
        if (ability) {
            if (ability.GetLevel() === 0)
                ability.SetLevel(1)

            order = {
                UnitIndex: actualUnit.GetEntityIndex(),
                OrderType: actualOrderType,
                AbilityIndex: ability.GetEntityIndex(),
            }
        } else {
            error("Invalid ability name " + abilityName + " for hero " + actualUnit.GetName())
        }

        if (typeof actualTarget === typeof CDOTA_BaseNPC) {
            if (orderType === UnitOrder.CAST_TARGET)
                order.TargetIndex = (actualTarget as CDOTA_BaseNPC).GetEntityIndex()
            else
                order.Position = (actualTarget as CDOTA_BaseNPC).GetAbsOrigin()
        } else {
            order.Position = (actualTarget as Vector)
        }

        if (ability.IsCooldownReady())
            ExecuteOrderFromTable(order)
        else
            error("Ability is on cooldown, cannot execute order.")

        // The check for complete is not sufficient and doesn't cover the cases of an invalid/dead caster or target. Can add this later so it can be used as a general purpose step
        const checkAbilityUsed = () => {
            if (!ability.IsCooldownReady()) {
                cleanup()
                complete()
            } else {
                checkTimer = Timers.CreateTimer(0.1, () => checkAbilityUsed())
            }
        }

        checkAbilityUsed()
    }, _ => cleanup())
}
