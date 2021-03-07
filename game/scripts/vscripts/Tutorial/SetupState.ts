import { defaultRequiredState, FilledRequiredState, RequiredState } from "./RequiredState"
import { findAllPlayersID, freezePlayerHero, getOrError, getPlayerHero, setUnitPacifist } from "../util"
import { Blockade } from "../Blockade"

// Keep track of spawned blockades so we can remove them again.
const spawnedBlockades = new Set<Blockade>()

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

    // Recreate the hero if we want a lower level than the current one (because you can't downlevel a hero)
    if (hero.GetLevel() > state.heroLevel || hero.GetUnitName() !== state.heroUnitName) {
        hero = PlayerResource.ReplaceHeroWith(hero.GetPlayerOwner().GetPlayerID(), state.heroUnitName, state.heroGold, 0)
    } else {
        // Make sure the hero is not frozen
        freezePlayerHero(false)
    }

    // Level the hero to the desired level. 1 experience per level as defined in GameMode.
    hero.AddExperience(state.heroLevel - hero.GetLevel(), ModifyXpReason.UNSPECIFIED, false, false)

    // Ability levels and points

    const abilityIndices = [0, 1, 2, 3]
    const abilities = [0, 1, 2, 5].map(abilityIndex => getOrError(hero.GetAbilityByIndex(abilityIndex)))

    // Function for calculating how many ability points we have left based on the current ability levels and hero level.
    const getRemainingAbilityPoints = () => {
        let abilPoints = hero.GetLevel()
        for (const ability of abilities) {
            abilPoints -= ability.GetLevel()
        }
        return abilPoints
    }

    // Check whether we have to reset the ability points because we can not reach our minimum with the current ability levels.
    let remainingAbilityPoints = getRemainingAbilityPoints()
    for (const abilityIndex of abilityIndices) {
        remainingAbilityPoints -= Math.max(0, state.heroAbilityMinLevels[abilityIndex] - abilities[abilityIndex].GetLevel())
    }

    // Reset to the passed minimum levels if we can't reach it with the current ability levels and remaining points.
    if (remainingAbilityPoints < 0) {
        for (const abilityIndex of abilityIndices) {
            abilities[abilityIndex].SetLevel(state.heroAbilityMinLevels[abilityIndex])
        }
    }

    // Set the ability levels to the higher of the minimum or the current level.
    for (const abilityIndex of abilityIndices) {
        const abil = abilities[abilityIndex]
        abil.SetLevel(Math.max(state.heroAbilityMinLevels[abilityIndex], abil.GetLevel()))
    }

    // Set remaining ability points. Print a warning if we made an obvious mistake (eg. sum of minimum levels > hero level) but allow it.
    remainingAbilityPoints = getRemainingAbilityPoints()
    if (remainingAbilityPoints < 0) {
        Warning("Remaining ability points are negative. Should be greater or equal to zero.")
    }
    hero.SetAbilityPoints(Math.max(0, remainingAbilityPoints))

    // Focus all cameras on the hero
    const playerIds = findAllPlayersID()
    playerIds.forEach(playerId => PlayerResource.SetCameraTarget(playerId, hero))

    // Move the hero if not within tolerance
    if (state.heroLocation.__sub(hero.GetAbsOrigin()).Length2D() > state.heroLocationTolerance) {
        hero.Stop()
        hero.SetAbsOrigin(state.heroLocation)
    }

    hero.SetGold(state.heroGold, false)

    // Golems
    const golemPostCreate = (unit: CDOTA_BaseNPC, created: boolean) => {
        if (!created) {
            setUnitPacifist(unit, false);
            unit.SetTeam(DotaTeam.GOODGUYS);
        }
    }

    if (state.requireSlacksGolem) {
        createOrMoveUnit(CustomNpcKeys.SlacksMudGolem, DotaTeam.GOODGUYS, state.slacksLocation, state.heroLocation, golemPostCreate)
    } else {
        clearUnit(CustomNpcKeys.SlacksMudGolem)
    }

    if (state.requireSunsfanGolem) {
        createOrMoveUnit(CustomNpcKeys.SunsFanMudGolem, DotaTeam.GOODGUYS, state.sunsFanLocation, state.heroLocation, golemPostCreate)
    } else {
        clearUnit(CustomNpcKeys.SunsFanMudGolem)
    }

    // Riki
    if (state.requireRiki) {
        createOrMoveUnit(CustomNpcKeys.Riki, DotaTeam.BADGUYS, state.rikiLocation, state.heroLocation, (riki, created) => {
            if (created) {
                const rikiHero = riki as CDOTA_BaseNPC_Hero
                rikiHero.SetAbilityPoints(3)
                rikiHero.UpgradeAbility(rikiHero.GetAbilityByIndex(0)!)
                rikiHero.UpgradeAbility(rikiHero.GetAbilityByIndex(2)!)
                rikiHero.UpgradeAbility(rikiHero.GetAbilityByIndex(5)!)
                rikiHero.SetAttackCapability(UnitAttackCapability.NO_ATTACK)
                rikiHero.AddItemByName("item_lotus_orb")
            }
        })
    } else {
        clearUnit(CustomNpcKeys.Riki)
    }

    // Chapter 1 tree wall at the fountain
    const treeLocationStart = Vector(-6800, -5800, 256)
    const treeLocationEnd = Vector(-6300, -6300, 256)
    const getTreeLocation = (alpha: number) => treeLocationStart.__mul(alpha).__add(treeLocationEnd.__mul(1 - alpha))

    // Spawn trees in a line between start and end if we want them.
    if (state.requireFountainTrees) {
        const numTrees = 6
        for (let i = 0; i < numTrees; i++) {
            // Only create a tree if there is not already one at the desired location.
            const treeLocation = getTreeLocation(i / (numTrees - 1))
            if (GridNav.GetAllTreesAroundPoint(treeLocation, 10, true).length === 0) {
                CreateTempTree(treeLocation, 100000)
            }
        }
    } else {
        // Destroy all trees around the tree-line center point.
        GridNav.DestroyTreesAroundPoint(getTreeLocation(0.5), 500, true)
    }

    // Blockades

    // Destroy old blockades
    for (const spawnedBlockade of spawnedBlockades) {
        if (!state.blockades.includes(spawnedBlockade)) {
            spawnedBlockade.destroy()
            spawnedBlockades.delete(spawnedBlockade)
        }
    }

    // Spawn required blockades (calling spawn and add a second time will do nothing if they are already spawned)
    for (const blockade of state.blockades) {
        blockade.spawn()
        spawnedBlockades.add(blockade)
    }

    // Set or remove DD modifier as needed
    if (state.heroHasDoubleDamage) {
        if (!hero.HasModifier("modifier_rune_doubledamage")) {
            hero.AddNewModifier(hero, undefined, "modifier_rune_doubledamage", undefined)
        }
    } else {
        if (hero.HasModifier("modifier_rune_doubledamage")) {
            hero.RemoveModifierByName("modifier_rune_doubledamage")
        }
    }
}

function createOrMoveUnit(unitName: string, team: DotaTeam, location: Vector, faceTo?: Vector, onPostCreate?: (unit: CDOTA_BaseNPC, created: boolean) => void) {
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
        const unit = CreateUnitByName(unitName, location, true, undefined, undefined, team)
        postCreate(unit)
        if (onPostCreate) {
            onPostCreate(unit, true)
        }
    } else {
        postCreate(context[unitName])
        if (onPostCreate) {
            onPostCreate(context[unitName], false)
        }
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
