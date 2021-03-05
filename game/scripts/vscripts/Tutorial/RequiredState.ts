/**
 * Descriptor for the state. Used together with setupState() to make sure all requirements are fullfilled.
 * If a field is left out a default value is assumed.
 */
export type RequiredState = {
    // Hero
    heroUnitName?: string
    heroLevel?: number
    heroLocation?: Vector
    heroLocationTolerance?: number // How far the hero can be from heroLocation without getting teleported
    heroGold?: number
    heroAbilityMinLevels?: [number, number, number, number],

    // Golems
    requireSunsfanGolem?: boolean
    sunsFanLocation?: Vector
    requireSlacksGolem?: boolean
    slacksLocation?: Vector

    // Riki
    requireRiki?: boolean
    rikiLocation?: Vector

    // Chapter 1 trees
    requireFountainTrees?: boolean
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
    heroLevel: 1,
    heroLocation: Vector(-6700, -6700, 384),
    heroLocationTolerance: 1000,
    heroGold: 0,
    heroAbilityMinLevels: [0, 0, 1, 0],

    // Golems
    requireSunsfanGolem: false,
    sunsFanLocation: Vector(0, 0, 256),
    requireSlacksGolem: false,
    slacksLocation: Vector(0, 0, 256),

    // Riki
    requireRiki: false,
    rikiLocation: GetGroundPosition(Vector(-1500, 4300), undefined),

    // Chapter 1 trees
    requireFountainTrees: false,
}
