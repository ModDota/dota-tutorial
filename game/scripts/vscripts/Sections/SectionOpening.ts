import * as tg from "../TutorialGraph/index"
import * as tut from "../Tutorial/Core"
import { findRealPlayerID, getPlayerHero } from "../util"
import { SectionState } from "./SectionState"

let graph: tg.TutorialStep | undefined = undefined
let sectionOpeningState : SectionState = {
    playerHeroLevel: 1,
    playerHeroUnitName: "npc_dota_hero_dragon_knight",
    playerHeroLocation: Vector(-6700, -6700, 384),
    playerHeroAbilityPoints: 0,
    playerHeroGold: 0,
}

const setupState = () => {
    print("Starting state setup")
    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    let player = PlayerResource.GetPlayer(findRealPlayerID())

    if (playerHero.GetLevel() !== sectionOpeningState.playerHeroLevel)
        print('Fixing hero level')
        playerHero.AddExperience(-10, ModifyXpReason.UNSPECIFIED, false, true)

    if (player && playerHero.GetUnitName() !== "npc_dota_hero_dragon_knight") {
        player.GetAssignedHero().RemoveSelf()
        CreateHeroForPlayer("npc_dota_hero_dragon_knight", player)
    }

    if (playerHero.GetAbsOrigin() !== sectionOpeningState.playerHeroLocation)
        print('Resetting hero position')
        playerHero.SetAbsOrigin(sectionOpeningState.playerHeroLocation)

    if (playerHero.GetAbilityPoints() > 0)
        print('Resetting ability points')
        playerHero.SetAbilityPoints(0)

    if (playerHero.GetGold() > 0)
        print('Resetting gold to 0')
        playerHero.SetGold(0, false)
}

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
                tg.moveUnit(context => context[CustomNpcKeys.SlacksMudGolem], mudGolemMeetPosition),
                tg.faceTowards(context => context[CustomNpcKeys.SlacksMudGolem], playerHero.GetAbsOrigin()),
            ),
            tg.seq(
                tg.moveUnit(context => context[CustomNpcKeys.SunsFanMudGolem], mudGolemMeetPosition.__add(Vector(150, -150, 0))),
                tg.faceTowards(context => context[CustomNpcKeys.SunsFanMudGolem], playerHero.GetAbsOrigin()),
            ),
            tg.seq(
                tg.setCameraTarget(context => context[CustomNpcKeys.SlacksMudGolem]),
                tg.wait(3),
                tg.setCameraTarget(context => context[CustomNpcKeys.SunsFanMudGolem]),
            )
        ),
        tg.wait(2),
        tg.setCameraTarget(() => Entities.FindAllByName("dota_badguys_fort")[0]),
        tg.wait(5),
        tg.setCameraTarget(() => playerHero),
    )

    graph.start(GameRules.Addon.context, () => {
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
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }
}

const clearMudGolems = () => {
    const context = GameRules.Addon.context

    if (context[CustomNpcKeys.SlacksMudGolem]) {
        if (IsValidEntity(context[CustomNpcKeys.SlacksMudGolem])) {
            context[CustomNpcKeys.SlacksMudGolem].RemoveSelf()
        }
        context[CustomNpcKeys.SlacksMudGolem] = undefined
    }

    if (context[CustomNpcKeys.SunsFanMudGolem]) {
        if (IsValidEntity(context[CustomNpcKeys.SunsFanMudGolem])) {
            context[CustomNpcKeys.SunsFanMudGolem].RemoveSelf()
        }
        context[CustomNpcKeys.SunsFanMudGolem] = undefined
    }
}

export const sectionOpening = new tut.FunctionalSection(SectionName.Opening, setupState, onStart, onSkipTo, onStop)
