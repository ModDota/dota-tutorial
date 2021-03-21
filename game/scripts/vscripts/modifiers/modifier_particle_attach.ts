import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

@registerModifier()
export class modifier_particle_attach extends BaseModifier {
    particleID?: ParticleID

    GetAttributes() { return DOTAModifierAttribute_t.MODIFIER_ATTRIBUTE_MULTIPLE }

    IsHidden() { return true }
    IsPurgable() { return false }
    IsDebuff() { return false }
    RemoveOnDeath() { return true }
}
