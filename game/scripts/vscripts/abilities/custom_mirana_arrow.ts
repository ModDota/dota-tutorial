import { BaseAbility, registerAbility } from "../lib/dota_ts_adapter";

@registerAbility()
export class custom_mirana_arrow extends BaseAbility
{
    caster: CDOTA_BaseNPC = this.GetCaster()
    sound_cast: string = "Hero_Mirana.ArrowCast"
    sound_impact: string = "Hero_Mirana.ArrowImpact"
    arrowParticle: string = "particles/units/heroes/hero_mirana/mirana_spell_arrow.vpcf"
    stunDuration: number = 1.2

    OnSpellStart(): void
    {
        const arrowSpeed = this.GetSpecialValueFor("arrow_speed")
        const targetPosition = this.GetCursorPosition()
        const direction = (targetPosition - (this.caster.GetAbsOrigin()) as Vector).Normalized()
        const distance = this.GetSpecialValueFor("arrow_range")

        this.caster.EmitSound(this.sound_cast);
        this.caster.StartGesture(GameActivity.DOTA_CAST_ABILITY_2)
        ProjectileManager.CreateLinearProjectile(
        {
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
            vVelocity: (direction * arrowSpeed * Vector (1,1,0)) as Vector,
        });
    }

    OnProjectileHitHandle(_target: CDOTA_BaseNPC, location: Vector, projectileId: ProjectileID) {

        ProjectileManager.DestroyLinearProjectile(projectileId)

        if (_target) {
            _target.EmitSound(this.sound_impact)

            _target.AddNewModifier(undefined, undefined, "modifier_stunned", {
                duration: this.stunDuration
            })
        }
    }
}