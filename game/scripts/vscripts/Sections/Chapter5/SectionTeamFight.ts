import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import * as shared from "./Shared"
import { freezePlayerHero, getOrError, getPlayerCameraLocation, getPlayerHero } from "../../util";

const sectionName: SectionName = SectionName.Chapter5_TeamFight;

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: shared.outsidePitLocation,
    heroLocationTolerance: 400,
    heroLevel: 25,
    heroAbilityMinLevels: [4, 4, 4, 3],
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

function onStart(complete: () => void) {
    print("Starting", sectionName)
    const goalTracker = new GoalTracker()
    const goalSpotEnemies = goalTracker.addBoolean("Find out what awaits you outside the pit")
    const goalKillEnemyHeroes = goalTracker.addNumeric("Kill all enemy heroes", 5)

    const playerHero = getOrError(getPlayerHero(), "Could not get player hero")

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            shared.spawnFriendlyHeroes(shared.outsidePitLocation),
            shared.spawnEnemyHeroes(shared.enemyLocation),

            // Pan to enemies and back while dialog is playing

            tg.immediate(_ => GameRules.SetTimeOfDay(0.5)),
            tg.immediate(_ => goalSpotEnemies.start()),
            tg.immediate(_ => freezePlayerHero(true)),
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_5_5v5_1, LocalizationKey.Script_5_5v5_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.seq([
                    tg.panCameraExponential(_ => getPlayerCameraLocation(), shared.enemyLocation, 2),
                    tg.wait(1),
                    tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), 2),
                ])
            ]),
            tg.immediate(_ => goalSpotEnemies.complete()),
            tg.immediate(_ => freezePlayerHero(false)),

            // Start teamfight
            tg.immediate(_ => goalKillEnemyHeroes.start()),
            tg.immediate(ctx => shared.getLivingHeroes(ctx).forEach(hero => {
                ExecuteOrderFromTable({
                    OrderType: UnitOrder.ATTACK_MOVE,
                    Position: (hero.GetTeam() === DotaTeam.GOODGUYS ? shared.enemyLocation : shared.outsidePitLocation).__add(RandomVector(300)),
                    UnitIndex: hero.entindex(),
                })
            })),

            // Wait for every enemy to die
            tg.loop(ctx => shared.getLivingEnemyHeroes(ctx).length > 0, ctx => tg.seq([
                tg.immediate(_ => goalKillEnemyHeroes.setValue(5 - shared.getLivingEnemyHeroes(ctx).length)),
                tg.wait(1),
            ])),
            tg.immediate(_ => goalKillEnemyHeroes.complete()),

            // Play win dialog
            tg.immediate(ctx => shared.getLivingFriendlyHeroes(ctx).forEach(hero => hero.StartGesture(GameActivity.DOTA_VICTORY))),
            tg.audioDialog(LocalizationKey.Script_5_5v5_5, LocalizationKey.Script_5_5v5_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
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

export const sectionTeamFight = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
);
