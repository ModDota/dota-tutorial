import * as tg from "../TutorialGraph/index"
import * as tut from "../Tutorial/Core"
import { getPlayerHero } from "../util"

let graph: tg.TutorialStep | undefined = undefined
let graphContext: tg.TutorialContext

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: SectionName.Opening })

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    const mudGolemMeetPosition = playerHero.GetAbsOrigin().__add(Vector(300, 800, 0))

    graph = tg.seq(
        tg.immediate(() => playerHero.SetMoveCapability(UnitMoveCapability.NONE)),
        tg.setCameraTarget(() => playerHero),
        tg.spawnUnit(CustomNpcKeys.SlacksMudGolem,
            playerHero.GetAbsOrigin().__add(Vector(0, 1500, 0)),
            DotaTeam.GOODGUYS,
            CustomNpcKeys.SlacksMudGolem),
        tg.spawnUnit(CustomNpcKeys.SunsFanMudGolem,
            playerHero.GetAbsOrigin().__add(Vector(1500, 500, 0)),
            DotaTeam.GOODGUYS,
            CustomNpcKeys.SunsFanMudGolem),
        tg.fork(
            tg.seq(
                tg.moveUnit(() => graphContext[CustomNpcKeys.SlacksMudGolem], mudGolemMeetPosition),
                tg.faceTowards(() => graphContext[CustomNpcKeys.SlacksMudGolem], playerHero.GetAbsOrigin()),
            ),
            tg.seq(
                tg.moveUnit(() => graphContext[CustomNpcKeys.SunsFanMudGolem], mudGolemMeetPosition.__add(Vector(150, -150, 0))),
                tg.faceTowards(() => graphContext[CustomNpcKeys.SunsFanMudGolem], playerHero.GetAbsOrigin()),
            ),
            tg.seq(
                tg.setCameraTarget(() => graphContext[CustomNpcKeys.SlacksMudGolem]),
                tg.wait(3),
                tg.setCameraTarget(() => graphContext[CustomNpcKeys.SunsFanMudGolem]),
            )
        ),
        tg.wait(2),
        tg.setCameraTarget(() => Entities.FindAllByName("dota_badguys_fort")[0]),
        tg.wait(5),
        tg.setCameraTarget(() => playerHero),
    )

    graphContext = {}

    graph.start(graphContext, () => {
        print("Completed", "Section Opening")
        complete()
    })
}

const onSkipTo = () => {
    print("Skipping to", "Section Opening");
    if (!getPlayerHero()) error("Could not find the player's hero.");

    clearMudGolems()
}

const onStop = () => {
    print("Stopping", "Section Opening");

    clearMudGolems()

    if (graph) {
        graph.stop(graphContext ?? {})
        graph = undefined
        graphContext = {}
    }
}

const clearMudGolems = () => {
    if (graphContext[CustomNpcKeys.SlacksMudGolem])
        graphContext[CustomNpcKeys.SlacksMudGolem].RemoveSelf()

    if (graphContext[CustomNpcKeys.SunsFanMudGolem])
        graphContext[CustomNpcKeys.SunsFanMudGolem].RemoveSelf()
}

export const sectionOpening = new tut.FunctionalSection(SectionName.Opening, onStart, onSkipTo, onStop)
