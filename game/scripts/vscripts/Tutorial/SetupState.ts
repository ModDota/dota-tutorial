import { defaultRequiredState, FilledRequiredState, RequiredState } from "./RequiredState"
import { centerCameraOnHero, findAllPlayersID, freezePlayerHero, getOrError, getPlayerHero, removeContextEntityIfExists, setRespawnSettings, setUnitPacifist, unitIsValidAndAlive } from "../util"
import { Blockade } from "../Blockade"
import { itemAegis, outsidePitLocation, roshanLocation, runeSpawnsLocations } from "../Sections/Chapter5/Shared"
import { modifier_greevil, GreevilConfig } from "../modifiers/modifier_greevil"
import { modifier_custom_roshan_attack_speed } from "../modifiers/modifier_custom_roshan_attack_speed"

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
    handleRequiredRespawn(state)
    handleItemsOnGround()
    handlePlantedWards(state)
    handleAbilityCooldowns(hero)
    handleElderDragonForm(state.removeElderDragonForm, hero)

    handleUnits(state)
    handleFountainTrees(state)
    handleBlockades(state)
    handleRoshan(state)

    handleCamera(state, hero)
    handleMisc(state, hero)
}

function handleCamera(state: FilledRequiredState, hero: CDOTA_BaseNPC_Hero) {
    // Focus or unlock all cameras
    findAllPlayersID().forEach(playerId => PlayerResource.SetCameraTarget(playerId, state.lockCameraOnHero ? hero : undefined))

    // Center camera on the hero
    if (state.centerCameraOnHero) {
        centerCameraOnHero()
    }
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
        const shouldGolemBeHidden = unit.GetAbsOrigin().__sub(defaultRequiredState.sunsFanLocation).Length2D() < 500

        unit.SetTeam(DOTATeam_t.DOTA_TEAM_GOODGUYS);
        if (shouldGolemBeHidden) {
            setUnitPacifist(unit, true);
        } else if (!created) {
            setUnitPacifist(unit, false);
        }
    }

    // Requiring golem
    if (state.requireSlacksGolem) {
        createOrMoveUnit(CustomNpcKeys.SlacksMudGolem, DOTATeam_t.DOTA_TEAM_GOODGUYS, state.slacksLocation, state.heroLocation, golemPostCreate)
    } else {
        clearUnit(CustomNpcKeys.SlacksMudGolem)
    }

    if (state.requireSunsfanGolem) {
        createOrMoveUnit(CustomNpcKeys.SunsFanMudGolem, DOTATeam_t.DOTA_TEAM_GOODGUYS, state.sunsFanLocation, state.heroLocation, golemPostCreate)
    } else {
        clearUnit(CustomNpcKeys.SunsFanMudGolem)
    }

    // Riki
    if (state.requireRiki) {
        createOrMoveUnit(CustomNpcKeys.Riki, DOTATeam_t.DOTA_TEAM_BADGUYS, state.rikiLocation, state.heroLocation, (riki, created) => {
            if (created) {
                const rikiHero = riki as CDOTA_BaseNPC_Hero
                rikiHero.SetAbilityPoints(3)
                rikiHero.UpgradeAbility(rikiHero.GetAbilityByIndex(0)!)
                rikiHero.UpgradeAbility(rikiHero.GetAbilityByIndex(2)!)
                rikiHero.UpgradeAbility(rikiHero.GetAbilityByIndex(5)!)
                rikiHero.SetAttackCapability(DOTAUnitAttackCapability_t.DOTA_UNIT_CAP_NO_ATTACK)
                rikiHero.AddItemByName("item_lotus_orb")
                rikiHero.AddItemByName("item_sange_and_yasha")
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
    hero.AddExperience(state.heroLevel - hero.GetLevel(), EDOTA_ModifyXP_Reason.DOTA_ModifyXP_Unspecified, false, false)

    // Move the hero if not within tolerance
    if (state.heroLocation.__sub(hero.GetAbsOrigin()).Length2D() > state.heroLocationTolerance) {
        hero.Stop()
        FindClearSpaceForUnit(hero, state.heroLocation, true)
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
    let numEmptyItemSlots = DOTAScriptInventorySlot_t.DOTA_ITEM_NEUTRAL_SLOT - hero.GetNumItemsInInventory();
    let currentItems: Record<string, number> = {}
    for (let i = 0; i <= DOTAScriptInventorySlot_t.DOTA_ITEM_NEUTRAL_SLOT; i++) {
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
        for (let i = 0; i <= DOTAScriptInventorySlot_t.DOTA_ITEM_NEUTRAL_SLOT; i++) {
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

    // Create the top T1 dire tower if it's down and needs to be up, or remove it if it needs to be down
    const direTopTowerLocation = Vector(-4672, 6016, 128)
    let direTop = Entities.FindByClassnameNearest("npc_dota_tower", direTopTowerLocation, 200) as CDOTA_BaseNPC_Building
    if (state.topDireT1TowerStanding) {
        if (!direTop || !IsValidEntity(direTop) || !direTop.IsAlive()) {
            direTop = CreateUnitByName(CustomNpcKeys.DireTopT1Tower, direTopTowerLocation, false, undefined, undefined, DOTATeam_t.DOTA_TEAM_BADGUYS) as CDOTA_BaseNPC_Building
            direTop.AddNewModifier(undefined, undefined, "modifier_tower_truesight_aura", {})
            direTop.AddNewModifier(undefined, undefined, "modifier_tower_aura", {})
            direTop.RemoveModifierByName("modifier_invulnerable")
            direTop.SetRenderColor(65, 78, 63)
        }
    }
    else if (direTop && IsValidEntity(direTop) && direTop.IsAlive()) {
        UTIL_Remove(direTop)
    }

    // Create the top T2 dire tower if it's down and needs to be up, or remove it if it needs to be down
    const direTopTower2Location = Vector(0, 6016, 128)
    let direTop2 = Entities.FindByClassnameNearest("npc_dota_tower", direTopTower2Location, 200) as CDOTA_BaseNPC_Building
    if (state.topDireT2TowerStanding) {
        if (!direTop2 || !IsValidEntity(direTop2) || !direTop2.IsAlive()) {
            direTop = CreateUnitByName(CustomNpcKeys.DireTopT2Tower, direTopTower2Location, false, undefined, undefined, DOTATeam_t.DOTA_TEAM_BADGUYS) as CDOTA_BaseNPC_Building
            direTop.AddNewModifier(undefined, undefined, "modifier_tower_truesight_aura", {})
            direTop.AddNewModifier(undefined, undefined, "modifier_tower_aura", {})
            direTop.RemoveModifierByName("modifier_invulnerable")
            direTop.SetRenderColor(65, 78, 63)
        }
    }
    else if (direTop2 && IsValidEntity(direTop2) && direTop2.IsAlive()) {
        ApplyDamage({
            attacker: direTop2,
            victim: direTop2,
            damage: direTop2.GetMaxHealth(),
            damage_type: DAMAGE_TYPES.DAMAGE_TYPE_PURE,
            damage_flags: DOTADamageFlag_t.DOTA_DAMAGE_FLAG_BYPASSES_INVULNERABILITY + DOTADamageFlag_t.DOTA_DAMAGE_FLAG_HPLOSS
        })

        UTIL_Remove(direTop2)
    }

    const topOutpost = getOrError(Entities.FindByName(undefined, "npc_dota_watch_tower_top")) as CDOTA_BaseNPC
    if (topOutpost.GetTeamNumber() !== state.outpostTeam) {
        topOutpost.SetTeam(state.outpostTeam)
        if (state.outpostTeam === DOTATeam_t.DOTA_TEAM_BADGUYS) {
            if (topOutpost.HasModifier("modifier_invulnerable")) {
                topOutpost.RemoveModifierByName("modifier_invulnerable")
            }
        }
    }
}

function handleRequiredRespawn(state: FilledRequiredState) {
    const respawnLocation = state.respawnLocation === "heroLocation" ? state.heroLocation : state.respawnLocation
    setRespawnSettings(respawnLocation, state.respawnTime)
}

function handleRoshan(state: FilledRequiredState) {
    let roshan = Entities.FindAllByName(CustomNpcKeys.Roshan)[0] as CDOTA_BaseNPC
    let customRoshan = Entities.FindAllByName(CustomNpcKeys.CustomRoshan)[0] as CDOTA_BaseNPC
    let roshEntityKey: string;

    if (state.requireRoshan) {

        if (state.customRoshanUnit) {

            if (unitIsValidAndAlive(roshan))
                roshan.Destroy()
    
            roshEntityKey = CustomNpcKeys.CustomRoshan
            roshan = customRoshan
        } else {

            if (unitIsValidAndAlive(customRoshan))
                customRoshan.Destroy()

            roshEntityKey = CustomNpcKeys.Roshan
        }

        if (!unitIsValidAndAlive(roshan)) {
            roshan = CreateUnitByName(roshEntityKey, roshanLocation, true, undefined, undefined, DOTATeam_t.DOTA_TEAM_NEUTRALS)
            roshan.SetEntityName(roshEntityKey)
            roshan.AddItemByName(itemAegis)
        }

        if (roshanLocation.__sub(roshan.GetAbsOrigin()).Length2D() > 0) {
            roshan.Stop()
            FindClearSpaceForUnit(roshan, roshanLocation, true)
        }

        roshan.FaceTowards(outsidePitLocation)

        // Remove standard rosh modifiers so he doesn't grow stronger as time passes
        roshan.RemoveModifierByName("modifier_roshan_inherent_buffs")
        roshan.RemoveModifierByName("modifier_roshan_devotion")
        roshan.RemoveModifierByName("modifier_roshan_devotion_aura")
        // Add modifier since attack speed is part of the devotion modifier, and his attacks don't look genuine without this
        roshan.AddNewModifier(roshan, undefined, modifier_custom_roshan_attack_speed.name, undefined)
    } else {
        if (unitIsValidAndAlive(roshan))
            roshan.Destroy()

        if (unitIsValidAndAlive(customRoshan))
            customRoshan.Destroy()
    }
}

function createOrMoveUnit(unitName: string, team: DotaTeam, location: Vector, faceTo?: Vector, onPostCreate?: (unit: CDOTA_BaseNPC, created: boolean) => void) {
    const context = GameRules.Addon.context

    const postCreate = (unit: CDOTA_BaseNPC) => {
        if (unit.GetAbsOrigin().__sub(location).Length2D() > 100) {
            FindClearSpaceForUnit(unit, location, true)
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
        context[CustomEntityKeys.RadiantTopBountyRune] = CreateRune(runeSpawnsLocations.radiantTopBountyPos, DOTA_RUNES.DOTA_RUNE_BOUNTY)
    }

    context[CustomEntityKeys.RadiantTopBountyRuneEntIndex] = context[CustomEntityKeys.RadiantTopBountyRune].entindex()

    if (!IsValidEntity(context[CustomEntityKeys.RadiantAncientsBountyRune])) {
        context[CustomEntityKeys.RadiantAncientsBountyRune] = CreateRune(runeSpawnsLocations.radiantAncientsBountyPos, DOTA_RUNES.DOTA_RUNE_BOUNTY)
    }

    if (!IsValidEntity(context[CustomEntityKeys.DireBotBountyRune])) {
        context[CustomEntityKeys.DireBotBountyRune] = CreateRune(runeSpawnsLocations.direBotBountyPos, DOTA_RUNES.DOTA_RUNE_BOUNTY)
    }

    if (!IsValidEntity(context[CustomEntityKeys.DireAncientsBountyRune])) {
        context[CustomEntityKeys.DireAncientsBountyRune] = CreateRune(runeSpawnsLocations.direAncientsBountyPos, DOTA_RUNES.DOTA_RUNE_BOUNTY)
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
function handleItemsOnGround() {
    // Clear all items on the ground, if any
    const droppedItems = Entities.FindAllByClassname("dota_item_drop") as CDOTA_Item_Physical[]

    if (droppedItems) {
        for (const droppedItem of droppedItems) {
            const itemEntity = droppedItem.GetContainedItem()
            UTIL_Remove(itemEntity)
            UTIL_Remove(droppedItem)
        }
    }
}

function handlePlantedWards(state: FilledRequiredState) {
    if (state.clearWards) {
        const obsWards = Entities.FindAllByClassname("npc_dota_ward_base")
        const wards = obsWards.concat(Entities.FindAllByClassname("npc_dota_ward_base_truesight"))

        for (const ward of wards) {
            if (IsValidEntity(ward)) {
                UTIL_Remove(ward)
            }
        }
    }
}

function handleAbilityCooldowns(hero: CDOTA_BaseNPC_Hero) {
    for (let index = 0; index < hero.GetAbilityCount(); index++) {
        const ability = hero.GetAbilityByIndex(index)
        if (ability && !ability.IsCooldownReady()) {
            ability.EndCooldown()
        }
    }
}

function handleElderDragonForm(removeElderDragonForm: boolean, hero: CDOTA_BaseNPC_Hero) {
    if (!removeElderDragonForm) return;

    const modifiers = ["modifier_dragon_knight_dragon_form", "modifier_dragon_knight_corrosive_breath", "modifier_dragon_knight_splash_attack", "modifier_dragon_knight_frost_breath"]
    for (const modifier of modifiers) {
        if (hero.HasModifier(modifier)) {
            hero.RemoveModifierByName(modifier)
        }
    }
}
