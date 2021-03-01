import { BaseAbility, registerAbility } from "../lib/dota_ts_adapter";

@registerAbility()
export class custom_mirana_arrow extends BaseAbility
{
    // Ability properties
    caster: CDOTA_BaseNPC = this.GetCaster()
    sound_cast: string = "Hero_Mirana.ArrowCast"
    sound_impact: string = "Hero_Mirana.ArrowImpact"
    distance?: number;
    arrowParticle: string = "particles/units/heroes/hero_mirana/mirana_spell_arrow.vpcf"
    arrowProjectileId?: ProjectileID

    OnSpellStart(): void
    {
        const arrowSpeed = this.GetSpecialValueFor("arrow_speed")
        const targetPosition = this.GetCursorPosition()
        const direction = (targetPosition - (this.caster.GetAbsOrigin()) as Vector).Normalized()
        this.distance = ((this.caster.GetAbsOrigin() - targetPosition) as Vector).Length2D()

        this.caster.EmitSound(this.sound_cast);

        this.arrowProjectileId = ProjectileManager.CreateLinearProjectile(
        {
            Ability: this,
            EffectName: this.arrowParticle,
            vSpawnOrigin: this.caster.GetAbsOrigin(),
            fDistance: this.distance,
            fStartRadius: 0,
            fEndRadius: 0,
            Source: this.caster,
            bHasFrontalCone: false,
            bDrawsOnMinimap: false,
            bProvidesVision: false,
            bVisibleToEnemies: true,
            iUnitTargetTeam: UnitTargetTeam.ENEMY,
            iUnitTargetType: UnitTargetType.HERO,
            vVelocity: (direction * arrowSpeed * Vector (1,1,0)) as Vector
        });
    }

    OnProjectileHit(_target: CDOTA_BaseNPC) {
        if (!_target) {
            GameRules.Addon.context[ContextKeys.PlayerDodgedArrow] = true
        }
        else {
            _target.EmitSound(this.sound_impact)

            if (this.arrowProjectileId)
                ProjectileManager.DestroyLinearProjectile(this.arrowProjectileId)

            _target.AddNewModifier(undefined, undefined, "modifier_stunned", {
                duration: 2
            })

            let order: ExecuteOrderOptions = {
                UnitIndex: this.caster.GetEntityIndex(),
                OrderType: UnitOrder.CAST_POSITION,
                Position: _target.GetAbsOrigin(),
                AbilityIndex: this.GetEntityIndex(),
                Queue: true
            };

            ExecuteOrderFromTable(order)
        }
    }
}
