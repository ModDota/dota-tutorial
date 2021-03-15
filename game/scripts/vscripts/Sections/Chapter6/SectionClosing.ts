import * as tut from "../../Tutorial/Core"
import * as tg from "../../TutorialGraph/index"
import { RequiredState } from "../../Tutorial/RequiredState"
import { GoalTracker } from "../../Goals"
import { centerCameraOnHero, getOrError, getPlayerHero, removeContextEntityIfExists } from "../../util"

const sectionName: SectionName = SectionName.Chapter6_Closing

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-6980, -6000, 384),
    sunsFanLocation: Vector(-6250, -5950, 256),

    heroLocation: Vector(-6850, -6500, 384),
    heroLocationTolerance: 2000,
    heroLevel: 25,
    heroAbilityMinLevels: [4, 4, 4, 3],
    heroItems: {
        "item_greater_crit": 1,
        "item_assault": 1,
        "item_power_treads": 1,
        "item_heart": 1,
        "item_aegis": 1,
    },
}

const npcInfo = [
    //{ name: CustomNpcKeys.ODPixelMudGolem, location: Vector(-7250, -6300, 384) },
    { name: CustomNpcKeys.PurgePugna, location: Vector(-7250, -6500, 384) },
    { name: CustomNpcKeys.GodzMudGolem, location: Vector(-7250, -6700, 384) },
]

const getNpcs = (ctx: tg.TutorialContext): CDOTA_BaseNPC[] => npcInfo.map(info => ctx[info.name])

const spawnNpcs = () => tg.fork(npcInfo.map(info => tg.spawnUnit(info.name, info.location, DotaTeam.GOODGUYS, info.name, true)))

const clearNpcs = (ctx: tg.TutorialContext) => npcInfo.forEach(info => removeContextEntityIfExists(ctx, info.name))

function onStart(complete: () => void) {
    print("Starting", sectionName)

    const goalTracker = new GoalTracker()

    const playerHero = getOrError(getPlayerHero(), "Can not get player hero")

    const slacks = (GameRules.Addon.context[CustomNpcKeys.SlacksMudGolem] as CDOTA_BaseNPC)
    const sunsFan = (GameRules.Addon.context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC)

    // Make Slacks and SUNSfan invisible at the start until we fade back in
    slacks.AddNoDraw()
    sunsFan.AddNoDraw()

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        // Fade to black and wait some time until the clients are hopefully faded out.
        tg.immediate(_ => CustomGameEventManager.Send_ServerToAllClients("fade_screen", {})),
        tg.wait(1.5),

        // Spawn our NPCs and make Slacks and SUNSfan visible again
        spawnNpcs(),
        tg.immediate(_ => slacks.RemoveNoDraw()),
        tg.immediate(_ => sunsFan.RemoveNoDraw()),
        tg.immediate(_ => centerCameraOnHero()),

        // Wait to fade back in
        tg.wait(2),

        // Main logic
        tg.fork([
            // Play dialog
            tg.seq([
                tg.audioDialog(LocalizationKey.Script_6_Closing_1, LocalizationKey.Script_6_Closing_1, slacks),
                tg.audioDialog(LocalizationKey.Script_6_Closing_2, LocalizationKey.Script_6_Closing_2, sunsFan),
                tg.audioDialog(LocalizationKey.Script_6_Closing_3, LocalizationKey.Script_6_Closing_3, slacks),
                tg.audioDialog(LocalizationKey.Script_6_Closing_4, LocalizationKey.Script_6_Closing_4, sunsFan),
            ]),

            // Make everyone stare at you, little bit creepy
            tg.loop(true, tg.seq([
                tg.completeOnCheck(_ => playerHero.IsIdle(), 0.1),
                tg.immediate(ctx => getNpcs(ctx).forEach(npc => npc.FaceTowards(playerHero.GetAbsOrigin()))),
                tg.wait(0.1),
            ])),
        ]),

        // Should never happen currently
        tg.immediate(ctx => clearNpcs(ctx)),
    ]))

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

function onStop() {
    print("Stopping", sectionName)

    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }

    const slacks = (GameRules.Addon.context[CustomNpcKeys.SlacksMudGolem] as CDOTA_BaseNPC)
    const sunsFan = (GameRules.Addon.context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC)

    slacks.RemoveNoDraw()
    sunsFan.RemoveNoDraw()
}

export const sectionClosing = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop
)
