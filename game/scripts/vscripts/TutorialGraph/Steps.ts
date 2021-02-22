import { findAllPlayersID } from "../util"
import { step } from "./Core"

const isHeroNearby = (location: Vector, radius: number) => FindUnitsInRadius(
    DotaTeam.BADGUYS, location, undefined, radius,
    UnitTargetTeam.BOTH,
    UnitTargetType.HERO,
    UnitTargetFlags.INVULNERABLE + UnitTargetFlags.OUT_OF_WORLD + UnitTargetFlags.MAGIC_IMMUNE_ENEMIES,
    0, false
).length > 0

/**
 * Creates a tutorial step that waits for a hero to go to a location.
 * @param location Target location
 */
export const goToLocation = (location: Vector) => {
    return step((context, complete) => {
        Tutorial.CreateLocationTask(location)

        // Wait until a hero is at the goal location
        const checkIsAtGoal = () => {
            if (isHeroNearby(location, 200)) {
                complete()
            } else {
                Timers.CreateTimer(1, () => checkIsAtGoal())
            }
        }

        checkIsAtGoal()
    })
}

/**
 * Creates a tutorial step that spawns a unit and waits until it dies.
 * @param unitName Name of the unit to spawn.
 * @param spawnLocation Location to spawn the unit at.
 */
export const spawnAndKillUnit = (unitName: string, spawnLocation: Vector) => {
    return step((context, complete) => {
        const unit = CreateUnitByName(unitName, spawnLocation, true, undefined, undefined, DotaTeam.NEUTRALS)

        // Wait until the unit dies
        const checkIsDead = () => {
            if (!unit.IsAlive()) {
                complete()
            } else {
                Timers.CreateTimer(1, () => checkIsDead())
            }
        }

        checkIsDead()
    })
}

/**
 * Waits for an amount of time until completion
 * @param waitSeconds Time to wait before completion
 */
export const wait = (waitSeconds: number) => {
    return step((context, complete) => {
        Timers.CreateTimer(waitSeconds, () => complete())
    })
}

/**
 * Focuses the camera to a target or frees it.
 * @param target Target to focus the camera on. Can be undefined for freeing the camera.
 */
export const setCameraTarget = (target: CBaseEntity | undefined) => {
    return step((context, complete) => {
        const playerIds = findAllPlayersID()

        // Focus all cameras on the target
        playerIds.forEach(playerId => PlayerResource.SetCameraTarget(playerId, target))

        complete()
    })
}
