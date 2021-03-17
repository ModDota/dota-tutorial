import { Blockade } from "../Blockade"

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
    heroAbilityMinLevels?: [number, number, number, number]
    heroItems?: Record<string, number> // Items (and how many of them) the hero must have in his inventory.
    removeUnrequiredItems?: boolean  // If true, remove any items not specified in heroItems. (Default true)
    heroHasDoubleDamage?: boolean

    // Camera
    lockCameraOnHero?: boolean
    centerCameraOnHero?: boolean // Whether to center the camera on the hero (not locking) when starting the section

    // Golems
    requireSunsfanGolem?: boolean
    sunsFanLocation?: Vector
    requireSlacksGolem?: boolean
    slacksLocation?: Vector
    requireODPixelGolem?: boolean
    odPixelLocation?: Vector

    // Elder Dragon Form
    removeElderDragonForm?: boolean,

    // Towers
    topDireT1TowerStanding?: boolean

    // Riki
    requireRiki?: boolean
    rikiLocation?: Vector

    // Chapter 1 trees
    requireFountainTrees?: boolean

    // Blockades
    blockades?: Blockade[]

    // Chapter 5 bounty runes
    requireBountyRunes?: boolean

    // Respawn positions for unintended deaths
    respawnLocation?: Vector | "heroLocation"
    respawnTime?: number

    // Roshan
    requireRoshan?: boolean
    roshanHitsLikeATruck?: boolean

    // Planted wards
    clearWards?: boolean
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
    heroItems: {},
    removeUnrequiredItems: true,
    heroHasDoubleDamage: false,

    // Camera
    lockCameraOnHero: false,
    centerCameraOnHero: false,

    // Golems
    requireSunsfanGolem: false,
    sunsFanLocation: Vector(0, 0, 0),
    requireSlacksGolem: false,
    slacksLocation: Vector(0, 0, 0),
    requireODPixelGolem: false,
    odPixelLocation: Vector(0, 0, 0),

    // Elder Dragon Form
    removeElderDragonForm: true,

    // Towers
    topDireT1TowerStanding: true,

    // Riki
    requireRiki: false,
    rikiLocation: GetGroundPosition(Vector(-1500, 4300), undefined),

    // Chapter 1 trees
    requireFountainTrees: false,

    // Blockades
    blockades: [],

    // Chapter 5 bounty runes
    requireBountyRunes: false,

    // Respawn positions for unintended deaths
    respawnLocation: "heroLocation",
    respawnTime: 10,

    // Roshan
    requireRoshan: false,
    roshanHitsLikeATruck: false,

    // Planted wards
    clearWards: true
}
