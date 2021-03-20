import { GoalTracker } from "../../Goals";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { centerCameraOnHero, findRealPlayerID, getOrError, getPlayerCameraLocation, getPlayerHero, setUnitPacifist, unitIsValidAndAlive } from "../../util";
import * as shared from "./Shared";
import { chapter5Blockades, friendlyHeroesInfo, runeSpawnsLocations } from "./Shared";

const sectionName: SectionName = SectionName.Chapter5_Roshan;

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = false;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: runeSpawnsLocations.topPowerUpRunePos.__add(Vector(-200, 0, -48)),
    heroLocationTolerance: 2000,
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    blockades: [
        chapter5Blockades.direJungleLowgroundRiver,
        chapter5Blockades.topLaneRiver,
        chapter5Blockades.radiantSecretShopRiver,
        chapter5Blockades.direOutpostRiver,
        chapter5Blockades.radiantAncientsRiver,
        chapter5Blockades.radiantMidTopRiver,
        chapter5Blockades.direMidTopRiver,
        chapter5Blockades.midRiverTopSide,
    ],
    requireRoshan: true,
    topDireT1TowerStanding: false,
    topDireT2TowerStanding: false,
    outpostTeam: DotaTeam.GOODGUYS,
    heroItems: { [shared.itemDaedalus]: 1, "item_mysterious_hat": 1 },
};

const roshanMusic = "valve_ti10.music.roshan"

