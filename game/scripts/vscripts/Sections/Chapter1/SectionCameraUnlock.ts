import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { freezePlayerHero, getOrError, getPlayerHero, setUnitPacifist } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"
import { GoalTracker } from "../../Goals"
import { slacksFountainLocation, sunsfanFountainLocation } from "./Shared"

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: slacksFountainLocation,
    sunsFanLocation: sunsfanFountainLocation,
    requireFountainTrees: true,
}

const targetDummySpawnOffset = Vector(500, 500, 0)

const onStart = (complete: () => void) => {
    const radiantFountain = getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good"))

    const goalTracker = new GoalTracker()
    const goalMoveCamera = goalTracker.addBoolean("Move your camera by dragging the cursor to the edge of your screen.")
    const goalKillDummy = goalTracker.addBoolean("Attack and destroy the target dummy by right-clicking it.")
    const goalKillSunsfan = goalTracker.addBoolean("Attack SUNSfan.")

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        // Unlock player camera and wait for player to move their camera a bit
        tg.setCameraTarget(() => undefined),
        tg.immediate(_ => goalMoveCamera.start()),
        tg.waitForCameraMovement(),
        tg.immediate(_ => goalMoveCamera.complete()),

        // Lock camera on hero and play some dialog
        tg.textDialog(LocalizationKey.Script_1_Camera_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.setCameraTarget(_ => getOrError(getPlayerHero())),
        tg.textDialog(LocalizationKey.Script_1_Camera_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 5),

        // Spawn dummy and play some dialog about it. Freeze the hero during this and focus camera on the dummy.
        tg.immediate(_ => freezePlayerHero(true)),
        tg.textDialog(LocalizationKey.Script_1_Camera_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.spawnUnit(CustomNpcKeys.TargetDummy, radiantFountain.GetAbsOrigin().__add(targetDummySpawnOffset), DotaTeam.NEUTRALS, CustomNpcKeys.TargetDummy, true),
        tg.setCameraTarget(ctx => ctx[CustomNpcKeys.TargetDummy]),
        tg.textDialog(LocalizationKey.Script_1_Camera_4, ctx => ctx[CustomNpcKeys.TargetDummy], 3),
        tg.textDialog(LocalizationKey.Script_1_Camera_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),

        // Unfreeze the hero and focus the camera on it again.
        tg.setCameraTarget(_ => getOrError(getPlayerHero())),
        tg.immediate(_ => freezePlayerHero(false)),

        // Wait for player to kill the dummy
        tg.immediate(_ => goalKillDummy.start()),
        tg.completeOnCheck(ctx => !ctx[CustomNpcKeys.TargetDummy] || !IsValidEntity(ctx[CustomNpcKeys.TargetDummy]) || !ctx[CustomNpcKeys.TargetDummy].IsAlive(), 0.2),
        tg.immediate(_ => goalKillDummy.complete()),

        // Target dummy died dialog
        tg.textDialog(LocalizationKey.Script_1_Camera_6, ctx => ctx[CustomNpcKeys.TargetDummy], 3),
        tg.textDialog(LocalizationKey.Script_1_Camera_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),

        // MAke SUNSfan attackable
        tg.immediate(_ => goalKillSunsfan.start()),
        tg.immediate(context => setUnitPacifist(getOrError(context[CustomNpcKeys.SunsFanMudGolem]), false)),
        tg.immediate(context => getOrError(context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC).SetTeam(DotaTeam.NEUTRALS)),

        // Wait for player to kill SUNSfan.
        tg.forkAny([
            // Show a dialog after 10 seconds if the player didn't attack yet encouraging them.
            tg.seq([
                tg.wait(10),
                tg.textDialog(LocalizationKey.Script_1_Camera_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
                tg.neverComplete()
            ]),
            tg.completeOnCheck(context => {
                const golem = getOrError(context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC | undefined)
                return !IsValidEntity(golem) || !golem.IsAlive()
            }, 0.2)
        ]),
        tg.immediate(_ => goalKillSunsfan.complete()),

        // Death dialog
        tg.textDialog(LocalizationKey.Script_1_Camera_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Camera_10, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),

        // Level up and done
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
