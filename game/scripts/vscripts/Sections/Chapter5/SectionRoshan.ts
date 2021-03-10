import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { chapter5Blockades, runeSpawnsLocations } from "./Shared";
import { findRealPlayerID, getOrError, getPlayerHero, setUnitPacifist } from "../../util";

const sectionName: SectionName = SectionName.Chapter5_Roshan;

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = false;

/**
 * Describes the state we want the game to be in before this section is executed. The game will try to make the state match this required state.
 */
const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5906, -3892, 256),
    sunsFanLocation: Vector(-5500, -4170, 256),
    heroLocation: runeSpawnsLocations.topPowerUpRunePos.__add(Vector(-200, 0, -48)),
    heroLocationTolerance: 800,
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

function onStart(complete: () => void) {
    print("Starting", sectionName);
    const goalTracker = new GoalTracker();
    const goalEnterRoshPit = goalTracker.addBoolean("Walk into Roshan's pit.");
    const goalUseAbilityPoints = goalTracker.addBoolean("Spend all of your ability and talent points.")
    const goalDefeatRoshan = goalTracker.addBoolean("Defeat Roshan!");
    const goalPickupAegis = goalTracker.addBoolean("Pick up the Aegis of the Immortal.")
    const goalLeaveRoshPit = goalTracker.addBoolean("Leave Roshan's pit and move to the next marker.")

    const roshPitGoalPosition = Vector(-2600, 2200, 28)
    const leaveRoshPitGoalPosition = Vector(-2200, 1900, 0)

    const playerHero = getOrError(getPlayerHero())

    const itemDaedalus = "item_greater_crit"
    const itemAC = "item_assault"
    const itemPowerTreads = "item_power_treads"
    const itemHeart = "item_heart"
    const itemAegis = "item_aegis"

    let roshan = Entities.FindAllByName("npc_dota_roshan")[0] as CDOTA_BaseNPC
    let aegis = Entities.FindAllByName(itemAegis)[0] as CDOTA_Item

    if (aegis) {
        print("Aegis exists on the ground:")
        print(!aegis.IsInBackpack())
    }

    if (!roshan) {
        roshan = CreateUnitByName("npc_dota_roshan", Vector(-2919, 2315, 32), true, undefined, undefined, DotaTeam.NEUTRALS)
        roshan.AddItemByName(itemAegis)
    }

    // DK abilities
    const dragonTailAbility = playerHero.FindAbilityByName("dragon_knight_dragon_tail") as CDOTABaseAbility
    const breatheFireAbility = playerHero.FindAbilityByName("dragon_knight_breathe_fire") as CDOTABaseAbility
    const dragonBloodAbility = playerHero.FindAbilityByName("dragon_knight_dragon_blood") as CDOTABaseAbility
    const elderDragonAbility = playerHero.FindAbilityByName("dragon_knight_elder_dragon_form") as CDOTABaseAbility

    // DK talents
    const mpRegen10Talent = playerHero.FindAbilityByName("special_bonus_mp_regen_2") as CDOTABaseAbility
    const dmgReduction10Talent = playerHero.FindAbilityByName("special_bonus_unique_dragon_knight_3") as CDOTABaseAbility
    const dragonBlood25Talent = playerHero.FindAbilityByName("special_bonus_unique_dragon_knight") as CDOTABaseAbility
    const dragonTail25Talent = playerHero.FindAbilityByName("special_bonus_unique_dragon_knight_2") as CDOTABaseAbility

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
                // Reapply DD rune
                playerHero.RemoveModifierByName("modifier_rune_doubledamage")
                playerHero.AddNewModifier(playerHero, undefined, "modifier_rune_doubledamage", undefined)
            }),
            tg.immediate(() => canPlayerIssueOrders = false),
            tg.wait(1),
            tg.textDialog(LocalizationKey.Script_5_Roshan_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 10),
            tg.immediate(() => {
                canPlayerIssueOrders = true
                goalUseAbilityPoints.start()
            }),
            tg.completeOnCheck(() => {
                return ((dragonBlood25Talent.GetLevel() >= 1 || dragonTail25Talent.GetLevel() >= 1))
            }, 2),
            // Require player to spend all ability points
            tg.upgradeAbility(dragonTailAbility, 4),
            tg.upgradeAbility(breatheFireAbility, 4),
            tg.upgradeAbility(dragonBloodAbility, 4),
            tg.upgradeAbility(elderDragonAbility, 3),
            tg.immediate(() => goalUseAbilityPoints.complete()),
            tg.textDialog(LocalizationKey.Script_5_Roshan_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.immediate(() => {
                setUnitPacifist(roshan, false)
                goalDefeatRoshan.start()
            }),
            tg.playGlobalSound("valve_ti10.music.roshan"),
            tg.completeOnCheck(() => {
                return roshan.IsAttacking()
            }, 0.5),
            // tg.immediate(() => {
            //     let player = PlayerResource.GetPlayer(playerHero.GetPlayerID())
            //     if (player)
            //         player.SetMusicStatus(MusicStatus.NONE, 0)
            // }),
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
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[0].name], roshPitGoalPosition.__add(Vector(500, -800, 0))),
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[1].name], roshPitGoalPosition.__add(Vector(500, -600, 0))),
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[2].name], roshPitGoalPosition.__add(Vector(300, -500, 0))),
                tg.moveUnit(ctx => ctx[friendlyHeroesInfo[3].name], roshPitGoalPosition.__add(Vector(100, -500, 0))),
            ]),
            tg.fork(friendlyHeroesInfo.map(friendlyHero => tg.faceTowards(ctx => ctx[friendlyHero.name], Vector(0,0,0)))),
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
                // Move to requiredState when last section of CH5 is done
                disposeHeroes()
            }),
        ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        complete();
    });
}

function onStop() {
    print("Stopping", sectionName);
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

// Similar func used in Chapter 4 in two sections, maybe refactor as util function at some point
function disposeHeroes() {
    for (const friendlyHero of friendlyHeroesInfo) {
        const hero: CDOTA_BaseNPC_Hero | undefined = GameRules.Addon.context[friendlyHero.name];
        if (hero && IsValidEntity(hero) && hero.IsAlive())
            hero.RemoveSelf();
        GameRules.Addon.context[friendlyHero.name] = undefined;
    }
}