function onStart(complete: () => void) {
    print("Starting", sectionName);
    const goalTracker = new GoalTracker();
    const goalEnterRoshPit = goalTracker.addBoolean(LocalizationKey.Goal_5_Roshan_1);
    const goalUpgradeTalents = goalTracker.addBoolean(LocalizationKey.Goal_5_Roshan_2)
    const goalDefeatRoshan = goalTracker.addBoolean(LocalizationKey.Goal_5_Roshan_3);
    const goalPickupAegis = goalTracker.addBoolean(LocalizationKey.Goal_5_Roshan_4)
    const goalLeaveRoshPit = goalTracker.addBoolean(LocalizationKey.Goal_5_Roshan_5)

    const roshPitGoalPosition = Vector(-2600, 2200, 28)

    const playerHero = getOrError(getPlayerHero())

    let roshan = Entities.FindAllByName(CustomNpcKeys.Roshan)[0] as CDOTA_BaseNPC

    // DK lvl 25 talents
    const dragonBlood25Talent = playerHero.FindAbilityByName("special_bonus_unique_dragon_knight")
    const dragonTail25Talent = playerHero.FindAbilityByName("special_bonus_unique_dragon_knight_2")

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(() => canPlayerIssueOrders = false),
            tg.wait(1),
            tg.immediate(() => setUnitPacifist(roshan, true)),
            tg.fork([
                tg.seq([
                    tg.audioDialog(LocalizationKey.Script_5_Roshan_1, LocalizationKey.Script_5_Roshan_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                    tg.immediate(() => goalEnterRoshPit.start()),
                    tg.goToLocation(roshPitGoalPosition),
                ]),
                tg.seq([
                    tg.panCameraLinear(_ => getPlayerCameraLocation(), roshPitGoalPosition, 1),
                    tg.wait(2),
                    tg.immediate(() => canPlayerIssueOrders = true),
                    tg.setCameraTarget(undefined),
                    tg.immediate(_ => centerCameraOnHero()),
                ]),
            ]),
            tg.immediate(() => goalEnterRoshPit.complete()),
            tg.audioDialog(LocalizationKey.Script_5_Roshan_2, LocalizationKey.Script_5_Roshan_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_Roshan_3, LocalizationKey.Script_5_Roshan_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(() => {
                // Lvl up to 25, assuming 1 xp per level
                playerHero.AddExperience(25 - playerHero.GetLevel(), ModifyXpReason.UNSPECIFIED, true, false)
                shared.preRoshKillItems.forEach(itemName => playerHero.AddItemByName(itemName))
                // Apply DD rune with infinite duration
                playerHero.AddNewModifier(playerHero, undefined, "modifier_rune_doubledamage", undefined)
                maxLevelAbilities(playerHero)
            }),
            tg.immediate(() => canPlayerIssueOrders = false),
            tg.wait(1),
            tg.immediate(() => goalUpgradeTalents.start()),
            tg.audioDialog(LocalizationKey.Script_5_Roshan_4, LocalizationKey.Script_5_Roshan_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.immediate(() => canPlayerIssueOrders = true),
            tg.completeOnCheck(() => {
                if (dragonBlood25Talent && dragonTail25Talent)
                    return ((dragonBlood25Talent.GetLevel() >= 1 || dragonTail25Talent.GetLevel() >= 1))
                else {
                    error("Hero talents/abilities not found!")
                }
            }, 0.2),
            tg.immediate(() => goalUpgradeTalents.complete()),
            tg.audioDialog(LocalizationKey.Script_5_Roshan_5, LocalizationKey.Script_5_Roshan_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(() => {
                setUnitPacifist(roshan, false)
                goalDefeatRoshan.start()
            }),
            tg.playGlobalSound(roshanMusic),
            tg.completeOnCheck(() => !unitIsValidAndAlive(roshan) || roshan.IsAttacking(), 0.5),
            shared.spawnFriendlyHeroes(Vector(-2000, 1550, 0)),
            tg.wait(1),
            tg.immediate(context => {
                if (unitIsValidAndAlive(roshan)) {
                    for (const friendlyHero of friendlyHeroesInfo) {
                        const hero: CDOTA_BaseNPC_Hero = context[friendlyHero.name]
                        if (unitIsValidAndAlive(hero)) {
                            hero.SetForceAttackTarget(roshan)
                        }
                    }
                }
            }),
            tg.setCameraTarget(context => context[friendlyHeroesInfo[0].name]),
            tg.wait(1),
            tg.setCameraTarget(undefined),
            tg.immediate(_ => centerCameraOnHero()),
            tg.audioDialog(LocalizationKey.Script_5_Roshan_6, LocalizationKey.Script_5_Roshan_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.completeOnCheck(() => !unitIsValidAndAlive(roshan), 0.2),
            tg.immediate(() => {
                goalDefeatRoshan.complete()
                StopGlobalSound(roshanMusic)
                playerHero.RemoveModifierByName("modifier_rune_doubledamage")
                canPlayerIssueOrders = false
            }),
            tg.immediate(context => {
                for (const friendlyHero of friendlyHeroesInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[friendlyHero.name]
                    hero.SetForceAttackTarget(undefined)
                }
            }),
            // Move units assuming offlane -> carry -> pos 4 -> pos 5 ordering in friendlyHeroesInfo
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_5_Roshan_7, LocalizationKey.Script_5_Roshan_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[0].name], shared.outsidePitLocation.__add(RandomVector(200)), true),
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[1].name], shared.outsidePitLocation.__add(RandomVector(200)), true),
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[2].name], shared.outsidePitLocation.__add(RandomVector(200)), true),
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[3].name], shared.outsidePitLocation.__add(RandomVector(200)), true),
            ]),
            tg.fork(friendlyHeroesInfo.map(friendlyHero => tg.faceTowards(ctx => ctx[friendlyHero.name], Vector(0, 0, 0)))),
            tg.immediate(() => {
                goalPickupAegis.start()
                canPlayerIssueOrders = true
            }),
            tg.completeOnCheck(() => playerHero.HasItemInInventory(shared.itemAegis), 0.2),
            tg.immediate(() => goalPickupAegis.complete()),
            tg.audioDialog(LocalizationKey.Script_5_Roshan_8, LocalizationKey.Script_5_Roshan_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            // Spawn enemies and make our heroes leave the pit
            tg.immediate(() => goalLeaveRoshPit.start()),
            tg.goToLocation(shared.outsidePitLocation),
            shared.spawnEnemyHeroes(shared.enemyLocation),
            tg.immediate(() => {
                goalLeaveRoshPit.complete()
            }),
            tg.wait(1)
        ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        complete();
    });
}

function onStop() {
    print("Stopping", sectionName);

    StopGlobalSound(roshanMusic)

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

function chapterFiveRoshanOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (!canPlayerIssueOrders) return false;

    return true;
}

export const sectionRoshan = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    chapterFiveRoshanOrderFilter
);

function maxLevelAbilities(heroUnit: CDOTA_BaseNPC_Hero) {
    const abilities = [0, 1, 2, 5].map((abilityIndex) => heroUnit.GetAbilityByIndex(abilityIndex))
    for (const ability of abilities) {
        if (ability)
            ability.SetLevel(ability.GetMaxLevel())
    }
}
