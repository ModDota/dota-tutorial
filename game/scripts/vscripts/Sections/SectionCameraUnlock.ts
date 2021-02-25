import * as tg from "../TutorialGraph/index"
import * as tut from "../Tutorial/Core"
import { getOrError, getPlayerHero, setUnitPacifist } from "../util"

let graph: tg.TutorialStep | undefined = undefined
let graphContext: tg.TutorialContext | undefined = undefined

const getSunsfanGolem = () => {
    const sunsfanGolems = Entities.FindAllByClassname(CustomNpcKeys.SunsFanMudGolem)
    if (sunsfanGolems.length !== 1) {
        error("SUNSfan golem count not equal to 1 but is " + sunsfanGolems.length)
    }

    return getOrError(sunsfanGolems[0] as CDOTA_BaseNPC)
}

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: SectionName.CameraUnlock })

    const radiantFountain = getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good"))

    let sunsfanAttackableTime: number | undefined = undefined

    graph = tg.seq(
        tg.wait(1),
        tg.setCameraTarget(() => undefined),
        tg.immediate(() => getOrError(getPlayerHero()).SetMoveCapability(UnitMoveCapability.GROUND)), // This line can be removed once the movement section is there.
        tg.immediate(_ => print("Pre camera movement")),
        tg.waitForCameraMovement(),
        tg.immediate(_ => print("Post camera movement")),
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // where are you going
        tg.setCameraTarget(() => getOrError(getPlayerHero())),
        tg.wait(2),
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // need to move camera while moving hero
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // heres a target dummy
        // TODO: Use dummy unit
        tg.spawnAndKillUnit("npc_dota_hero_crystal_maiden", radiantFountain.GetAbsOrigin().__add(Vector(500, 0, 0))),
        tg.wait(1),
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // that was violent
        tg.wait(1),
        tg.immediate(_ => setUnitPacifist(getSunsfanGolem(), false)),
        tg.playGlobalSound("abaddon_abad_spawn_01"), // why health bar over head
        tg.immediate(_ => sunsfanAttackableTime = GameRules.GetGameTime()),
        tg.completeOnCheck(_ => {
            const golem = getSunsfanGolem()

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
        tg.immediate(context => getOrError(getPlayerHero()).HeroLevelUp(true)),
        tg.wait(1)
    )

    graphContext = {}

    graph.start(graphContext, () => {
        complete()
    })
}

const onSkipTo = () => {
    const playerHero = getOrError(getPlayerHero())
    const radiantFountain = getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good"))

    // Put hero in the state we need
    playerHero.SetMoveCapability(UnitMoveCapability.GROUND)

    // Move hero close to fountain
    playerHero.SetAbsOrigin(radiantFountain.GetAbsOrigin().__add(Vector(300, 300, 0)))

    // Create or move sunsfan
    const sunsfanGolems = Entities.FindAllByClassname(CustomNpcKeys.SunsFanMudGolem)
    const sunsfanGolemTargetLocation = playerHero.GetAbsOrigin().__add(Vector(450, 650, 0))
    if (sunsfanGolems.length === 0) {
        CreateUnitByName(CustomNpcKeys.SunsFanMudGolem, sunsfanGolemTargetLocation, true, undefined, undefined, DotaTeam.GOODGUYS)
    } else if (sunsfanGolems.length === 1) {
        sunsfanGolems[0].SetAbsOrigin(sunsfanGolemTargetLocation)
    } else {
        error("Found more than one SUNSfan golem")
    }

    // Create or move slacks
    const slacksGolems = Entities.FindAllByClassname(CustomNpcKeys.SlacksMudGolem)
    const slacksGolemTargetLocation = playerHero.GetAbsOrigin().__add(Vector(300, 800, 0))
    if (sunsfanGolems.length === 0) {
        CreateUnitByName(CustomNpcKeys.SlacksMudGolem, slacksGolemTargetLocation, true, undefined, undefined, DotaTeam.GOODGUYS)
    } else if (sunsfanGolems.length === 1) {
        sunsfanGolems[0].SetAbsOrigin(slacksGolemTargetLocation)
    } else {
        error("Found more than one Slacks golem")
    }
}

const onStop = () => {
    if (graph) {
        graph.stop(graphContext ?? {})
        graph = undefined
        graphContext = undefined
    }
}

export const sectionCameraUnlock = new tut.FunctionalSection(SectionName.CameraUnlock, onStart, onSkipTo, onStop)
