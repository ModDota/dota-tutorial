import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { findRealPlayerID, getPlayerHero } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"
import { slacksFountainLocation, slacksInitialLocation, sunsfanFountainLocation } from "./Shared"

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = true;
const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: slacksInitialLocation,
    sunsFanLocation: sunsfanFountainLocation,
    requireFountainTrees: true,
}

const onStart = (complete: () => void) => {
    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    graph = tg.seq([
        tg.immediate(() => canPlayerIssueOrders = false),
        tg.setCameraTarget(() => playerHero),
        tg.fork([
            tg.seq([
                tg.moveUnit(context => context[CustomNpcKeys.SlacksMudGolem], slacksFountainLocation),
                tg.faceTowards(context => context[CustomNpcKeys.SlacksMudGolem], playerHero.GetAbsOrigin()),
            ]),
            tg.faceTowards(context => context[CustomNpcKeys.SunsFanMudGolem], playerHero.GetAbsOrigin()),
            tg.seq([
                tg.setCameraTarget(context => context[CustomNpcKeys.SunsFanMudGolem]),
                tg.wait(2),
                tg.setCameraTarget(context => context[CustomNpcKeys.SlacksMudGolem]),
            ])
        ]),
        tg.textDialog(LocalizationKey.Script_1_Opening_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Opening_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Opening_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Opening_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Opening_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Opening_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Opening_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Opening_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Opening_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.panCameraLinear(ctx => ctx[CustomNpcKeys.SlacksMudGolem].GetAbsOrigin(), Entities.FindAllByName("dota_badguys_fort")[0].GetAbsOrigin(), 8),
        tg.textDialog(LocalizationKey.Script_1_Opening_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_Opening_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.panCameraExponential(Entities.FindAllByName("dota_badguys_fort")[0].GetAbsOrigin(), _ => playerHero.GetAbsOrigin(), 0.5),
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

function sectionOneOpeningOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (!canPlayerIssueOrders) return false;

    return true;
}
