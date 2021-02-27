import * as tg from "../TutorialGraph/index"
import * as tut from "../Tutorial/Core"
import { getOrError, getPlayerHero, setUnitPacifist } from "../util"
import { SectionState } from "./SectionState"

let graph: tg.TutorialStep | undefined = undefined
const sectionCameraUnlockState: SectionState  = {
    requireMudgolems: true,
    mudGolemsLocations: {
        sunsFanLocation: Vector(-6400, -5900, 0),
        slacksLocation: Vector(-6250, -6050, 0)
    }
}

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: SectionName.CameraUnlock })

    const radiantFountain = getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good"))

    let sunsfanAttackableTime: number | undefined = undefined

    graph = tg.seq(
        tg.wait(1),
        tg.setCameraTarget(() => undefined),
        tg.immediate(_ => getOrError(getPlayerHero()).SetMoveCapability(UnitMoveCapability.GROUND)), // This line can be removed once the movement section is there.
        tg.immediate(_ => print("Pre camera movement")),
        tg.waitForCameraMovement(),
        tg.immediate(_ => print("Post camera movement")),
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // where are you going
        tg.setCameraTarget(_ => getOrError(getPlayerHero())),
        tg.wait(2),
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // need to move camera while moving hero
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // heres a target dummy
        // TODO: Use dummy unit
        tg.spawnAndKillUnit("npc_dota_observer_wards", radiantFountain.GetAbsOrigin().__add(Vector(500, 0, 0))),
        tg.wait(1),
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // that was violent
        tg.wait(1),
        tg.immediate(context => setUnitPacifist(getOrError(context[CustomNpcKeys.SunsFanMudGolem]), false)),
        tg.immediate(context => getOrError(context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC).SetTeam(DotaTeam.NEUTRALS)),
        tg.playGlobalSound("abaddon_abad_spawn_01"), // why health bar over head
        tg.immediate(_ => sunsfanAttackableTime = GameRules.GetGameTime()),
        tg.completeOnCheck(context => {
            const golem = getOrError(context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC | undefined)

            const attacked = golem.GetHealth() < golem.GetMaxHealth()

            // Play a sound if the player didn't attack SUNSfan golem for 10 seconds
            if (!attacked && sunsfanAttackableTime && GameRules.GetGameTime() - sunsfanAttackableTime > 10) {
                EmitGlobalSound("abaddon_abad_spawn_01") // come on / attack the man
                sunsfanAttackableTime = undefined
            }

            return attacked
        }, 0.2),
        tg.immediate(_ => sunsfanAttackableTime = undefined),
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // what are you doing
        tg.immediate(_ => getOrError(getPlayerHero()).HeroLevelUp(true)),
        tg.wait(1),
    )

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
    onStop)
