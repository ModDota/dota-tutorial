import * as tg from "../TutorialGraph/index"
import * as tut from "../Tutorial/Core"
import { getOrError, getPlayerHero, setUnitPacifist } from "../util"
import { SectionState } from "./SectionState"

let graph: tg.TutorialStep | undefined = undefined
const sectionCameraUnlockState: SectionState = {
    requireMudgolems: true,
    mudGolemsLocations: {
        sunsFanLocation: Vector(-6400, -5900, 0),
        slacksLocation: Vector(-6250, -6050, 0)
    }
}

enum CameraUnlockContextKey {
    CameraMove,
    KillDummy,
    KillSunsfan,
}

enum GoalState {
    Started,
    Completed
}

const targetDummySpawnOffset = Vector(500, 500, 0)

const onStart = (complete: () => void) => {
    const radiantFountain = getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good"))

    let sunsfanAttackableTime: number | undefined = undefined

    // Return a list of goals to display depending on which parts we have started and completed.
    const getGoals = (context: tg.TutorialContext) => {
        const isGoalStarted = (key: CameraUnlockContextKey) => context[key] === GoalState.Started || context[key] === GoalState.Completed
        const isGoalCompleted = (key: CameraUnlockContextKey) => context[key] === GoalState.Completed

        const goals: Goal[] = []
        const addGoal = (key: CameraUnlockContextKey, text: string) => {
            if (isGoalStarted(key)) {
                goals.push({ text: text, completed: isGoalCompleted(key) })
            }
        }

        addGoal(CameraUnlockContextKey.CameraMove, "Move your camera by dragging the cursor to the edge of your screen.")
        addGoal(CameraUnlockContextKey.KillDummy, "Attack and destroy the target dummy by right-clicking it.")
        addGoal(CameraUnlockContextKey.KillSunsfan, "Attack SUNSfan.")

        return goals
    }

    // Track the goals and do the main action in parallel. When the main action is done forkAny() will complete and clear the goals.
    graph = tg.forkAny([
        tg.trackGoals(getGoals),
        tg.seq([
            // Init
            tg.wait(1),
            tg.setCameraTarget(() => undefined),
            tg.immediate(_ => getOrError(getPlayerHero()).SetMoveCapability(UnitMoveCapability.GROUND)), // This line can be removed once the movement section is there.

            // Player should move his camera
            tg.immediate(_ => print("Pre camera movement")),
            tg.immediate(context => context[CameraUnlockContextKey.CameraMove] = GoalState.Started),
            tg.waitForCameraMovement(),
            tg.immediate(_ => print("Post camera movement")),
            tg.immediate(context => context[CameraUnlockContextKey.CameraMove] = GoalState.Completed),
            tg.playGlobalSound("abaddon_abad_spawn_01", true),
            tg.setCameraTarget(_ => getOrError(getPlayerHero())),
            tg.wait(2),
            tg.playGlobalSound("abaddon_abad_spawn_01", true), // need to move camera while moving hero

            // Kill target dummy
            tg.playGlobalSound("abaddon_abad_spawn_01", true), // heres a target dummy
            tg.immediate(context => context[CameraUnlockContextKey.KillDummy] = GoalState.Started),
            tg.spawnAndKillUnit(CustomNpcKeys.TargetDummy, radiantFountain.GetAbsOrigin().__add(targetDummySpawnOffset)),
            tg.immediate(context => context[CameraUnlockContextKey.KillDummy] = GoalState.Completed),
            tg.wait(1),
            tg.playGlobalSound("abaddon_abad_spawn_01", true), // that was violent

            // Kill SUNSfan
            tg.immediate(context => context[CameraUnlockContextKey.KillSunsfan] = GoalState.Started),
            tg.wait(1),
            tg.immediate(context => setUnitPacifist(getOrError(context[CustomNpcKeys.SunsFanMudGolem]), false)),
            tg.immediate(context => getOrError(context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC).SetTeam(DotaTeam.NEUTRALS)),
            tg.playGlobalSound("abaddon_abad_spawn_01"), // why health bar over head
            tg.immediate(_ => sunsfanAttackableTime = GameRules.GetGameTime()),
            tg.completeOnCheck(context => {
                const golem = getOrError(context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC | undefined)

                const attacked = !golem.IsAlive() || golem.GetHealth() < golem.GetMaxHealth()

                // Play a sound if the player didn't attack SUNSfan golem for 10 seconds
                if (!attacked && sunsfanAttackableTime && GameRules.GetGameTime() - sunsfanAttackableTime > 10) {
                    EmitGlobalSound("abaddon_abad_spawn_01") // come on / attack the man
                    sunsfanAttackableTime = undefined
                }

                return attacked
            }, 0.2),
            tg.immediate(context => context[CameraUnlockContextKey.KillSunsfan] = GoalState.Completed),
            tg.immediate(_ => sunsfanAttackableTime = undefined),
            tg.playGlobalSound("abaddon_abad_spawn_01", true), // what are you doing
            tg.immediate(_ => getOrError(getPlayerHero()).HeroLevelUp(true)),
            tg.wait(1),
        ])
    ])

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

export const sectionCameraUnlock = new tut.FunctionalSection(
    SectionName.CameraUnlock,
    sectionCameraUnlockState,
    onStart,
    onStop
)
