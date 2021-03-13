import { defaultRequiredState, FilledRequiredState, RequiredState } from "./RequiredState"
import { findAllPlayersID, freezePlayerHero, getOrError, getPlayerHero, setUnitPacifist } from "../util"
import { Blockade } from "../Blockade"
import { runeSpawnsLocations } from "../Sections/Chapter5/Shared"
import { modifier_greevil, GreevilConfig } from "../modifiers/modifier_greevil"

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

    const hero = handleHeroCreationAndLevel(state)
    handleRequiredAbilities(state, hero)
    handleRequiredItems(state, hero)

    handleUnits(state)
    handleFountainTrees(state)
    handleBlockades(state)

    handleMisc(state, hero)
}

function handleMisc(state: FilledRequiredState, hero: CDOTA_BaseNPC_Hero) {
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

    // Create/remake or remove bounty runes
    if (state.requireBountyRunes) {
        createBountyRunes()
    } else {
        removeBountyRunes()
    }

    // Focus or unlock all cameras
    findAllPlayersID().forEach(playerId => PlayerResource.SetCameraTarget(playerId, state.lockCameraOnHero ? hero : undefined))
}

function handleFountainTrees(state: FilledRequiredState) {
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
}

function handleBlockades(state: FilledRequiredState) {
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
}

function handleUnits(state: FilledRequiredState) {
    // Golems
    const golemPostCreate = (unit: CDOTA_BaseNPC, created: boolean) => {
        if (!created) {
            setUnitPacifist(unit, false);
            unit.SetTeam(DotaTeam.GOODGUYS);
        }
    }

    // Requiring golem
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
}

function handleHeroCreationAndLevel(state: FilledRequiredState): CDOTA_BaseNPC_Hero {
    let hero = getOrError(getPlayerHero(), "Could not find the player's hero.")

    // Recreate the hero if we want a lower level than the current one (because you can't downlevel a hero)
    if (hero.GetLevel() > state.heroLevel || hero.GetUnitName() !== state.heroUnitName) {
        hero = PlayerResource.ReplaceHeroWith(hero.GetPlayerOwner().GetPlayerID(), state.heroUnitName, state.heroGold, 0)
    }

    // Make sure the hero is not frozen. Note: can still be frozen when replacing because of order filter.
    freezePlayerHero(false)

    // Level the hero to the desired level. 1 experience per level as defined in GameMode.
    hero.AddExperience(state.heroLevel - hero.GetLevel(), ModifyXpReason.UNSPECIFIED, false, false)

    // Move the hero if not within tolerance
    if (state.heroLocation.__sub(hero.GetAbsOrigin()).Length2D() > state.heroLocationTolerance) {
        hero.Stop()
        hero.SetAbsOrigin(state.heroLocation)
    }

    hero.SetGold(state.heroGold, false)

    return hero
}

function handleRequiredAbilities(state: FilledRequiredState, hero: CDOTA_BaseNPC_Hero) {
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

    // Set or remove DD modifier as needed
    if (state.heroHasDoubleDamage) {
        if (!hero.HasModifier("modifier_rune_doubledamage")) {
            hero.AddNewModifier(hero, undefined, "modifier_rune_doubledamage", {
                // Have to explicitly set duration or it assumes infinite, using standard value as of dota patch 7.28c
                duration: 45
            })
        }
    }

    // Set remaining ability points. Print a warning if we made an obvious mistake (eg. sum of minimum levels > hero level) but allow it.
    remainingAbilityPoints = getRemainingAbilityPoints()
    if (remainingAbilityPoints < 0) {
        Warning("Remaining ability points are negative. Should be greater or equal to zero.")
    }
    hero.SetAbilityPoints(Math.max(0, remainingAbilityPoints))
}

