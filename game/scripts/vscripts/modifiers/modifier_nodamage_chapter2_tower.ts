import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { TowerHitSources } from "../Sections/Chapter2/shared";
import { getPlayerHero } from "../util";

@registerModifier()
export class modifier_nodamage_chapter2_tower extends BaseModifier {
    hitSources: TowerHitSources = TowerHitSources.NONE

    DeclareFunctions(): modifierfunction[] {
        return [modifierfunction.MODIFIER_PROPERTY_INCOMING_DAMAGE_PERCENTAGE]
    }

    GetModifierIncomingDamage_Percentage(event: ModifierAttackEvent): number {
        if (this.hitSources === TowerHitSources.NONE) {
            return -100
        } else if (this.hitSources === TowerHitSources.DK_ONLY && event.attacker !== getPlayerHero()) {
            return -100
        } else {
            return 0
        }
    }
}
