import { defaultRequiredState, FilledRequiredState, RequiredState } from "./RequiredState"
import { getOrError, getPlayerHero } from "../util"

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
    }

    if (state.heroLocation !== undefined && state.heroLocation.__sub(hero.GetAbsOrigin()).Length2D() > state.heroLocationTolerance) {
        hero.Stop()
        hero.SetAbsOrigin(state.heroLocation)
    }

    hero.SetAbilityPoints(state.heroAbilityPoints)
    hero.SetGold(state.heroGold, false)

    // Golems
    if (state.requireSlacksGolem) {
        createOrMoveGolem(CustomNpcKeys.SlacksMudGolem, state.slacksLocation, state.heroLocation)
    } else {
        clearGolem(CustomNpcKeys.SlacksMudGolem)
    }

    if (state.sunsFanLocation) {
        createOrMoveGolem(CustomNpcKeys.SunsFanMudGolem, state.sunsFanLocation, state.heroLocation)
    } else {
        clearGolem(CustomNpcKeys.SunsFanMudGolem)
    }
}

function createOrMoveGolem(unitName: string, location: Vector, faceTo?: Vector) {
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

    if (!context[unitName] || !context[unitName].IsAlive()) {
        CreateUnitByNameAsync(unitName, location, true, undefined, undefined, DotaTeam.GOODGUYS, unit => postCreate(unit))
    } else {
        postCreate(context[unitName])
    }
}

function clearGolem(unitName: string) {
    const context = GameRules.Addon.context

    if (context[unitName]) {
        if (IsValidEntity(context[unitName])) {
            context[unitName].RemoveSelf()
        }

        context[unitName] = undefined
    }
}
