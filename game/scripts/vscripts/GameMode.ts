import { reloadable } from "./lib/tstl-utils";
import * as chapters from "./Sections/index";
import { CustomTimeManager } from "./TimeManager";
import * as tut from "./Tutorial/Core";
import { TutorialContext } from "./TutorialGraph";
import { findAllPlayersID, findRealPlayerID, getOrError, getPlayerHero, setUnitPacifist } from "./util";

declare global {
    interface CDOTAGamerules {
        Addon: GameMode;
    }
}

@reloadable
export class GameMode {
    Game: CDOTABaseGameMode = GameRules.GetGameModeEntity();
    public customTimeManager: CustomTimeManager = new CustomTimeManager()
    canPlayerHeroEarnXP = false;


    private tutorial = new tut.Tutorial([
        chapters.chapter1.sectionOpening,
        chapters.chapter1.sectionCameraUnlock,
        chapters.chapter1.sectionLeveling,
        chapters.chapter1.sectionCasting,
        chapters.chapter1.sectionShopUI,
        chapters.chapter2.sectionOpening,
        chapters.chapter3.sectionOpening,
        chapters.chapter4.sectionWards,
    ]);

    playerHero?: CDOTA_BaseNPC_Hero;
    context: TutorialContext = {};

    public static Precache(this: void, context: CScriptPrecacheContext) {
        // PrecacheResource("particle", "particles/units/heroes/hero_meepo/meepo_earthbind_projectile_fx.vpcf", context);
        // PrecacheResource("soundfile", "soundevents/game_sounds_heroes/game_sounds_meepo.vsndevts", context);
    }

    public static Activate(this: void) {
        GameRules.Addon = new GameMode();
    }

    constructor() {
        this.configure();
        ListenToGameEvent("game_rules_state_change", () => this.OnStateChange(), undefined);
        ListenToGameEvent("npc_spawned", event => this.OnNpcSpawned(event), undefined);

        CustomGameEventManager.RegisterListener("skip_to_section", (_, event) => {
            print("Request to skip to section:", event.section);
            this.tutorial.startBySectionName(event.section);
        })
    }

    private configure(): void {
        this.configureGameRules();
        this.registerFilters();
    }

