declare const enum SectionName {
    Chapter1_Opening = "Chapter1_Opening",
    Chapter1_Movement = "Chapter1_Movement",
    Chapter1_CameraUnlock = "Chapter1_CameraUnlock",
    Chapter1_Leveling = "Chapter1_Leveling",
    Chapter1_Casting = "Chapter1_Casting",
    Chapter1_ShopUI = "Chapter1_ShopUI",
    Chapter2_Opening = "Chapter2_Opening",
    Chapter2_Creeps = "Chapter2_Creeps",
    Chapter2_Tower = "Chapter2_Tower",
    Chapter2_Courier = "Chapter2_Courier",
    Chapter3_Opening = "Chapter3_Opening",
    Chapter4_Opening = "Chapter4_Opening",
    Chapter4_Wards = "Chapter4_Wards",
    Chapter4_Outpost = "Chapter4_Outpost",
    Chapter4_Communication = "Chapter4_Communication",
    Chapter5_Opening = "Chapter5_Opening",
    Chapter5_Roshan = "Chapter5_Roshan",
    Chapter5_TeamFight = "Chapter5_TeamFight",
    Chapter6_Opening = "Chapter6_Opening",
    Chapter6_Closing = "Chapter6_Closing",
}

declare const enum CustomNpcKeys {
    SlacksMudGolem = "npc_mud_golem_slacks",
    SunsFanMudGolem = "npc_mud_golem_sunsfan",
    GodzMudGolem = "npc_mud_golem_godz",
    ODPixelMudGolem = "npc_mud_golem_odpixel",
    Mirana = "npc_dota_hero_mirana",
    DireRangedCreep = "npc_dota_tutorial_dire_ranged_creep",
    DireMeleeCreep = "npc_dota_tutorial_dire_melee_creep",
    RadiantRangedCreep = "npc_dota_tutorial_radiant_ranged_creep",
    RadiantMeleeCreep = "npc_dota_tutorial_radiant_melee_creep",
    Riki = "npc_dota_hero_riki",
    TargetDummy = "npc_dota_tutorial_target_dummy",
    PurgePugna = "npc_dota_hero_pugna",
    DireTopT1Tower = "npc_dota_badguys_tower1_top",
    Sniper = "npc_dota_hero_sniper",
    Juggernaut = "npc_dota_hero_juggernaut",
    Zuus = "npc_dota_hero_zuus",
    CrystalMaiden = "npc_dota_hero_crystal_maiden",
    Lion = "npc_dota_hero_lion",
    StormSpirit = "npc_dota_hero_storm_spirit",
    MiranaIllusionOne = "mirana_illusion_one",
    MiranaIllusionTwo = "mirana_illusion_two",
    Tidehunter = "npc_dota_hero_tidehunter",
    Antimage = "npc_dota_hero_antimage",
    Luna = "npc_dota_hero_luna",
    Lina = "npc_dota_hero_lina",
    Jakiro = "npc_dota_hero_jakiro",
    Visage = "npc_dota_hero_visage",
    Pudge = "npc_dota_hero_pudge",
    Wisp = "npc_dota_hero_wisp",
    Roshan = "npc_dota_roshan",
    Axe = "npc_dota_hero_axe",
    Centaur = "npc_dota_hero_centaur",
    Invoker = "npc_dota_hero_invoker",
    PhantomAssassin = "npc_dota_hero_phantom_assassin",
    Windrunner = "npc_dota_hero_windrunner",

    // Guides / Personalities
    DotaU = "npc_dota_tutorial_dotau",
    Liquipedia = "npc_dota_tutorial_liquipedia",

    // Modders (have no personalities apparently)
    Flam3s = "npc_dota_tutorial_flam3s",
    Perry = "npc_dota_tutorial_perry",
    PongPing = "npc_dota_tutorial_pongping",
    Shush = "npc_dota_tutorial_shush",
    SinZ = "npc_dota_tutorial_sinz",
    SmashTheState = "npc_dota_tutorial_smashthestate",
    Tora = "npc_dota_tutorial_tora",
    Toyoka = "npc_dota_tutorial_toyoka",
    VicFrank = "npc_dota_tutorial_vicfrank",
    Yoyo = "npc_dota_tutorial_yoyo",

    // Helpers
    ValkyrjaRuby = "npc_dota_hero_templar_assassin",
}

declare const enum CustomEntityKeys {
    RadiantTopBountyFOWViewer = "radiant_top_bounty_fow_viewer",
    RadiantAncientsBountyFOWViewer = "radiant_ancients_bounty_fow_viewer",
    DireBotBountyFOWViewer = "dire_bot_bounty_fow_viewer",
    DireAncientsBountyFOWViewer = "dire_ancients_bounty_fow_viewer",
    RadiantTopBountyRune = "radiant_top_bounty_rune",
    RadiantAncientsBountyRune = "radiant_ancients_bounty_rune",
    DireBotBountyRune = "dire_bot_bounty_rune",
    DireAncientsBountyRune = "dire_ancients_bounty_rune",
    TopPowerRune = "top_power_rune"
}

declare const enum CustomAbilityKeys {
    CustomMiranaArrow = "custom_mirana_arrow",
}

type Goal = {
    text: string;
    completed: boolean;
};

declare const enum ModifierKey {
    Alt,
    Shift,
    Control,
}

declare const enum ParticleName {
    HighlightCircle = "particles/tutorial_highlight.vpcf",
    HighlightOrangeArrow = "particles/tutorial_arrow.vpcf",
    HighlightOrangeCircle = "particles/tutorial_arrow_ring.vpcf",
    HighlightRedArrow = "particles/tutorial_arrow_attack.vpcf",
    HighlightRedCircle = "particles/tutorial_arrow_attack_ring.vpcf",
    Path = "particles/tutorial_path.vpcf",
    QuestionMarks = "particles/tutorial_question_marks.vpcf",
    MoveToLocation = "particles/newplayer_fx/npx_moveto_goal.vpcf",
}

type VideoName = "guides" | "muting"

type DialogToken = number
