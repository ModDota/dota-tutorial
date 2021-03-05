import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { freezePlayerHero, getOrError, getPlayerHero, unitIsValidAndAlive } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"
import { GoalTracker } from "../../Goals"

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    slacksLocation: Vector(-6250, -6050, 256),
    requireSunsfanGolem: true,
    heroLevel: 2,
    requireTrees: true,
}

const start = (complete: () => void) => {
    print("Started section leveling")

    const hero = getOrError(getPlayerHero(), "Could not find the player's hero.")

    const goalTracker = new GoalTracker()
    const goalKillPurge = goalTracker.addBoolean("Stun Pugna Purge using your Dragon Tail ability to stop his monologue.")
    const goalLevelDragonTail = goalTracker.addBoolean("Level up your Dragon Tail ability.")
    const goalLevelBreatheFire = goalTracker.addBoolean("Level up your Breathe Fire ability.")

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        tg.textDialog(LocalizationKey.Script_1_Leveling_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 9), // take W
        tg.immediate(_ => goalLevelDragonTail.start()),
        tg.upgradeAbility(getOrError(hero.FindAbilityByName("dragon_knight_dragon_tail"), "Dragon Tail was not found.")),
        tg.immediate(_ => goalLevelDragonTail.complete()),

        tg.textDialog(LocalizationKey.Script_1_Leveling_2, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 4), // hover over abil

        // Spawn purge and freeze player d uring initial dialog
        tg.immediate(_ => freezePlayerHero(true)),
        tg.textDialog(LocalizationKey.Script_1_Leveling_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3), // here comes pugna

        tg.spawnUnit(CustomNpcKeys.PurgePugna, _ => hero.GetAbsOrigin().__add(RandomVector(500)), DotaTeam.BADGUYS, CustomNpcKeys.PurgePugna),
        tg.immediate(ctx => getOrError(ctx[CustomNpcKeys.PurgePugna] as CDOTA_BaseNPC | undefined).SetAttackCapability(UnitAttackCapability.NO_ATTACK)),

        tg.textDialog(LocalizationKey.Script_1_Leveling_4, ctx => ctx[CustomNpcKeys.PurgePugna], 4), // yellow everybody
        tg.textDialog(LocalizationKey.Script_1_Leveling_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 4), // make him stop, press W
        tg.textDialog(LocalizationKey.Script_1_Leveling_6, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 4), // use W

        // Unfreeze player and wait for them to stun purge while he performs his monologue.
        tg.immediate(_ => goalKillPurge.start()),
        tg.immediate(_ => freezePlayerHero(false)),

        tg.forkAny([
            // Loop while purge is alive
            tg.loop(ctx => unitIsValidAndAlive(ctx[CustomNpcKeys.PurgePugna]), tg.seq([
                tg.forkAny([
                    // Play dialog while purge is alive
                    tg.loop(ctx => unitIsValidAndAlive(ctx[CustomNpcKeys.PurgePugna]), tg.textDialog("Very long dialog", ctx => ctx[CustomNpcKeys.PurgePugna], 10)),
                    // Stop long dialog when we get attacked but not stunned. Let purge speak for at least a few seconds too.
                    tg.seq([
                        tg.wait(2),
                        tg.completeOnCheck(ctx => {
                            const purge = ctx[CustomNpcKeys.PurgePugna] as CDOTA_BaseNPC_Hero
                            return !purge.IsStunned() && purge.GetHealthDeficit() > 0
                        }, 0.1),
                    ])
                ]),
                // We escaped the above loop by attacking pugna, please dont interrupt purge!
                tg.textDialog(LocalizationKey.Script_1_Leveling_7, ctx => ctx[CustomNpcKeys.PurgePugna], 2),
                tg.immediate(ctx => {
                    const purge = ctx[CustomNpcKeys.PurgePugna] as CDOTA_BaseNPC
                    if (unitIsValidAndAlive(purge)) {
                        purge.SetHealth(purge.GetMaxHealth())
                    }
                }),
            ])),
            // Exit the outer forkAny when purge gets stunned
            tg.seq([
                tg.completeOnCheck(ctx => {
                    const purge = ctx[CustomNpcKeys.PurgePugna] as CDOTA_BaseNPC_Hero
                    return purge.IsStunned()
                }, 0.1),
            ]),
        ]),

        tg.immediate(_ => goalKillPurge.complete()),

        // Play death dialog and kill purge
        tg.textDialog(LocalizationKey.Script_1_Leveling_8, ctx => ctx[CustomNpcKeys.PurgePugna], 2),
        tg.immediate(ctx => {
            const purge = ctx[CustomNpcKeys.PurgePugna] as CDOTA_BaseNPC_Hero
            purge.ForceKill(false)
        }),

        // Excellent work, skill Q
        tg.textDialog(LocalizationKey.Script_1_Leveling_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 5),
        tg.immediate(_ => hero.HeroLevelUp(true)),
        tg.immediate(_ => goalLevelBreatheFire.start()),
        tg.upgradeAbility(getOrError(hero.GetAbilityByIndex(0), "Breathe Fire was not found.")),
        tg.immediate(_ => goalLevelBreatheFire.complete()),

        // Explain Q and W
        tg.textDialog(LocalizationKey.Script_1_Leveling_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 6),
    ]))

    graph.start(GameRules.Addon.context, () => {
        print("Section leveling was completed")
        complete()
    })
}

const stop = () => {
    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }
}

export const sectionLeveling = new tut.FunctionalSection(SectionName.Chapter1_Leveling, requiredState, start, stop)
