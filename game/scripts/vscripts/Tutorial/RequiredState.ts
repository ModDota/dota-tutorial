/**
 * Descriptor for the state. Used together with setupState() to make sure all requirements are fullfilled.
 * If a field is left out a default value is assumed.
 */
export type RequiredState = {
    // Hero
    heroUnitName?: string
    heroXP?: number
    heroLocation?: Vector
    heroLocationTolerance?: number // How far the hero can be from heroLocation without getting teleported
    heroAbilityPoints?: number
    heroGold?: number

    // Golems
    requireSunsfanGolem?: boolean
    sunsFanLocation?: Vector
    requireSlacksGolem?: boolean
    slacksLocation?: Vector
}

/**
 * RequiredState with all fields mandatory.
 */
export type FilledRequiredState = Required<RequiredState>

/**
 * Default values for the fields of a RequiredState if they were not defined.
 */
export const defaultRequiredState: FilledRequiredState = {
    // Hero
    heroUnitName: "npc_dota_hero_dragon_knight",
    heroXP: 0,
    heroLocation: Vector(-6700, -6700, 384),
    heroLocationTolerance: 1000,
    heroAbilityPoints: 0,
    heroGold: 0,

    // Golems
    requireSunsfanGolem: false,
    sunsFanLocation: Vector(0, 0, 256),
    requireSlacksGolem: false,
    slacksLocation: Vector(0, 0, 256),
}
