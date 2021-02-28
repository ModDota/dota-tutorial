import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { findRealPlayerID, getPlayerHero } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = true;
const requiredState: RequiredState = {
}

const onStart = (complete: () => void) => {
    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");
    const mudGolemMeetPosition = playerHero.GetAbsOrigin().__add(Vector(300, 800, 0))

    graph = tg.seq([
        tg.immediate(() => canPlayerIssueOrders = false),
        tg.setCameraTarget(() => playerHero),
        tg.spawnUnit(CustomNpcKeys.SlacksMudGolem,
            playerHero.GetAbsOrigin().__add(Vector(0, 1500, 0)),
            DotaTeam.GOODGUYS,
            CustomNpcKeys.SlacksMudGolem),
        tg.spawnUnit(CustomNpcKeys.SunsFanMudGolem,
            playerHero.GetAbsOrigin().__add(Vector(1500, 500, 0)),
            DotaTeam.GOODGUYS,
            CustomNpcKeys.SunsFanMudGolem),
        tg.fork([
            tg.seq([
                tg.moveUnit(context => context[CustomNpcKeys.SlacksMudGolem], mudGolemMeetPosition),
                tg.faceTowards(context => context[CustomNpcKeys.SlacksMudGolem], playerHero.GetAbsOrigin()),
            ]),
            tg.seq([
                tg.moveUnit(context => context[CustomNpcKeys.SunsFanMudGolem], mudGolemMeetPosition.__add(Vector(150, -150, 0))),
                tg.faceTowards(context => context[CustomNpcKeys.SunsFanMudGolem], playerHero.GetAbsOrigin()),
            ]),
            tg.seq([
                tg.setCameraTarget(context => context[CustomNpcKeys.SlacksMudGolem]),
                tg.wait(3),
                tg.setCameraTarget(context => context[CustomNpcKeys.SunsFanMudGolem]),
            ])
        ]),
        tg.wait(2),
        tg.setCameraTarget(() => Entities.FindAllByName("dota_badguys_fort")[0]),
        tg.wait(5),
        tg.setCameraTarget(() => playerHero),
    ])

    graph.start(GameRules.Addon.context, () => {
        print("Completed", "Section Opening")
        complete()
    })
}

const onStop = () => {
    print("Stopping", "Section Opening");

    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }
}

export const sectionOpening = new tut.FunctionalSection(
    SectionName.Chapter1_Opening,
    requiredState,
    onStart,
    onStop,
    sectionOneOpeningOrderFilter
)

export function sectionOneOpeningOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (!canPlayerIssueOrders) return false;

    return true;
}
