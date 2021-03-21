import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

@registerModifier()
export class modifier_dk_attack_tower_chapter2 extends BaseModifier {
    dkAttackedTower = false
    dkCanAttackTowerAgainBeforeGlyph = false
    dkAttackedTowerAgainBeforeGlyph = false
    dkDestroyedTower = false

    IsHidden() { return true }
    IsPurgable() { return false }
    IsDebuff() { return false }
    RemoveOnDeath() { return false }

    DeclareFunctions(): modifierfunction[] {
        return [
            modifierfunction.MODIFIER_EVENT_ON_ATTACK_LANDED,
            modifierfunction.MODIFIER_EVENT_ON_DEATH
        ]
    }

    OnAttackLanded(event: ModifierAttackEvent) {
        if (!IsServer()) return;

        if (event.attacker != this.GetParent()) return;
        if (event.target.GetUnitName() != CustomNpcKeys.DireTopT1Tower) return;

        this.dkAttackedTower = true

        if (this.dkCanAttackTowerAgainBeforeGlyph) {
            this.dkAttackedTowerAgainBeforeGlyph = true
        }
    }

    OnDeath(event: ModifierAttackEvent) {
        if (!IsServer()) return;

        if (event.attacker != this.GetParent()) return;
        if (event.unit) {
            if (event.unit.GetUnitName() !== CustomNpcKeys.DireTopT1Tower) return;

            this.dkDestroyedTower = true
        }
    }
}
