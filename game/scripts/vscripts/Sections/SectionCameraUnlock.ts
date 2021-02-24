import * as tg from "../TutorialGraph/index"
import * as tut from "../Tutorial/Core"

let graph: tg.TutorialStep | undefined = undefined
let graphContext: tg.TutorialContext | undefined = undefined

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: SectionName.CameraUnlock })

    graph = tg.seq(
        tg.immediate(_ => print("Pre camera movement")),
        tg.waitForCameraMovement(),
        tg.immediate(_ => print("Post camera movement")),
    )

    graphContext = {}

    graph.start(graphContext, () => {

        complete()
    })
}

const onSkipTo = () => {
    // TODO: Make sure DK exists at spawn and other stuff (yea stuff...)
}

const onStop = () => {
    if (graph) {
        graph.stop(graphContext ?? {})
        graph = undefined
        graphContext = undefined
    }
}

export const sectionCameraUnlock = new tut.FunctionalSection(SectionName.CameraUnlock, onStart, onSkipTo, onStop)
