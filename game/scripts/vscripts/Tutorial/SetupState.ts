import { defaultSectionState, FilledSectionState, SectionState } from "./SectionState"
import { getOrError, getPlayerHero } from "../util"

function isObject<T>(item: T) {
    return item && typeof item === "object" && !Array.isArray(item)
}

function mergeDeep(target: any, source: any): any {
    const output = Object.assign({}, target)
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] })
                } else {
                    output[key] = mergeDeep(target[key], source[key])
                }
            } else {
                Object.assign(output, { [key]: source[key] })
            }
        })
    }
    return output
}

export const setupState = (sectionState: SectionState): void => {
    print("Starting state setup")

    // Use defaults and override them with the passed state
    const state: FilledSectionState = mergeDeep(defaultSectionState, sectionState)

    // Player / hero
    let playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.")

    if (playerHero.GetCurrentXP() !== state.playerHeroXP || playerHero.GetUnitName() !== state.playerHeroUnitName) {
        playerHero = PlayerResource.ReplaceHeroWith(playerHero.GetPlayerOwner().GetPlayerID(), state.playerHeroUnitName, state.playerHeroGold, state.playerHeroXP)
    }

    if (state.playerHeroLocation !== undefined && state.playerHeroLocation.__sub(playerHero.GetAbsOrigin()).Length2D() > state.playerHeroLocationTolerance) {
        playerHero.Stop()
        playerHero.SetAbsOrigin(state.playerHeroLocation)
    }

    playerHero.SetAbilityPoints(state.playerHeroAbilityPoints)
    playerHero.SetGold(state.playerHeroGold, false)

    // Golems
    if (state.requireSlacksGolem) {
        createOrMoveGolem(CustomNpcKeys.SlacksMudGolem, state.slacksLocation, state.playerHeroLocation)
    } else {
        clearGolem(CustomNpcKeys.SlacksMudGolem)
    }

    if (state.sunsFanLocation) {
        createOrMoveGolem(CustomNpcKeys.SunsFanMudGolem, state.sunsFanLocation, state.playerHeroLocation)
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

    if (!context[unitName]) {
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
