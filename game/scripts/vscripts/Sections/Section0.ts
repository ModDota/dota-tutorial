import * as tg from "../TutorialGraph/index"
import * as tut from "../Tutorial/Core"

let graph: tg.TutorialStep | undefined = undefined
let graphContext: tg.TutorialContext | undefined = undefined

const start = (complete: () => void) => {
    print("Started section 0")

    // Example tutorial graph.
    // Sequence:
    // 1. Focus camera on dire ancient
    // 2. Focus camera on dragon knight (our hero hopefully)
    // 3. Free camera
    // 4. Wait for hero to go to location (0, 0, 0)
    // 5. Spawn hero at (1000, 0, 0) and wait until it dies
    // 6. Spawn two heroes at (1500, 0, 0) and wait for both of them to die
    graph = tg.seq(
        tg.wait(3),
        tg.setCameraTarget(Entities.FindAllByName("dota_badguys_fort")[0]),
        tg.wait(5),
        tg.setCameraTarget(Entities.FindAllByName("npc_dota_hero_dragon_knight")[0]),
        tg.wait(2),
        tg.setCameraTarget(undefined),
        tg.wait(2),
        tg.goToLocation(Vector(0, 0, 0)),
        tg.spawnAndKillUnit("npc_dota_hero_crystal_maiden", Vector(1000, 0, 0)),
        tg.fork(
            tg.spawnAndKillUnit("npc_dota_hero_luna", Vector(1500, 0, 0)),
            tg.spawnAndKillUnit("npc_dota_hero_luna", Vector(1500, 0, 0))
        )
    )

    graphContext = {}

    graph.start(graphContext, () => {
        print("Section 0 was completed")
        complete()
    })
}

const resetState = () => {
    // TODO: Make sure DK exists at spawn and other stuff (yea stuff...)
}

const stop = () => {
    if (graph) {
        graph.stop(graphContext ?? {})
        graph = undefined
        graphContext = undefined
    }
}

export const section01 = new tut.FunctionalSection("Section01", start, resetState, stop)
export const section02 = new tut.FunctionalSection("Section02", start, resetState, stop)
export const section03 = new tut.FunctionalSection("Section03", start, resetState, stop)
