import { Blockade } from "../../Blockade";

export enum Chapter2SpecificKeys {
    RadiantCreeps = "radiantCreepsGroupChapter2",
    DireCreeps = "direCreepsGroupChapter2",
    sniperEnemyHero = "sniperEnemyHeroDenyChapter2"
}

export enum LastHitStages {
    LAST_HIT = 1,
    LAST_HIT_BREATHE_FIRE = 2,
    LAST_HIT_DENY = 3,
}

export const radiantCreepsNames = [CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantRangedCreep];
export const direCreepNames = [CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireRangedCreep];

// Chapter 2 Blockades
export const chapter2Blockades = {
    radiantBaseMid: new Blockade(Vector(-4793, -3550, 256), Vector(-4061, -4212, 256)),
    radiantBaseBottom: new Blockade(Vector(-3612, -5557, 256), Vector(-3584, -6567, 256)),
    radiantBaseTop: new Blockade(Vector(-6124, -3100, 256), Vector(-7067, -3099, 256)),
    radiantBaseT2Divider: new Blockade(Vector(-5707, -2847, 128), Vector(-5610, -1551, 128)),
    radiantJungleStairs: new Blockade(Vector(-4953, 470, 128), Vector(-4520, 861, 128)),
    secretShopToRiverStairs: new Blockade(Vector(-4173, 1816, 128), Vector(-4576, 2208, 128)),
    topToRiverStairs: new Blockade(Vector(-5144, 2535, 128), Vector(-5144, 3099, 128)),
    direTopDividerRiver: new Blockade(Vector(-3969, 3352, 128), Vector(-3232, 4512, 128)),
    direTopDividerCliff: new Blockade(Vector(-3062, 4710, 128), Vector(-2969, 7335, 128)),
    direTopJungleBlocker: new Blockade(Vector(-2976, 4503, 128), Vector(-2937, 3562, 128)),
    aboveRoshanBlocker: new Blockade(Vector(-2592, 3103, 0), Vector(-2720, 2784, 0)),
    belowRoshanBlocker: new Blockade(Vector(-3232, 1952, 0), Vector(-3488, 1440, 0))
}
