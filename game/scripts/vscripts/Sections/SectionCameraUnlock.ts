import * as tg from "../TutorialGraph/index"
import * as tut from "../Tutorial/Core"
import { getPlayerHero } from "../util"

let graph: tg.TutorialStep | undefined = undefined
let graphContext: tg.TutorialContext | undefined = undefined

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: SectionName.CameraUnlock })

    const playerHero = getPlayerHero()
    if (!playerHero) {
        error("Could not find player hero")
    }

    const radiantFountain = Entities.FindByName(undefined, "ent_dota_fountain_good")
    if (!radiantFountain) {
        error("Could not find fountain (ent_dota_fountain_good)")
    }

    let sunsfanAttackableTime: number | undefined = undefined

    graph = tg.seq(
        tg.immediate(_ => print("Pre camera movement")),
        tg.waitForCameraMovement(),
        tg.immediate(_ => print("Post camera movement")),
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // where are you going
        tg.setCameraTarget(playerHero),
        tg.wait(2),
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // need to move camera while moving hero
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // heres a target dummy
        // TODO: Use dummy unit
        tg.spawnAndKillUnit("npc_dota_hero_crystal_maiden", radiantFountain.GetAbsOrigin().__add(Vector(500, 0, 0))),
        tg.wait(1),
        tg.playGlobalSound("abaddon_abad_spawn_01", true), // that was violent
        tg.wait(1),
        // TODO: Make sunsfan golem attackable
        tg.playGlobalSound("abaddon_abad_spawn_01"), // why health bar over head
        tg.immediate(_ => sunsfanAttackableTime = GameRules.GetGameTime()),
        tg.completeOnCheck(_ => {
            const golem = Entities.FindAllByClassname("npc_mud_golem_sunsfan")[0]
            if (!golem) {
                error("Could not find SUNSfan golem")
            }

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
        tg.immediate(context => playerHero.HeroLevelUp(true)),
        tg.wait(1)
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
