import { defaultRequiredState, FilledRequiredState, RequiredState } from "./RequiredState"
import { findAllPlayersID, freezePlayerHero, getOrError, getPlayerHero } from "../util"

/**
 * Sets up the state to match the passed state requirement.
 * @param stateReq State requirement to match.
 */
export const setupState = (stateReq: RequiredState): void => {
    print("Starting state setup")

    // Use defaults and override them with the passed state. Does not work if we have nested objects.
    const state: FilledRequiredState = { ...defaultRequiredState, ...stateReq }

    // Player / hero
    let hero = getOrError(getPlayerHero(), "Could not find the player's hero.")

    if (hero.GetCurrentXP() !== state.heroXP || hero.GetUnitName() !== state.heroUnitName) {
        hero = PlayerResource.ReplaceHeroWith(hero.GetPlayerOwner().GetPlayerID(), state.heroUnitName, state.heroGold, state.heroXP)
    } else {
        // Make sure the hero is not frozen
        freezePlayerHero(false)
    }

    // Focus all cameras on the hero
    const playerIds = findAllPlayersID()
    playerIds.forEach(playerId => PlayerResource.SetCameraTarget(playerId, hero))

    // Move the hero if not within tolerance
    if (state.heroLocation.__sub(hero.GetAbsOrigin()).Length2D() > state.heroLocationTolerance) {
        hero.Stop()
        hero.SetAbsOrigin(state.heroLocation)
    }

    hero.SetAbilityPoints(state.heroAbilityPoints)
    hero.SetGold(state.heroGold, false)

    // Golems
    if (state.requireSlacksGolem) {
        createOrMoveUnit(CustomNpcKeys.SlacksMudGolem, DotaTeam.GOODGUYS, state.slacksLocation, state.heroLocation)
    } else {
        clearUnit(CustomNpcKeys.SlacksMudGolem)
    }

    if (state.requireSunsfanGolem) {
        createOrMoveUnit(CustomNpcKeys.SunsFanMudGolem, DotaTeam.GOODGUYS, state.sunsFanLocation, state.heroLocation)
    } else {
        clearUnit(CustomNpcKeys.SunsFanMudGolem)
    }

    // Riki
    if (state.requireRiki) {
        createOrMoveUnit(CustomNpcKeys.Riki, DotaTeam.BADGUYS, state.rikiLocation, state.heroLocation, riki => {
            const rikiHero = riki as CDOTA_BaseNPC_Hero
            rikiHero.SetAbilityPoints(3)
            rikiHero.UpgradeAbility(rikiHero.GetAbilityByIndex(0)!)
            rikiHero.UpgradeAbility(rikiHero.GetAbilityByIndex(2)!)
            rikiHero.UpgradeAbility(rikiHero.GetAbilityByIndex(5)!)
            rikiHero.SetAttackCapability(UnitAttackCapability.NO_ATTACK)
            rikiHero.AddItemByName("item_lotus_orb")
            rikiHero.SetHealth(1)
            rikiHero.SetBaseHealthRegen(0)
        })
    } else {
        clearUnit(CustomNpcKeys.Riki)
    }
}

function createOrMoveUnit(unitName: string, team: DotaTeam, location: Vector, faceTo?: Vector, onCreated?: (unit: CDOTA_BaseNPC) => void) {
    const context = GameRules.Addon.context

    const postCreate = (unit: CDOTA_BaseNPC) => {
        if (unit.GetAbsOrigin().__sub(location).Length2D() > 100) {
            unit.SetAbsOrigin(location)
            unit.Stop()
        }

        if (faceTo) {
            unit.FaceTowards(faceTo)
        }

        context[unitName] = unit
    }

    if (!context[unitName] || !IsValidEntity(context[unitName]) || !context[unitName].IsAlive()) {
        CreateUnitByNameAsync(unitName, location, true, undefined, undefined, team, unit => {
            if (onCreated) {
                onCreated(unit)
            }
            postCreate(unit)
        })
    } else {
        postCreate(context[unitName])
    }
}

function clearUnit(unitName: string) {
    const context = GameRules.Addon.context

    if (context[unitName]) {
        if (IsValidEntity(context[unitName])) {
            context[unitName].RemoveSelf()
        }

        context[unitName] = undefined
    }
}
