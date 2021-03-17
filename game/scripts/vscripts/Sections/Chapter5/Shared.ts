import { Blockade } from "../../Blockade";
import * as tg from "../../TutorialGraph/index";
import { removeContextEntityIfExists, unitIsValidAndAlive } from "../../util";

// Chapter 5 blockades
export const chapter5Blockades = {
    direJungleLowgroundRiver: new Blockade(Vector(-4000, 3104, 0), Vector(-3545, 3062, 6)),
    topLaneRiver: new Blockade(Vector(-4832, 2592, 0), Vector(-4840, 2983, 6)),
    radiantSecretShopRiver: new Blockade(Vector(-4327, 2370, 0), Vector(-4007, 2043, 0)),
    direOutpostRiver: new Blockade(Vector(-1753, 2944, 0), Vector(-1432, 2653, 6)),
    roshan: new Blockade(Vector(-2528, 1760, 7), Vector(-2235, 2215, 12)),
    radiantAncientsRiver: new Blockade(Vector(-3175, 1203, 0), Vector(-2855, 873, 0)),
    radiantMidTopRiver: new Blockade(Vector(-2050, 250, 128), Vector(-1700, 250, 128)),
    direMidTopRiver: new Blockade(Vector(-750, 950, 128), Vector(-750, 1350, 128)),
    midRiverTopSide: new Blockade(Vector(-1150, -100, 0), Vector(-700, 200, 0)),
}

export const runeSpawnsLocations = {
    radiantTopBountyPos: Vector(-3852.036621, 2572.075928, 64),
    radiantAncientsBountyPos: Vector(-4122.628418, -74.268593, 304),
    direBotBountyPos: Vector(4031.922363, -2528.032471, 60),
    direAncientsBountyPos: Vector(3151.963379, -463.924164, 304),
    topPowerUpRunePos: Vector(-1640, 984, 48)
}

export const roshanLocation = Vector(-2919, 2315, 32)
export const outsidePitLocation = Vector(-2000, 1800, 0)
export const enemyLocation = Vector(-1400, 700, 0)

export type HeroInfo = {
    name: CustomNpcKeys
}

export const friendlyHeroesInfo: HeroInfo[] = [
    { name: CustomNpcKeys.Tidehunter },
    { name: CustomNpcKeys.Juggernaut },
    { name: CustomNpcKeys.Mirana },
    { name: CustomNpcKeys.Lion },
]

export const enemyHeroesInfo: HeroInfo[] = [
    { name: CustomNpcKeys.Luna },
    { name: CustomNpcKeys.Jakiro },
    { name: CustomNpcKeys.Windrunner },
    { name: CustomNpcKeys.Pudge },
    { name: CustomNpcKeys.Wisp },
]

export const itemDaedalus = "item_greater_crit"
export const itemAegis = "item_aegis"

export const preRoshKillItems = [
    "item_assault",
    "item_power_treads",
    "item_heart",
]

export const allHeroesInfo = friendlyHeroesInfo.concat(enemyHeroesInfo)

function spawnHeroesIfNeeded(location: Vector, heroInfos: HeroInfo[], team: DotaTeam) {
    const steps = (context: tg.TutorialContext) => heroInfos.map(heroInfo => {
        if (!unitIsValidAndAlive(context[heroInfo.name])) {
            return tg.seq([
                tg.spawnUnit(heroInfo.name, location.__add(RandomVector(200)), team, heroInfo.name, true),
                tg.immediate((ctx) => ctx[heroInfo.name].AddExperience(24, ModifyXpReason.UNSPECIFIED, true, false)),
            ])
        }

        return tg.wait(0.1)
    })

    return tg.fork(steps)
}

export function spawnFriendlyHeroes(location: Vector) {
    return spawnHeroesIfNeeded(location, friendlyHeroesInfo, DotaTeam.GOODGUYS)
}

export function spawnEnemyHeroes(location: Vector) {
    return spawnHeroesIfNeeded(location, enemyHeroesInfo, DotaTeam.BADGUYS)
}

export function disposeHeroes(context: tg.TutorialContext, heroesInfo: HeroInfo[]) {
    for (const { name } of heroesInfo) {
        removeContextEntityIfExists(context, name)
    }
}

export function getLivingHeroes(context: tg.TutorialContext): CDOTA_BaseNPC_Hero[] {
    return allHeroesInfo.map(heroInfo => context[heroInfo.name]).filter(unitIsValidAndAlive)
}

export function getLivingFriendlyHeroes(context: tg.TutorialContext): CDOTA_BaseNPC_Hero[] {
    return friendlyHeroesInfo.map(heroInfo => context[heroInfo.name]).filter(unitIsValidAndAlive)
}

export function getLivingEnemyHeroes(context: tg.TutorialContext): CDOTA_BaseNPC_Hero[] {
    return enemyHeroesInfo.map(heroInfo => context[heroInfo.name]).filter(unitIsValidAndAlive)
}