    configureGameRules() {
        print("Setting Gamerules");

        // Player/Team rules
        GameRules.SetCustomGameTeamMaxPlayers(DotaTeam.GOODGUYS, 5);
        GameRules.SetCustomGameTeamMaxPlayers(DotaTeam.BADGUYS, 5);

        // Game loading rules
        GameRules.EnableCustomGameSetupAutoLaunch(true);
        GameRules.SetCustomGameSetupAutoLaunchDelay(0);
        GameRules.SetShowcaseTime(0);
        GameRules.SetStrategyTime(0);
        GameRules.SetCustomGameSetupTimeout(0);
        GameRules.SetPreGameTime(0);
        GameRules.SetSafeToLeave(true);
        this.Game.SetRandomHeroBonusItemGrantDisabled(true);

        // Game start rules
        this.Game.SetFreeCourierModeEnabled(true);
        GameRules.SetGoldPerTick(0);
        GameRules.SetGoldTickTime(99999);
        GameRules.SetStartingGold(0);
        GameRules.SetUseBaseGoldBountyOnHeroes(true);
        GameRules.SetTimeOfDay(0.25); // morning!
        GameRules.SetFirstBloodActive(false);
        this.Game.SetAnnouncerDisabled(true);
        this.Game.SetCustomGameForceHero("npc_dota_hero_dragon_knight");
        this.Game.SetDaynightCycleDisabled(true);

        // Game in progress rules
        GameRules.SetCreepSpawningEnabled(false);
        GameRules.SetAllowOutpostBonuses(false);
        this.Game.SetCustomScanCooldown(99999);
        this.Game.SetCustomGlyphCooldown(99999);
        this.Game.DisableClumpingBehaviorByDefault(true);
        this.Game.SetBuybackEnabled(false);
        this.Game.SetCustomDireScore(0);
        this.Game.SetLoseGoldOnDeath(false);

        // Runes rules
        this.Game.SetRuneEnabled(RuneType.BOUNTY, false);
        this.Game.SetRuneEnabled(RuneType.ARCANE, false);
        this.Game.SetRuneEnabled(RuneType.DOUBLEDAMAGE, false);
        this.Game.SetRuneEnabled(RuneType.HASTE, false);
        this.Game.SetRuneEnabled(RuneType.ILLUSION, false);
        this.Game.SetRuneEnabled(RuneType.INVISIBILITY, false);
        this.Game.SetRuneEnabled(RuneType.REGENERATION, false);
        this.Game.SetRuneEnabled(RuneType.XP, false);

        // Leveling rules
        // Max level of 3
        this.Game.SetCustomXPRequiredToReachNextLevel(
            {
                [0]: 0,
                [1]: 10, // total XP to level up to level 2
                [2]: 60,  // total XP to level up to level 3, etc...
            }
        );

        this.Game.SetUseCustomHeroLevels(true);
        this.Game.SetAllowNeutralItemDrops(false);

        // Make the fountain unable to attack
        setUnitPacifist(getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good") as CDOTA_BaseNPC), true)
    }

    registerFilters() {
        this.Game.SetDamageFilter(event => this.DamageFilter(event), this);
        this.Game.SetExecuteOrderFilter(event => this.ExecuteOrderFilter(event), this);
        this.Game.SetModifyExperienceFilter(event => this.ModifyExperienceFilter(event), this);
        this.Game.SetModifyGoldFilter(event => this.ModifyGoldFilter(event), this);
        this.Game.SetItemAddedToInventoryFilter(event => this.ItemAddedToInventoryFilter(event), this);
    }

    DamageFilter(event: DamageFilterEvent): boolean {
        return true;
    }

    ExecuteOrderFilter(event: ExecuteOrderFilterEvent): boolean {
        // Cancel orders if false
        if (this.tutorial.currentSection && this.tutorial.currentSection.orderFilter && !this.tutorial.currentSection.orderFilter(event)) {
            return false;
        }

        return true;
    }

    ModifyExperienceFilter(event: ModifyExperienceFilterEvent): boolean {
        const hero = EntIndexToHScript(event.hero_entindex_const);
        const playerID = event.player_id_const;

        if (hero === getPlayerHero()) {
            if (!this.canPlayerHeroEarnXP) return false;
        }

        return true;
    }

    ModifyGoldFilter(event: ModifyGoldFilterEvent): boolean {
        return true;
    }

    ItemAddedToInventoryFilter(event: ItemAddedToInventoryFilterEvent): boolean {
        return true;
    }

    public OnStateChange(): void {
        const state = GameRules.State_Get();
        print(`OnStateChanged", ${state}`);

        if (state === GameState.CUSTOM_GAME_SETUP) {

            for (const pID of findAllPlayersID()) {
                PlayerResource.SetCustomTeamAssignment(pID, DotaTeam.GOODGUYS);
            }

            // Finish setup phase
            Timers.CreateTimer(0.2, () => GameRules.FinishCustomGameSetup());
        }

        // Start game once pregame hits
        if (state === GameState.PRE_GAME) {
            Timers.CreateTimer(3, () => this.StartGame());
        }

        if (state === GameState.GAME_IN_PROGRESS) {
            // Remove starting TP from player
            Timers.CreateTimer(1, () => {
                const hero = getPlayerHero();
                if (hero && hero.HasItemInInventory("item_tpscroll")) {
                    const item = hero.FindItemInInventory("item_tpscroll");
                    if (item) {
                        hero.RemoveItem(item);
                    }
                }
            });
        }
    }

    private StartGame(): void {
        print("Game starting!");

        print("Starting tutorial from scratch")
        this.tutorial.start()

    }

    // Called on script_reload
    public Reload() {
        print("Script reloaded!");
    }

    private OnNpcSpawned(event: NpcSpawnedEvent) {
        const unit = EntIndexToHScript(event.entindex);
        if (!unit) return;

        if (unit.IsBaseNPC()) {

            // Check if this is the real player's hero that just spawned, assign it to the gamemode entity if it is
            if (unit.IsRealHero()) {
                if (PlayerResource.IsValidPlayerID(unit.GetPlayerID()) && !PlayerResource.IsFakeClient(unit.GetPlayerID())) {
                    if (!this.playerHero || this.playerHero != unit) {
                        this.playerHero = unit;
                        this.OnPlayerHeroAssigned(unit);
                    }
                }
            }

            // Couriers
            if (unit.IsCourier()) {
                // Remove the passive bonuses modifiers
                Timers.CreateTimer(FrameTime(), () => {
                    if (unit.HasModifier("modifier_courier_passive_bonus")) {
                        unit.RemoveModifierByName("modifier_courier_passive_bonus");
                    }

                    const hero = getPlayerHero();
                    if (hero) {
                        hero.SetGold(0, true);
                    }
                });
            }
        }
    }

    OnPlayerHeroAssigned(hero: CDOTA_BaseNPC_Hero) {
        hero.SetAbilityPoints(0);
    }
}
