import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { chapter5Blockades, roshanLocations, runeSpawnsLocations } from "./Shared";
import { disposeHeroes, centerCameraOnHero, findRealPlayerID, getOrError, getPlayerCameraLocation, getPlayerHero, setUnitPacifist } from "../../util";

const sectionName: SectionName = SectionName.Chapter5_Roshan;

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = false;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5906, -3892, 256),
    sunsFanLocation: Vector(-5500, -4170, 256),
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
    requireRoshan: true
};

// Move to state when implementing final section of CH5
const friendlyHeroesInfo = [
    { name: CustomNpcKeys.Tidehunter, loc: Vector(-2192, 1718, 0) }, // Offlane, tank
    { name: CustomNpcKeys.Juggernaut, loc: Vector(-2026, 1550, 0) }, // Carry
    { name: CustomNpcKeys.Mirana, loc: Vector(-2074, 1465, 0) }, // Position 4
    { name: CustomNpcKeys.Lion, loc: Vector(-2282, 1462, 0) }, // Position 5
];

const roshanMusic = "valve_ti10.music.roshan"

function onStart(complete: () => void) {
    print("Starting", sectionName);
    const goalTracker = new GoalTracker();
    const goalEnterRoshPit = goalTracker.addBoolean("Walk into Roshan's pit.");
    const goalUpgradeTalents = goalTracker.addBoolean("Choose and pick between the available talents.")
    const goalDefeatRoshan = goalTracker.addBoolean("Defeat Roshan!");
    const goalPickupAegis = goalTracker.addBoolean("Pick up the Aegis of the Immortal.")
    const goalLeaveRoshPit = goalTracker.addBoolean("Leave Roshan's pit and move to the next marker.")

    const roshPitGoalPosition = Vector(-2600, 2200, 28)

    const playerHero = getOrError(getPlayerHero())

    const itemDaedalus = "item_greater_crit"
    const itemAC = "item_assault"
    const itemPowerTreads = "item_power_treads"
    const itemHeart = "item_heart"
    const itemAegis = "item_aegis"

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
                    tg.panCameraLinear(_ => getPlayerCameraLocation(), roshPitGoalPosition, 2),
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
                playerHero.AddItemByName(itemPowerTreads)
                playerHero.AddItemByName(itemAC)
                playerHero.AddItemByName(itemDaedalus)
                playerHero.AddItemByName(itemHeart)
                // Reapply DD rune for infinite duration
                playerHero.RemoveModifierByName("modifier_rune_doubledamage")
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
            }, 2),
            tg.immediate(() => goalUpgradeTalents.complete()),
            tg.audioDialog(LocalizationKey.Script_5_Roshan_5, LocalizationKey.Script_5_Roshan_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(() => {
                setUnitPacifist(roshan, false)
                goalDefeatRoshan.start()
            }),
            tg.playGlobalSound(roshanMusic),
            tg.completeOnCheck(() => {
                return roshan.IsAttacking()
            }, 0.5),
            tg.fork(friendlyHeroesInfo.map(hero =>
                tg.seq([
                    tg.spawnUnit(hero.name, hero.loc, DotaTeam.GOODGUYS, hero.name),
                    tg.immediate((ctx) => ctx[hero.name].AddExperience(24, ModifyXpReason.UNSPECIFIED, true, false))
                ])
            )),
            tg.wait(1),
            tg.immediate(context => {
                for (const friendlyHero of friendlyHeroesInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[friendlyHero.name]
                    hero.SetForceAttackTarget(roshan)
                }
            }),
            tg.setCameraTarget(context => context[friendlyHeroesInfo[0].name]),
            tg.wait(1),
            tg.setCameraTarget(undefined),
            tg.immediate(_ => centerCameraOnHero()),
            tg.audioDialog(LocalizationKey.Script_5_Roshan_6, LocalizationKey.Script_5_Roshan_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.completeOnCheck(() => {
                return !roshan.IsAlive()
            }, 2),
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
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[0].name], roshPitGoalPosition.__add(Vector(500, -800, 0)), true),
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[1].name], roshPitGoalPosition.__add(Vector(500, -600, 0)), true),
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[2].name], roshPitGoalPosition.__add(Vector(300, -500, 0)), true),
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[3].name], roshPitGoalPosition.__add(Vector(100, -500, 0)), true),
            ]),
            tg.fork(friendlyHeroesInfo.map(friendlyHero => tg.faceTowards(ctx => ctx[friendlyHero.name], Vector(0, 0, 0)))),
            tg.immediate(() => {
                goalPickupAegis.start()
                canPlayerIssueOrders = true
            }),
            tg.completeOnCheck(() => playerHero.HasItemInInventory(itemAegis), 2),
            tg.immediate(() => goalPickupAegis.complete()),
            tg.audioDialog(LocalizationKey.Script_5_Roshan_8, LocalizationKey.Script_5_Roshan_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.immediate(() => goalLeaveRoshPit.start()),
            tg.goToLocation(roshanLocations.lairExit),
            tg.immediate(() => {
                goalLeaveRoshPit.complete()
                // Move to requiredState when last section of CH5 is being implemented
                disposeHeroes(friendlyHeroesInfo)
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

    disposeHeroes(friendlyHeroesInfo)

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
