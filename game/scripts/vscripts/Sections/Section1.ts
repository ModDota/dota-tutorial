import * as tg from "../TutorialGraph/index"
import * as tut from "../Tutorial/Core"
import { getPlayerHero } from "../util"

let graph: tg.TutorialStep | undefined = undefined
let graphContext: tg.TutorialContext

enum Section01EntityKeys {
    CustomMudGolem = "npc_custom_mud_golem",
    MudGolemTop = "mud_golem_top",
    MudGolemBot = "mud_golem_bot"
}

const onStart = (complete: () => void) => {
    print("Starting", "Section01");
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: SectionName.Section01 })

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    let mudGolemMeetPosition = playerHero.GetAbsOrigin().__add(Vector(300, 800, 0))

    graph = tg.seq(
        tg.setUnitMoveCapability(() => playerHero, UnitMoveCapability.NONE),
        tg.setCameraTarget(() => playerHero),
        tg.spawnAndMoveUnit(Section01EntityKeys.CustomMudGolem, 
            playerHero.GetAbsOrigin().__add(Vector(0, 1500, 0)), 
            mudGolemMeetPosition,
            DotaTeam.GOODGUYS,
            Section01EntityKeys.MudGolemTop),
        tg.spawnAndMoveUnit(Section01EntityKeys.CustomMudGolem, 
            playerHero.GetAbsOrigin().__add(Vector(1500, 500, 0)),
            mudGolemMeetPosition.__add(Vector(150, -150, 0)), 
            DotaTeam.GOODGUYS,
            Section01EntityKeys.MudGolemBot),
        tg.setCameraTarget(() => graphContext[Section01EntityKeys.MudGolemTop]),
        tg.wait(3),
        tg.setCameraTarget(() => graphContext[Section01EntityKeys.MudGolemBot]),
        tg.faceTowards(Section01EntityKeys.MudGolemTop, playerHero.GetAbsOrigin()),
        tg.faceTowards(Section01EntityKeys.MudGolemBot, playerHero.GetAbsOrigin()),
        tg.wait(2),
        tg.setCameraTarget(() => Entities.FindAllByName("dota_badguys_fort")[0]),
        tg.wait(5),
        tg.setCameraTarget(() => playerHero),
    )

    graphContext = {}

    graph.start(graphContext, () => {
        print("Completed", "Section01")
        complete()
    })
}

const onSkipTo = () => {
    print("Skipping to", "Section01");
    if (!getPlayerHero()) error("Could not find the player's hero.");

    if (graphContext[Section01EntityKeys.MudGolemTop])
        graphContext[Section01EntityKeys.MudGolemTop].RemoveSelf()
    
    if (graphContext[Section01EntityKeys.MudGolemBot])
        graphContext[Section01EntityKeys.MudGolemBot].RemoveSelf()
}

const onStop = () => {
    print("Stopping", "Section01");
    if (graph) {
        graph.stop(graphContext ?? {})
        graph = undefined
        graphContext = {}
    }
}

export const section01 = new tut.FunctionalSection("Section01", onStart, onSkipTo, onStop)
