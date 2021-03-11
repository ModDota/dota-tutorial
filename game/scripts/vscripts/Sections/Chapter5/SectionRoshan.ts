import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { chapter5Blockades, runeSpawnsLocations } from "./Shared";
import { findRealPlayerID, getOrError, getPlayerHero, setUnitPacifist, unitIsValidAndAlive } from "../../util";
import { modifier_custom_roshan_attack_speed } from "../../modifiers/modifier_custom_roshan_attack_speed";

const sectionName: SectionName = SectionName.Chapter5_Roshan;

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = false;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5906, -3892, 256),
    sunsFanLocation: Vector(-5500, -4170, 256),
    heroLocation: runeSpawnsLocations.topPowerUpRunePos.__add(Vector(-200, 0, -48)),
    heroLocationTolerance: 800,
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroHasDoubleDamage: true,
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
};

// Move to state when implementing final section of CH5
const friendlyHeroesInfo = [
    { name: "npc_dota_hero_tidehunter", loc: Vector(-2192, 1718, 0) }, // Offlane, tank
    { name: "npc_dota_hero_juggernaut", loc: Vector(-2026, 1550, 0) }, // Carry
    { name: "npc_dota_hero_mirana", loc: Vector(-2074, 1465, 0) }, // Position 4
    { name: "npc_dota_hero_lion", loc: Vector(-2282, 1462, 0) }, // Position 5
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
    const leaveRoshPitGoalPosition = Vector(-2140, 1740, 0)

    const playerHero = getOrError(getPlayerHero())

    const itemDaedalus = "item_greater_crit"
    const itemAC = "item_assault"
    const itemPowerTreads = "item_power_treads"
    const itemHeart = "item_heart"
    const itemAegis = "item_aegis"

    let roshan = Entities.FindAllByName("npc_dota_roshan")[0] as CDOTA_BaseNPC

    if (!roshan) {
        roshan = CreateUnitByName("npc_dota_roshan", Vector(-2919, 2315, 32), true, undefined, undefined, DotaTeam.NEUTRALS)
        roshan.FaceTowards(leaveRoshPitGoalPosition)
        roshan.AddItemByName(itemAegis)
    }

    setupRoshanModifiers(roshan)

    // Clear any Aegis boxes left on the ground
    const droppedItems = Entities.FindAllByClassname("dota_item_drop") as CDOTA_Item_Physical[]

    if (droppedItems) {
        for (const droppedItem of droppedItems) {
            const itemEntity = droppedItem.GetContainedItem()
            if (itemEntity.GetAbilityName() === itemAegis) {
                droppedItem.Destroy()
            }
        }
    }

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
                    tg.textDialog(LocalizationKey.Script_5_Roshan_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
                    tg.immediate(() => goalEnterRoshPit.start()),
                    tg.goToLocation(roshPitGoalPosition),
                ]),
                tg.seq([
                    tg.panCameraLinear(playerHero.GetOrigin(), roshPitGoalPosition, 2),
                    tg.wait(2),
                    tg.immediate(() => canPlayerIssueOrders = true),
                    tg.setCameraTarget(playerHero),
                    tg.wait(1),
                    tg.setCameraTarget(undefined),
                ]),
            ]),
            tg.immediate(() => goalEnterRoshPit.complete()),
            tg.textDialog(LocalizationKey.Script_5_Roshan_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 8),
            tg.textDialog(LocalizationKey.Script_5_Roshan_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 5),
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
            tg.textDialog(LocalizationKey.Script_5_Roshan_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 10),
            tg.immediate(() => canPlayerIssueOrders = true),
            tg.completeOnCheck(() => {
                if (dragonBlood25Talent && dragonTail25Talent)
                    return ((dragonBlood25Talent.GetLevel() >= 1 || dragonTail25Talent.GetLevel() >= 1))
                else {
                    error("Hero talents/abilities not found!")
                }
            }, 2),
            tg.immediate(() => goalUpgradeTalents.complete()),
            tg.textDialog(LocalizationKey.Script_5_Roshan_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
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
            tg.setCameraTarget(playerHero),
            tg.wait(1),
            tg.setCameraTarget(undefined),
            tg.textDialog(LocalizationKey.Script_5_Roshan_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
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
                tg.textDialog(LocalizationKey.Script_5_Roshan_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 4),
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
            tg.textDialog(LocalizationKey.Script_5_Roshan_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.immediate(() => goalLeaveRoshPit.start()),
            tg.goToLocation(leaveRoshPitGoalPosition),
            tg.immediate(() => {
                goalLeaveRoshPit.complete()
                // Move to requiredState when last section of CH5 is being implemented
                disposeHeroes()
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

    const roshan = Entities.FindAllByName("npc_dota_roshan")[0] as CDOTA_BaseNPC

    if (roshan) {
        roshan.Destroy()
    }

    disposeHeroes()

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

// Similar func used in Chapter 4 in two sections, maybe refactor as util function at some point
function disposeHeroes() {
    for (const friendlyHero of friendlyHeroesInfo) {
        let hero: CDOTA_BaseNPC_Hero | undefined = GameRules.Addon.context[friendlyHero.name];
        if (unitIsValidAndAlive(hero)) {
            hero = hero as CDOTA_BaseNPC_Hero
            hero.RemoveSelf();
        }
        
        GameRules.Addon.context[friendlyHero.name] = undefined;
    }
}

// Setup Roshan's modifiers
function setupRoshanModifiers(roshan: CDOTA_BaseNPC) {
    roshan.RemoveModifierByName("modifier_roshan_inherent_buffs")
    roshan.RemoveModifierByName("modifier_roshan_devotion")
    roshan.RemoveModifierByName("modifier_roshan_devotion_aura")
    roshan.AddNewModifier(roshan, undefined, modifier_custom_roshan_attack_speed.name, undefined)
}
