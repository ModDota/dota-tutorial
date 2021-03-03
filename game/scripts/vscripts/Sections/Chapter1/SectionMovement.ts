import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { findRealPlayerID, getOrError, getPlayerHero, setUnitPacifist, setUnitVisibilityThroughFogOfWar } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"
import { moveCameraToPosition, TutorialContext } from "../../TutorialGraph/index"
import { GoalTracker } from "../../Goals"

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = false;

const requiredState: RequiredState = {
    requireSunsfanGolem: true,
    requireSlacksGolem: true,
    sunsFanLocation: Vector(-6400, -5900, 256),
    slacksLocation: Vector(-6250, -6050, 256),
}

enum NeutralGoalKeys {
    MoveToFirstWaypoint,
    MoveToSecondWaypoint
}

enum GoalState {
    Started,
    Completed,
}

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", {
        section: SectionName.Chapter1_Movement,
    });

    const goalTracker = new GoalTracker()
    const goalMoveToFirstMarker = goalTracker.addBoolean("Move to the marked waypoint.")
    const goalMoveToSecondMarker = goalTracker.addBoolean("Move to the second waypoint.")

    const playerHero = getOrError(getPlayerHero())
    const topLeftMarkerLocation = Vector(-7300, -6100, 384)
    const botRightMarkerLocation = Vector(-6500, -6900, 384)
    const miranaSpawnLocation = Vector(-6225, -5600, 256)

    graph = tg.withGoals(ctx => goalTracker.getGoals(), tg.seq([
            tg.immediate(
                (ctx) => canPlayerIssueOrders = false
            ),
            tg.fork([
                tg.goToLocation(topLeftMarkerLocation),
                tg.seq([
                    tg.textDialog(LocalizationKey.Script_1_Movement_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 4),
                    tg.textDialog(LocalizationKey.Script_1_Movement_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 2),
                    tg.immediate(
                        (ctx) => {
                            goalMoveToFirstMarker.start()
                            canPlayerIssueOrders = true
                        }
                    ),
                    tg.completeOnCheck(() => playerHero.IsMoving(), 0.5),
                    tg.textDialog(LocalizationKey.Script_1_Movement_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
                    tg.textDialog(LocalizationKey.Script_1_Movement_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
                ]),
            ]),
            tg.immediate((ctx) => {
                goalMoveToFirstMarker.complete()
                canPlayerIssueOrders = false
            }),
            tg.textDialog(LocalizationKey.Script_1_Movement_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.spawnUnit(CustomNpcKeys.Mirana,
                miranaSpawnLocation,
                DotaTeam.BADGUYS,
                CustomNpcKeys.Mirana),
            tg.immediate((ctx) => setUnitPacifist(ctx[CustomNpcKeys.Mirana], true)),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Mirana], playerHero.GetAbsOrigin()),
            tg.immediate(
                (ctx) =>
                    goalMoveToSecondMarker.start()
            ),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Mirana]),
            tg.textDialog(LocalizationKey.Script_1_Movement_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_1_Movement_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_1_Movement_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            // Make sure player hero is not in the arrow firing area
            tg.immediate(() => playerHero.SetAbsOrigin(topLeftMarkerLocation)),
            tg.wait(0.5),
            tg.setCameraTarget(undefined),
            tg.playGlobalSound("mirana_mir_attack_10"),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Mirana].FindAbilityByName(CustomAbilityKeys.CustomMiranaArrow).SetLevel(1)),
            tg.forkAny([
                tg.fireArrowsInArea((ctx) => ctx[CustomNpcKeys.Mirana], topLeftMarkerLocation, botRightMarkerLocation, playerHero),
                tg.seq([
                    tg.fork([
                        tg.seq([
                            tg.immediate(() => moveCameraToPosition(botRightMarkerLocation, 1)),
                            tg.wait(2),
                            tg.setCameraTarget(playerHero),
                            tg.immediate(() => canPlayerIssueOrders = true),
                        ]),
                        tg.goToLocation(botRightMarkerLocation),
                    ]),
                ])
            ]),
            tg.immediate((ctx) => {
                goalMoveToSecondMarker.complete()
                if (ctx[CustomNpcKeys.Mirana] && IsValidEntity(ctx[CustomNpcKeys.Mirana]))
                    ctx[CustomNpcKeys.Mirana].RemoveSelf()
            }),
            // Should be different personalities for these lines, until determined, using Slacks and SUNSfan
            tg.textDialog(LocalizationKey.Script_1_Movement_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_1_Movement_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
        ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", "Section Movement")
        complete()
    })
}

const onStop = () => {
    print("Stopping", "Section Movement");

    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }
}

export const sectionMovement = new tut.FunctionalSection(
    SectionName.Chapter1_Movement,
    requiredState,
    onStart,
    onStop,
    sectionOneMovementOrderFilter
)

function sectionOneMovementOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (!canPlayerIssueOrders) return false;

    return true;
}
