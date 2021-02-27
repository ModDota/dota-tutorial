export type SectionState = {
    // Hero
    playerHeroUnitName?: string
    playerHeroXP?: number
    playerHeroLocation?: Vector | undefined
    playerHeroLocationTolerance?: number
    playerHeroAbilityPoints?: number
    playerHeroGold?: number

    // Golems
    requireSunsfanGolem?: boolean
    sunsFanLocation?: Vector
    requireSlacksGolem?: boolean
    slacksLocation?: Vector
}

export type FilledSectionState = {
    // Hero
    playerHeroUnitName: string
    playerHeroXP: number
    playerHeroLocation: Vector | undefined
    playerHeroLocationTolerance: number
    playerHeroAbilityPoints: number
    playerHeroGold: number

    // Golems
    requireSunsfanGolem: boolean
    sunsFanLocation: Vector
    requireSlacksGolem: boolean
    slacksLocation: Vector
}

export const defaultSectionState: FilledSectionState = {
    // Hero
    playerHeroUnitName: "npc_dota_hero_dragon_knight",
    playerHeroXP: 0,
    playerHeroLocation: Vector(-6700, -6700, 384),
    playerHeroLocationTolerance: 1000,
    playerHeroAbilityPoints: 0,
    playerHeroGold: 0,

    // Golems
    requireSunsfanGolem: false,
    sunsFanLocation: Vector(0, 0, 256),
    requireSlacksGolem: false,
    slacksLocation: Vector(0, 0, 256),
}
