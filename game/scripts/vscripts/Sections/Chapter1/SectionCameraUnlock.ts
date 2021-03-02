import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { getOrError, getPlayerHero, setUnitPacifist } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"
import { GoalTracker } from "../../Goals"

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSunsfanGolem: true,
    requireSlacksGolem: true,
    sunsFanLocation: Vector(-6400, -5900, 256),
    slacksLocation: Vector(-6250, -6050, 256),
}

const targetDummySpawnOffset = Vector(500, 500, 0)

const onStart = (complete: () => void) => {
    const radiantFountain = getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good"))

    const goalTracker = new GoalTracker()
    const goalMoveCamera = goalTracker.addBoolean("Move your camera by dragging the cursor to the edge of your screen.")
    const goalKillDummy = goalTracker.addBoolean("Attack and destroy the target dummy by right-clicking it.")
    const goalKillSunsfan = goalTracker.addBoolean("Attack SUNSfan.")

    graph = tg.withGoals(ctx => goalTracker.getGoals(), tg.seq([
        // Init
        tg.wait(1),
        tg.setCameraTarget(() => undefined),
        tg.immediate(_ => getOrError(getPlayerHero()).SetMoveCapability(UnitMoveCapability.GROUND)), // This line can be removed once the movement section is there.

        // Player should move his camera
        tg.immediate(_ => print("Pre camera movement")),
        tg.immediate(context => goalMoveCamera.start()),
        tg.waitForCameraMovement(),
        tg.immediate(_ => print("Post camera movement")),
        tg.immediate(context => goalMoveCamera.complete()),
        tg.textDialog(LocalizationKey.Script_1_Camera_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.setCameraTarget(_ => getOrError(getPlayerHero())),
        tg.textDialog(LocalizationKey.Script_1_Camera_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),

        // Kill target dummy
        tg.textDialog(LocalizationKey.Script_1_Camera_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),

        tg.fork([
            tg.seq([
                tg.textDialog(LocalizationKey.Script_1_Camera_4, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3), // TODO: Make the dummy say this line
                tg.textDialog(LocalizationKey.Script_1_Camera_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            ]),
            tg.seq([
                tg.immediate(context => goalKillDummy.start()),
                tg.spawnAndKillUnit(CustomNpcKeys.TargetDummy, radiantFountain.GetAbsOrigin().__add(targetDummySpawnOffset)),
                tg.immediate(context => goalKillDummy.complete()),
            ])
        ]),
        tg.textDialog(LocalizationKey.Script_1_Camera_6, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3), // TODO: Make the dummy say this line
        tg.textDialog(LocalizationKey.Script_1_Camera_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),

        // Kill SUNSfan
        tg.immediate(context => goalKillSunsfan.start()),
        tg.immediate(context => setUnitPacifist(getOrError(context[CustomNpcKeys.SunsFanMudGolem]), false)),
        tg.immediate(context => getOrError(context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC).SetTeam(DotaTeam.NEUTRALS)),
        tg.forkAny([
            // Show a dialog after 10 seconds if the player didn't attack yet encouraging them.
            tg.seq([
                tg.wait(10),
                tg.textDialog(LocalizationKey.Script_1_Camera_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
                tg.neverComplete()
            ]),
            tg.completeOnCheck(context => {
                const golem = getOrError(context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC | undefined)
                return !IsValidEntity(golem) || !golem.IsAlive() || golem.GetHealth() < golem.GetMaxHealth()
            }, 0.2)
        ]),
        tg.immediate(context => goalKillSunsfan.complete()),
        tg.textDialog(LocalizationKey.Script_1_Camera_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Camera_10, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.immediate(_ => getOrError(getPlayerHero()).HeroLevelUp(true)),
        tg.wait(1),
    ]))

    graph.start(GameRules.Addon.context, () => {
        complete()
    })
}

const onStop = () => {
    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }
}

export const sectionCameraUnlock = new tut.FunctionalSection(SectionName.Chapter1_CameraUnlock, requiredState, onStart, onStop)
