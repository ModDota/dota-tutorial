import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { findRealPlayerID, getOrError, getPlayerHero, setUnitPacifist } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"
import { moveCameraToPosition } from "../../TutorialGraph/index"
import { GoalTracker } from "../../Goals"

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = false;

const requiredState: RequiredState = {
    requireSunsfanGolem: true,
    requireSlacksGolem: true,
    sunsFanLocation: Vector(-6400, -5900, 256),
    slacksLocation: Vector(-6250, -6050, 256),
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
                fireArrowsInArea((ctx) => ctx[CustomNpcKeys.Mirana], topLeftMarkerLocation, botRightMarkerLocation, playerHero),
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
            // Should be different personalities for the following two lines, until determined, using Slacks and SUNSfan
            tg.textDialog(LocalizationKey.Script_1_Movement_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_1_Movement_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),

            tg.textDialog(LocalizationKey.Script_1_Movement_11, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
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

/**
 * Creates a tutorial step that orders mirana to fire arrows at points on a line connecting two end points. Runs forever.
 * @param miranaUnit Mirana unit that will shoot arrows.
 * @param startPoint Starting point of the line.
 * @param endPoint Ending point of the line.
 * @param playerHero Optional parameter used to reset the player hero's position if hit by an arrow.
 */
const fireArrowsInArea = (miranaUnit: tg.StepArgument<CDOTA_BaseNPC_Hero>, startPoint: tg.StepArgument<Vector>, endPoint: tg.StepArgument<Vector>, playerHero?: tg.StepArgument<CDOTA_BaseNPC_Hero>) => {
    let checkTimer: string | undefined = undefined

    return tg.step((context, complete) => {
        const actualMiranaUnit = tg.getArg(miranaUnit, context)
        const actualStartPoint = tg.getArg(startPoint, context)
        const actualEndPoint = tg.getArg(endPoint, context)
        const customArrow = actualMiranaUnit.FindAbilityByName(CustomAbilityKeys.CustomMiranaArrow) as CDOTABaseAbility

        const directionBetweenPoints = ((actualEndPoint - actualStartPoint) as Vector).Normalized()
        const distance = ((actualStartPoint - actualEndPoint) as Vector).Length2D()

        let order: ExecuteOrderOptions = {
            UnitIndex: actualMiranaUnit.GetEntityIndex(),
            OrderType: UnitOrder.CAST_POSITION,
            AbilityIndex: customArrow.GetEntityIndex(),
            Queue: true
        };

        let positionOffset = [2,1,3,4]
        let i = 0

        const checkDkReachedDestination = () => {
            order.Position = actualStartPoint.__add(directionBetweenPoints * distance * 0.2 * positionOffset[i] as Vector),
            ExecuteOrderFromTable(order)

            if (i == positionOffset.length - 1)
                i = 0 // Reset arrow firing sequence
            else
                i += 1

            checkTimer = Timers.CreateTimer(0.4, () => checkDkReachedDestination())
        }

        checkDkReachedDestination()
    }, context => {
        if (checkTimer) {
            Timers.RemoveTimer(checkTimer)
            checkTimer = undefined
        }
    })
}
