import { defaultSectionState, SectionState } from "../Sections/SectionState";
import { getPlayerHero, findRealPlayerID } from "../util";

export const setupState = (sectionState: SectionState) : void => {
    print("Starting state setup")
    let playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    let player = PlayerResource.GetPlayer(findRealPlayerID())

    if (sectionState.playerHeroUnitName ||
        (sectionState.playerHeroXP && playerHero.GetCurrentXP() !== sectionState.playerHeroXP)) {
        playerHero = replacePlayerHero(player, playerHero, sectionState)
    } else {
        if (playerHero.GetUnitName() !== defaultSectionState.playerHeroUnitName)
            playerHero = replacePlayerHero(player, playerHero, defaultSectionState)
    }
   
    if (sectionState.playerHeroLocation) {
        updateHeroPosition(playerHero, sectionState.playerHeroLocation)
    } else {
        if (defaultSectionState.playerHeroLocation) {
            updateHeroPosition(playerHero, defaultSectionState.playerHeroLocation)
        }
    }

    if (sectionState.playerHeroAbilityPoints) {
        updateAbilityPoints(playerHero, sectionState.playerHeroAbilityPoints)
    } else {
        if (defaultSectionState.playerHeroAbilityPoints)
            updateAbilityPoints(playerHero, defaultSectionState.playerHeroAbilityPoints)
    }

    if (sectionState.playerHeroGold) {
        updateGold(playerHero, sectionState.playerHeroGold)
    } else {
        if (defaultSectionState.playerHeroGold)
            updateGold(playerHero, defaultSectionState.playerHeroGold)
    }
    
    if (sectionState.requireMudgolems)
        createMudgolems(sectionState)
    else
        clearMudGolems()

}

function replacePlayerHero(player: CDOTAPlayer | undefined, playerHero: CDOTA_BaseNPC_Hero, sectionState: SectionState) : CDOTA_BaseNPC_Hero {
    let heroName = sectionState.playerHeroUnitName ?? defaultSectionState.playerHeroUnitName
    let heroGold = sectionState.playerHeroGold ?? defaultSectionState.playerHeroGold
    let heroXP = sectionState.playerHeroXP ?? defaultSectionState.playerHeroXP

    if (player && heroName && heroGold && heroXP) {
        playerHero = PlayerResource.ReplaceHeroWith(player.GetPlayerID(), heroName, heroGold, heroXP)
    }

    return playerHero
}

function updateHeroPosition(playerHero: CDOTA_BaseNPC_Hero, newPosition: Vector) {
    playerHero.Stop()
    playerHero.SetAbsOrigin(newPosition)
}

function updateAbilityPoints(playerHero: CDOTA_BaseNPC_Hero, abilityPoints: number) {
    if (playerHero.GetAbilityPoints() !== abilityPoints)
        playerHero.SetAbilityPoints(abilityPoints)
}

function updateGold(playerHero: CDOTA_BaseNPC_Hero, goldAmount: number) {
    if (playerHero.GetGold() !== goldAmount)
        playerHero.SetGold(goldAmount, false)
}

function createMudgolems(sectionState: SectionState) {
    const context = GameRules.Addon.context

    if (sectionState.mudGolemsLocations) {
        if (!context[CustomNpcKeys.SunsFanMudGolem]) {
            CreateUnitByNameAsync(CustomNpcKeys.SunsFanMudGolem, sectionState.mudGolemsLocations.sunsFanLocation, true, undefined, undefined, DotaTeam.GOODGUYS, 
                unit => {
                    if (sectionState.playerHeroLocation)
                        unit.FaceTowards(sectionState.playerHeroLocation)
                    else if (defaultSectionState.playerHeroLocation)
                        unit.FaceTowards(defaultSectionState.playerHeroLocation)
                    context[CustomNpcKeys.SunsFanMudGolem] = unit
                }
            )
        }

        if (!context[CustomNpcKeys.SlacksMudGolem]) {
            CreateUnitByNameAsync(CustomNpcKeys.SlacksMudGolem, sectionState.mudGolemsLocations.slacksLocation, true, undefined, undefined, DotaTeam.GOODGUYS, 
                unit => {
                    if (sectionState.playerHeroLocation)
                        unit.FaceTowards(sectionState.playerHeroLocation)
                    else if (defaultSectionState.playerHeroLocation)
                        unit.FaceTowards(defaultSectionState.playerHeroLocation)
                    context[CustomNpcKeys.SlacksMudGolem] = unit
                }
            )
        }
    }
}

function clearMudGolems() {
    const context = GameRules.Addon.context

    if (context[CustomNpcKeys.SunsFanMudGolem]) {
        if (IsValidEntity(context[CustomNpcKeys.SunsFanMudGolem])) {
            context[CustomNpcKeys.SunsFanMudGolem].RemoveSelf()
        }
        context[CustomNpcKeys.SunsFanMudGolem] = undefined
    }

    if (context[CustomNpcKeys.SlacksMudGolem]) {
        if (IsValidEntity(context[CustomNpcKeys.SlacksMudGolem])) {
            context[CustomNpcKeys.SlacksMudGolem].RemoveSelf()
        }
        context[CustomNpcKeys.SlacksMudGolem] = undefined
    }
}
