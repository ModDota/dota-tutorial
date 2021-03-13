import * as dg from "../Dialog"
import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { LastHitStages } from "../Sections/Chapter2/shared";
import { isCustomLaneCreepUnit } from "../util";

@registerModifier()
export class modifier_dk_last_hit_chapter2_creeps extends BaseModifier {
    IsHidden() { return true }
    IsPurgable() { return false }
    IsDebuff() { return false }
    RemoveOnDeath() { return false }

    currentStage: LastHitStages = LastHitStages.LAST_HIT
    private successLocalizationKeys: LocalizationKey[] = [LocalizationKey.Script_2_Creeps_5, LocalizationKey.Script_2_Creeps_6, LocalizationKey.Script_2_Creeps_7]
    private missLocalizationKeys: LocalizationKey[] = [LocalizationKey.Script_2_Creeps_8, LocalizationKey.Script_2_Creeps_9, LocalizationKey.Script_2_Creeps_10]
    dialogFinishedPlaying: boolean = false

    lastHits?: number
    lastHitBreatheFire?: number
    denies?: number

    OnCreated(keys: { lastHits: number, lastHitBreatheFire: number, denies: number }) {
        if (!IsServer()) return;
        this.SetStackCount(0);

        if (keys) {
            this.lastHits = keys.lastHits
            this.lastHitBreatheFire = keys.lastHitBreatheFire
            this.denies = keys.denies
        }
    }

    OnRefresh() {
        if (!IsServer()) return;
        this.SetStackCount(0);
    }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.ON_DEATH,
        ModifierFunction.MANA_REGEN_CONSTANT]
    }

    GetModifierConstantManaRegen(): number {
        if (!IsServer()) return 0;
        if (this.currentStage == LastHitStages.LAST_HIT_BREATHE_FIRE) return 10;
        else return 0;
    }

    OnDeath(event: ModifierAttackEvent) {
        if (!IsServer()) return;

        switch (this.currentStage) {
            case LastHitStages.LAST_HIT:
                this.LastHit(event);
                break;

            case LastHitStages.LAST_HIT_BREATHE_FIRE:
                this.LastHitBreathFire(event);
                break;

            case LastHitStages.LAST_HIT_DENY:
                this.LastHitDeny(event);
                break;
        }
    }

    CheckState(): Partial<Record<ModifierState, boolean>> {
        return { [ModifierState.LOW_ATTACK_PRIORITY]: true }
    }

    LastHit(event: ModifierAttackEvent) {
        // Ignore if we already reached the maximum
        if (this.lastHits && this.GetStackCount() === this.lastHits) return;

        if (event.attacker != this.GetParent()) {
            // Check if killer is on DK's team
            if (event.attacker.GetTeamNumber() == this.GetParent().GetTeamNumber()) {
                // Check if DK's is in 300 distance from the dying unit
                if (event.unit) {
                    const distance = ((this.GetParent().GetAbsOrigin() - event.unit.GetAbsOrigin()) as Vector).Length2D()
                    if (distance <= 300) {
                        // Play "you missed!" sound from Godz - currently text, later will change to audio when we'll have actual sounds
                        const chosenLocalizaionKey = this.missLocalizationKeys[RandomInt(0, this.missLocalizationKeys.length - 1)];
                        dg.playText(chosenLocalizaionKey, GameRules.Addon.context[CustomNpcKeys.GodzMudGolem], 3)
                    }
                }
            }

            return;
        }

        if (event.unit) {
            if (!isCustomLaneCreepUnit(event.unit)) return;
            if (event.unit.GetTeamNumber() == this.GetParent().GetTeamNumber()) return;
        }

        // Play "nice hit!" sound from Godz - currently text, later will change to audio when we'll have actual sounds
        const chosenLocalizationKey = this.successLocalizationKeys[RandomInt(0, this.successLocalizationKeys.length - 1)]

        // Only the last dialog tags dialogFinishedPlaying
        if (this.lastHits && this.lastHits - 1 === this.GetStackCount()) {
            dg.playText(chosenLocalizationKey, GameRules.Addon.context[CustomNpcKeys.GodzMudGolem], 3, () => {
                this.dialogFinishedPlaying = true
            })
        }
        else {
            dg.playText(chosenLocalizationKey, GameRules.Addon.context[CustomNpcKeys.GodzMudGolem], 3)
        }

        this.IncrementStackCount();
    }

    LastHitBreathFire(event: ModifierAttackEvent) {
        // Ignore if we already reached the maximum
        if (this.lastHitBreatheFire && this.lastHitBreatheFire === this.GetStackCount()) return;

        if (event.attacker != this.GetParent()) return;
        if (event.inflictor != this.GetParent().FindAbilityByName("dragon_knight_breathe_fire")) return

        if (event.unit) {
            if (!isCustomLaneCreepUnit(event.unit)) return;
            if (event.unit.GetTeamNumber() == this.GetParent().GetTeamNumber()) return;
        }

        this.IncrementStackCount();
    }

    LastHitDeny(event: ModifierAttackEvent) {
        // Ignore if we already reached the maximum
        if (this.denies && this.denies === this.GetStackCount()) return

        if (event.attacker != this.GetParent()) return;

        if (event.unit) {
            if (!isCustomLaneCreepUnit(event.unit)) return;
            if (event.unit.GetTeamNumber() != this.GetParent().GetTeamNumber()) return;
        }

        this.IncrementStackCount();
    }

    setCurrentState(newState: LastHitStages) {
        this.currentStage = newState;
        this.SetStackCount(0);
    }
}
