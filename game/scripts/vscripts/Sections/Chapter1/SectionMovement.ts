import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { findRealPlayerID, getOrError, getPlayerCameraLocation, getPlayerHero, randomChoice, removeContextEntityIfExists, setUnitPacifist } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"
import { GoalTracker } from "../../Goals"
import { slacksFountainLocation, sunsfanFountainLocation } from "./Shared"

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = false;

const requiredState: RequiredState = {
    requireSunsfanGolem: true,
    requireSlacksGolem: true,
    sunsFanLocation: sunsfanFountainLocation,
    slacksLocation: slacksFountainLocation,
    requireFountainTrees: true,
    lockCameraOnHero: true,
}

const getMiranaHitKey = () => randomChoice([
    LocalizationKey.Script_1_Movement_10_1,
    LocalizationKey.Script_1_Movement_10_2,
])

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
    const miranaSpawnLocation = Vector(-5800, -3400, 256)
    const miranaShootLocation = Vector(-6225, -5600, 256)

    const miranaGreeting = randomChoice([
        LocalizationKey.Script_1_Movement_9,
        LocalizationKey.Script_1_Movement_9_1,
    ])

    let miranaHitKey: LocalizationKey = getMiranaHitKey()

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        tg.immediate(_ => canPlayerIssueOrders = false),
        tg.fork([
            tg.seq([
                tg.goToLocation(topLeftMarkerLocation),
                tg.immediate(_ => {
                    goalMoveToFirstMarker.complete()
                    canPlayerIssueOrders = false
                }),
            ]),
            tg.seq([
                tg.audioDialog(LocalizationKey.Script_1_Movement_1, LocalizationKey.Script_1_Movement_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.audioDialog(LocalizationKey.Script_1_Movement_2, LocalizationKey.Script_1_Movement_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.audioDialog(LocalizationKey.Script_1_Movement_3, LocalizationKey.Script_1_Movement_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.immediate(_ => {
                    goalMoveToFirstMarker.start()
                    canPlayerIssueOrders = true
                }),
                tg.completeOnCheck(_ => playerHero.IsMoving(), 0.1),
                tg.audioDialog(LocalizationKey.Script_1_Movement_4, LocalizationKey.Script_1_Movement_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            ]),
        ]),


        // Spawn Mirana
        tg.spawnUnit(CustomNpcKeys.Mirana, miranaSpawnLocation, DotaTeam.BADGUYS, CustomNpcKeys.Mirana, true),
        tg.immediate(ctx => setUnitPacifist(ctx[CustomNpcKeys.Mirana], true)),

        // Introduce mirana, walk her to the shooting location, pan camera on her
        tg.fork([
            tg.seq([
                tg.immediate(_ => goalMoveToSecondMarker.start()),
                tg.audioDialog(LocalizationKey.Script_1_Movement_5, LocalizationKey.Script_1_Movement_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.audioDialog(miranaGreeting, miranaGreeting, ctx => ctx[CustomNpcKeys.Mirana]),
                tg.audioDialog(LocalizationKey.Script_1_Movement_6, LocalizationKey.Script_1_Movement_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.audioDialog(LocalizationKey.Script_1_Movement_7, LocalizationKey.Script_1_Movement_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.audioDialog(LocalizationKey.Script_1_Movement_8, LocalizationKey.Script_1_Movement_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            ]),
            tg.seq([
                tg.wait(2),
                tg.panCameraExponential(_ => getPlayerCameraLocation(), ctx => ctx[CustomNpcKeys.Mirana].GetAbsOrigin(), 4),
                tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Mirana]),
                tg.moveUnit(ctx => ctx[CustomNpcKeys.Mirana], miranaShootLocation),
            ])
        ]),

        tg.faceTowards(ctx => ctx[CustomNpcKeys.Mirana], playerHero.GetAbsOrigin()),

        // Make sure player hero is not in the arrow firing area
        tg.immediate(_ => playerHero.SetAbsOrigin(topLeftMarkerLocation)),
        tg.wait(0.5),

        // Start firing arrows
        tg.immediate(ctx => ctx[CustomNpcKeys.Mirana].FindAbilityByName(CustomAbilityKeys.CustomMiranaArrow).SetLevel(1)),
        tg.forkAny([
            // Make Mirana fire arrows forever
            fireArrowsInArea(ctx => ctx[CustomNpcKeys.Mirana], topLeftMarkerLocation, botRightMarkerLocation, playerHero),
            // Play Mirana dialog when player gets stunned
            tg.loop(true, tg.seq([
                tg.completeOnCheck(_ => playerHero.IsStunned(), 0.1),
                tg.immediate(_ => miranaHitKey = getMiranaHitKey()),
                tg.audioDialog(_ => miranaHitKey, _ => miranaHitKey, ctx => ctx[CustomNpcKeys.Mirana]),
            ])),
            // Pan between the goals and wait for player to move to target location
            tg.seq([
                tg.fork([
                    tg.seq([
                        tg.panCameraExponential(miranaShootLocation, botRightMarkerLocation, 2),
                        tg.wait(1),
                        tg.panCameraExponential(botRightMarkerLocation, _ => playerHero.GetAbsOrigin(), 2),
                        tg.setCameraTarget(playerHero),
                        tg.immediate(_ => canPlayerIssueOrders = true),
                    ]),
                    tg.goToLocation(botRightMarkerLocation),
                ]),
            ])
        ]),
        tg.immediate(_ => goalMoveToSecondMarker.complete()),

        // "Nice dodging", make Mirana move away
        tg.audioDialog(LocalizationKey.Script_1_Movement_10, LocalizationKey.Script_1_Movement_10, ctx => ctx[CustomNpcKeys.Mirana]),
        tg.immediate(ctx => ctx[CustomNpcKeys.Mirana].MoveToPosition(miranaSpawnLocation)),

        tg.fork([
            // Tell player we'll unlock their camera
            tg.audioDialog(LocalizationKey.Script_1_Movement_11, LocalizationKey.Script_1_Movement_11, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            // Make Mirana leap
            tg.seq([
                tg.wait(1),
                tg.immediate(ctx => {
                    const mirana = getOrError(ctx[CustomNpcKeys.Mirana] as CDOTA_BaseNPC_Hero | undefined, "Could not get Mirana")
                    const leap = getOrError(mirana.FindAbilityByName("mirana_leap"), "Could not get leap")
                    leap.SetLevel(4)
                    leap.CastAbility()
                }),
                tg.wait(1),
            ])
        ]),

        // Remove mirana
        tg.immediate(ctx => removeContextEntityIfExists(ctx, CustomNpcKeys.Mirana)),
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

        let positionOffset = [2, 1, 3, 4]
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
