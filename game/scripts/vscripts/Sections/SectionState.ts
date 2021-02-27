export type SectionState = {
    playerHeroUnitName?: string,
    playerHeroXP?: number,
    playerHeroLocation?: Vector | undefined,
    playerHeroAbilityPoints?: number,
    playerHeroGold?: number,
    requireMudgolems?: boolean,
    mudGolemsLocations?: {
        sunsFanLocation: Vector,
        slacksLocation: Vector,
    }
}

export const defaultSectionState : SectionState = {
    playerHeroUnitName: "npc_dota_hero_dragon_knight",
    playerHeroXP: 0,
    playerHeroLocation: Vector(-6700, -6700, 384),
    playerHeroAbilityPoints: 0,
    playerHeroGold: 0,
}
