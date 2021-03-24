import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

@registerModifier()
export class modifier_dk_death_chapter2_tower extends BaseModifier {
    dkDiedToTower = false;
    dkRespawned = false

    IsHidden() { return true }
    IsPurgable() { return false }
    IsDebuff() { return false }
    RemoveOnDeath() { return false }

    DeclareFunctions(): modifierfunction[] {
        return [
            modifierfunction.MODIFIER_EVENT_ON_DEATH,
            modifierfunction.MODIFIER_PROPERTY_INCOMING_DAMAGE_PERCENTAGE,
            modifierfunction.MODIFIER_EVENT_ON_RESPAWN
        ]
    }

    OnDeath(event: ModifierAttackEvent) {
        if (!IsServer()) return;

        if (event.attacker.GetUnitName() != CustomNpcKeys.DireTopT1Tower) return;
        if (event.unit) {
            if (event.unit == this.GetParent()) {
                this.dkDiedToTower = true;
            }
        }
    }

    GetModifierIncomingDamage_Percentage(event: ModifierAttackEvent): number {
        if (!IsServer()) return 0;
        if (event.attacker.GetUnitName() != CustomNpcKeys.DireTopT1Tower) return 0

        return 800
    }

    OnRespawn(event: ModifierUnitEvent) {
        if (!IsServer()) return;
        if (event.unit === this.GetParent()) {
            if (!this.dkDiedToTower) return;
            this.dkRespawned = true
        }
    }
}
