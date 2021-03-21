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
    const goalMoveCamera = goalTracker.addBoolean(LocalizationKey.Goal_1_Camera_1)
    const goalKillDummy = goalTracker.addBoolean(LocalizationKey.Goal_1_Camera_2)
    const goalKillSunsfan = goalTracker.addBoolean(LocalizationKey.Goal_1_Camera_3)

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        tg.immediate(_ => goalMoveCamera.start()),
        tg.waitForCameraMovement(),
        tg.immediate(_ => goalMoveCamera.complete()),

        // Lock camera on hero and play some dialog
        tg.audioDialog(LocalizationKey.Script_1_Camera_1, LocalizationKey.Script_1_Camera_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.setCameraTarget(_ => getOrError(getPlayerHero())),
        tg.audioDialog(LocalizationKey.Script_1_Camera_2, LocalizationKey.Script_1_Camera_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

        // Spawn dummy, pacify it and play some dialog about it. Focus camera on the dummy during this.
        tg.audioDialog(LocalizationKey.Script_1_Camera_3, LocalizationKey.Script_1_Camera_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.spawnUnit(CustomNpcKeys.TargetDummy, radiantFountain.GetAbsOrigin().__add(targetDummySpawnOffset), DOTATeam_t.DOTA_TEAM_NEUTRALS, CustomNpcKeys.TargetDummy, true),
        tg.immediate(ctx => setUnitPacifist(ctx[CustomNpcKeys.TargetDummy], true)),
        tg.setCameraTarget(ctx => ctx[CustomNpcKeys.TargetDummy]),
        tg.textDialog(LocalizationKey.Ogre_Spawn, ctx => ctx[CustomNpcKeys.TargetDummy], 3),
        tg.forkAny([
            tg.seq([
                tg.audioDialog(LocalizationKey.Script_1_Camera_5, LocalizationKey.Script_1_Camera_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.neverComplete()
            ]),
            tg.seq([
                // Start goal, remove pacifist modifier from dummy and focus the camera on the hero again.
                tg.immediate(_ => goalKillDummy.start()),
                tg.immediate(ctx => {
                    getOrError(getPlayerHero()).SetIdleAcquire(false)
                    setUnitPacifist(ctx[CustomNpcKeys.TargetDummy], false)
                }),
                tg.setCameraTarget(_ => getOrError(getPlayerHero())),
                // Wait for player to kill the dummy
                tg.completeOnCheck(ctx => !ctx[CustomNpcKeys.TargetDummy] || !IsValidEntity(ctx[CustomNpcKeys.TargetDummy]) || !ctx[CustomNpcKeys.TargetDummy].IsAlive(), 0.2),
            ])
        ]),
        tg.immediate(_ => goalKillDummy.complete()),

        // Target dummy died dialog
        tg.textDialog(LocalizationKey.Ogre_Die, ctx => ctx[CustomNpcKeys.TargetDummy], 3),
        tg.forkAny([
            tg.seq([
                tg.audioDialog(LocalizationKey.Script_1_Camera_7, LocalizationKey.Script_1_Camera_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                // Show a dialog after 10 seconds if the player didn't attack yet encouraging them.
                tg.wait(10),
                tg.audioDialog(LocalizationKey.Script_1_Camera_8, LocalizationKey.Script_1_Camera_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.neverComplete()
            ]),
            tg.seq([
                // MAke SUNSfan attackable
                tg.immediate(_ => goalKillSunsfan.start()),
                tg.immediate(_ => getOrError(getPlayerHero()).SetIdleAcquire(false)),
                tg.immediate(context => setUnitPacifist(getOrError(context[CustomNpcKeys.SunsFanMudGolem]), false)),
                tg.immediate(context => getOrError(context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC).SetTeam(DOTATeam_t.DOTA_TEAM_NEUTRALS)),
                // Wait for player to kill SUNSfan.
                tg.completeOnCheck(context => {
                    const golem = getOrError(context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC | undefined)
                    return !IsValidEntity(golem) || !golem.IsAlive()
                }, 0.2)
            ])
        ]),
        tg.immediate(_ => {
            goalKillSunsfan.complete()
            getOrError(getPlayerHero()).SetIdleAcquire(true)
        }),
        // Death dialog
        tg.audioDialog(LocalizationKey.Script_1_Camera_9, LocalizationKey.Script_1_Camera_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_1_Camera_10, LocalizationKey.Script_1_Camera_10, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

        // Level up and done
        tg.immediate(_ => getOrError(getPlayerHero()).HeroLevelUp(true)),
    ]))

    graph.start(GameRules.Addon.context, () => {
        complete()
    })
}

const onStop = () => {
    getOrError(getPlayerHero()).SetIdleAcquire(true)

    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }
}

export const sectionCameraUnlock = new tut.FunctionalSection(SectionName.Chapter1_CameraUnlock, requiredState, onStart, onStop)