function handleRequiredItems(state: FilledRequiredState, hero: CDOTA_BaseNPC_Hero) {
    // TODO: Take item stacking into account in this entire thing.
    // TODO: Skipping backwards combined with removeUnrequiredItems might have undesired consequences (keeping items from later sections).

    // Find out how many of each item currently in the inventory we have.
    let numEmptyItemSlots = DOTA_ITEM_INVENTORY_SIZE - hero.GetNumItemsInInventory();
    let currentItems: Record<string, number> = {}
    for (let i = 0; i < DOTA_ITEM_INVENTORY_SIZE; i++) {
        const item = hero.GetItemInSlot(i)
        if (item) {
            const itemName = item.GetName()
            currentItems[itemName] = (currentItems[itemName] ?? 0) + 1
        } else {
            numEmptyItemSlots++;
        }
    }

    // Remove unrequired items if we don't want them.
    if (state.removeUnrequiredItems) {
        for (const [itemName, currentItemCount] of Object.entries(currentItems)) {
            const desiredItemCount = state.heroItems[itemName] ?? 0
            const toRemoveCount = currentItemCount - desiredItemCount

            for (let i = 0; i < toRemoveCount; i++) {
                const itemToDelete = hero.FindItemInInventory(itemName)
                if (itemToDelete) {
                    itemToDelete.RemoveSelf()
                }
            }

            currentItems[itemName] -= toRemoveCount
            numEmptyItemSlots += toRemoveCount
        }
    }

    // Clear the hero's inventory if we need more items than slots left.
    // First figure out how many items we want to add in total.
    let numAdditionalDesiredItems = 0;
    for (const [itemName, requiredItemCount] of Object.entries(state.heroItems)) {
        const currentItemCount = currentItems[itemName] ?? 0
        numAdditionalDesiredItems += requiredItemCount - currentItemCount
    }

    // Then clear hero inventory if we don't have enough empty slots.
    if (numEmptyItemSlots < numAdditionalDesiredItems) {
        for (let i = 0; i < DOTA_ITEM_INVENTORY_SIZE; i++) {
            const item = hero.GetItemInSlot(i)
            if (item) {
                item.RemoveSelf()
            }
        }

        currentItems = {}
    }

    // For each required item, give the hero as many as they need to reach the required count.
    for (const [itemName, requiredItemCount] of Object.entries(state.heroItems)) {
        const currentItemCount = currentItems[itemName] ?? 0
        for (let i = 0; i < requiredItemCount - currentItemCount; i++) {
            hero.AddItemByName(itemName)
        }
    }

    // Create the top T1 dier tower if it's down
    const direTopTowerLocation = Vector(-4672, 6016, 128)
    let direTop = Entities.FindByClassnameNearest("npc_dota_tower", direTopTowerLocation, 200) as CDOTA_BaseNPC_Building
    if (state.topDireT1TowerStanding) {
        if (!direTop || !IsValidEntity(direTop) || !direTop.IsAlive()) {
            direTop = CreateUnitByName(CustomNpcKeys.DireTopT1Tower, direTopTowerLocation, false, undefined, undefined, DotaTeam.BADGUYS) as CDOTA_BaseNPC_Building
            direTop.AddNewModifier(undefined, undefined, "modifier_tower_truesight_aura", {})
            direTop.AddNewModifier(undefined, undefined, "modifier_tower_aura", {})
            direTop.RemoveModifierByName("modifier_invulnerable")
            direTop.SetRenderColor(65, 78, 63)
        }
    }
    else if (direTop && IsValidEntity(direTop) && direTop.IsAlive()) {
        UTIL_Remove(direTop)
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
        const unit = CreateUnitByName(unitName, location, true, undefined, undefined, team);
        spawnWearables(unitName, unit);
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

function spawnWearables(unitName: string, unit: CDOTA_BaseNPC) {
    if (unitName === CustomNpcKeys.SlacksMudGolem) {
        const greevilConfig: GreevilConfig = {
            material: 4,
            stance: "white",
            ears: 2,
            horns: 1,
            hair: 1,
            nose: 1,
            tail: 1,
            teeth: 1,
            feathers: false,
        };
        unit.AddNewModifier(unit, undefined, modifier_greevil.name, greevilConfig);
    }
    if (unitName === CustomNpcKeys.SunsFanMudGolem) {
        const greevilConfig: GreevilConfig = {
            material: 2,
            stance: "level_3",
            ears: 1,
            horns: 3,
            hair: 2,
            nose: 3,
            tail: 3,
            teeth: 3,
            feathers: false,
        };
        unit.AddNewModifier(unit, undefined, modifier_greevil.name, greevilConfig);
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

function createBountyRunes() {
    const context = GameRules.Addon.context

    if (!IsValidEntity(context[CustomEntityKeys.RadiantTopBountyRune])) {
        context[CustomEntityKeys.RadiantTopBountyRune] = CreateRune(runeSpawnsLocations.radiantTopBountyPos, RuneType.BOUNTY)
    }

    if (!IsValidEntity(context[CustomEntityKeys.RadiantAncientsBountyRune])) {
        context[CustomEntityKeys.RadiantAncientsBountyRune] = CreateRune(runeSpawnsLocations.radiantAncientsBountyPos, RuneType.BOUNTY)
    }

    if (!IsValidEntity(context[CustomEntityKeys.DireBotBountyRune])) {
        context[CustomEntityKeys.DireBotBountyRune] = CreateRune(runeSpawnsLocations.direBotBountyPos, RuneType.BOUNTY)
    }

    if (!IsValidEntity(context[CustomEntityKeys.DireAncientsBountyRune])) {
        context[CustomEntityKeys.DireAncientsBountyRune] = CreateRune(runeSpawnsLocations.direAncientsBountyPos, RuneType.BOUNTY)
    }
}

function removeBountyRunes() {
    const context = GameRules.Addon.context

    if (IsValidEntity(context[CustomEntityKeys.RadiantTopBountyRune])) {
        context[CustomEntityKeys.RadiantTopBountyRune].Destroy()
        context[CustomEntityKeys.RadiantTopBountyRune] = undefined
    }

    if (IsValidEntity(context[CustomEntityKeys.RadiantAncientsBountyRune])) {
        context[CustomEntityKeys.RadiantAncientsBountyRune].Destroy()
        context[CustomEntityKeys.RadiantAncientsBountyRune] = undefined
    }

    if (IsValidEntity(context[CustomEntityKeys.DireBotBountyRune])) {
        context[CustomEntityKeys.DireBotBountyRune].Destroy()
        context[CustomEntityKeys.DireBotBountyRune] = undefined
    }

    if (IsValidEntity(context[CustomEntityKeys.DireAncientsBountyRune])) {
        context[CustomEntityKeys.DireAncientsBountyRune].Destroy()
        context[CustomEntityKeys.DireAncientsBountyRune] = undefined
    }
}
