export type SectionState = {
    playerHeroLevel: number,
    playerHeroUnitName: string,
    playerHeroLocation: Vector,
    playerHeroAbilityPoints: number,
    playerHeroGold: number,
    [customSectionProperty: string]: string | number | Vector,
}
