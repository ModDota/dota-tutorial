import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import * as shared from "./Shared"
import { displayDotaErrorMessage, freezePlayerHero, getOrError, getPlayerCameraLocation, getPlayerHero } from "../../util";

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
}

const radiantFountainLocation = Vector(-6850, -6500, 384)
const totalEnemyCount = shared.enemyHeroesInfo.length

let playerUsedTp = false
let waitingForPlayerTp = false

function onStart(complete: () => void) {
    print("Starting", sectionName)

    const goalTracker = new GoalTracker()
    const goalSpotEnemies = goalTracker.addBoolean("Find out what awaits you outside the pit")
    const goalKillEnemyHeroes = goalTracker.addNumeric("Kill all enemy heroes", totalEnemyCount)
    const goalPromiseCarryTp = goalTracker.addBoolean("Use voice-chat (default 'V') to promise you will always carry a tp.")

    const playerHero = getOrError(getPlayerHero(), "Could not get player hero")

    let voicePressed = false

    playerUsedTp = false
    waitingForPlayerTp = false

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            shared.spawnFriendlyHeroes(shared.outsidePitLocation),
            shared.spawnEnemyHeroes(shared.enemyLocation),

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
            tg.immediate(ctx => shared.getLivingHeroes(ctx).forEach(hero => {
                ExecuteOrderFromTable({
                    OrderType: UnitOrder.ATTACK_MOVE,
                    Position: (hero.GetTeam() === DotaTeam.GOODGUYS ? shared.enemyLocation : shared.outsidePitLocation).__add(RandomVector(300)),
                    UnitIndex: hero.entindex(),
                })
            })),

            // Wait for every enemy to die
            // TODO: Add logic for if the player dies (although not a disaster atm. either since they just respawn)
            tg.loop(ctx => shared.getLivingEnemyHeroes(ctx).length > 0, ctx => tg.seq([
                tg.immediate(_ => goalKillEnemyHeroes.setValue(totalEnemyCount - shared.getLivingEnemyHeroes(ctx).length)),
                tg.wait(1),
            ])),
            tg.immediate(_ => goalKillEnemyHeroes.setValue(totalEnemyCount)),
            tg.immediate(_ => goalKillEnemyHeroes.complete()),

            // Play win dialog
            tg.immediate(ctx => shared.getLivingFriendlyHeroes(ctx).forEach(hero => hero.StartGesture(GameActivity.DOTA_VICTORY))),
            tg.audioDialog(LocalizationKey.Script_5_5v5_5, LocalizationKey.Script_5_5v5_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            // Add tp scroll
            tg.immediate(_ => playerHero.AddItemByName("item_tpscroll").EndCooldown()),
            tg.audioDialog(LocalizationKey.Script_5_5v5_6, LocalizationKey.Script_5_5v5_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_5v5_7, LocalizationKey.Script_5_5v5_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_5v5_8, LocalizationKey.Script_5_5v5_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            // Wait for player to try to use the tp
            tg.immediate(_ => waitingForPlayerTp = true),
            tg.completeOnCheck(_ => playerUsedTp, 0.1),

            // More dialog about importance of tps and bait player into using voice
            tg.audioDialog(LocalizationKey.Script_5_5v5_9, LocalizationKey.Script_5_5v5_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_5v5_10, LocalizationKey.Script_5_5v5_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_5v5_11, LocalizationKey.Script_5_5v5_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            // Wait for player to use their voice, or not
            tg.immediate(_ => goalPromiseCarryTp.start()),
            tg.forkAny([
                tg.seq([
                    tg.waitForCommand(37), // Team voice
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
            tg.immediate(ctx => shared.disposeHeroes(ctx)),
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

    shared.disposeHeroes(GameRules.Addon.context)

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
