import { BaseAbility, registerAbility } from "../lib/dota_ts_adapter";

@registerAbility()
export class custom_mirana_arrow extends BaseAbility {
    caster = this.GetCaster();
    soundCast = "Hero_Mirana.ArrowCast";
    soundCastVolume = 0.4;
    soundImpact = "Hero_Mirana.ArrowImpact";
    arrowParticle = "particles/units/heroes/hero_mirana/mirana_spell_arrow.vpcf";
    stunDuration = 1.2;

    OnSpellStart() {
        const arrowSpeed = this.GetSpecialValueFor("arrow_speed");
        const targetPosition = this.GetCursorPosition();
        const direction = (targetPosition - (this.caster.GetAbsOrigin()) as Vector).Normalized();
        const distance = this.GetSpecialValueFor("arrow_range");

        this.caster.EmitSoundParams(this.soundCast, 0, this.soundCastVolume, 0);
        this.caster.StartGesture(GameActivity.DOTA_CAST_ABILITY_2);
        ProjectileManager.CreateLinearProjectile({
            Ability: this,
            EffectName: this.arrowParticle,
            vSpawnOrigin: this.caster.GetAbsOrigin(),
            fDistance: distance,
            fStartRadius: 0,
            fEndRadius: 150,
            Source: this.caster,
            bHasFrontalCone: false,
            bDrawsOnMinimap: false,
            bProvidesVision: false,
            bVisibleToEnemies: true,
            iUnitTargetTeam: UnitTargetTeam.ENEMY,
            iUnitTargetType: UnitTargetType.HERO,
            vVelocity: (direction * arrowSpeed * Vector(1, 1, 0)) as Vector,
        });
    }

    OnProjectileHitHandle(target: CDOTA_BaseNPC, location: Vector, projectileId: ProjectileID) {
        ProjectileManager.DestroyLinearProjectile(projectileId);

        if (target) {
            target.EmitSound(this.soundImpact);

            target.AddNewModifier(undefined, undefined, "modifier_stunned", {
                duration: this.stunDuration
            });
        }
    }
}
