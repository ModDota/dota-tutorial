const avatarPanel = $("#Avatar") as ImagePanel;
const nameLabel = $("#CreditsName") as LabelPanel;
const descriptionLabel = $("#CreditsDescriptionLabel") as LabelPanel;
const socialsContainer = $("#CreditsContainerContent");
const socialsCol1 = $("#CreditsSocialsColumn1");
const socialsCol2 = $("#CreditsSocialsColumn2");

const portraits: Record<string, string> = {
    [CustomNpcKeys.Angermania]: "file://{images}/custom_game/credits/avatars/Angermania.png",
    [CustomNpcKeys.Tsunami]: "file://{images}/custom_game/credits/avatars/Tsunami.png",
    [CustomNpcKeys.Translators]: "file://{images}/custom_game/credits/avatars/Translators.png",
    [CustomNpcKeys.Coccia]: "file://{images}/custom_game/credits/avatars/alexander_coccia.png",
    [CustomNpcKeys.BSJ]: "file://{images}/custom_game/credits/avatars/bsj.png",
    [CustomNpcKeys.Bowie]: "file://{images}/custom_game/credits/avatars/d2bowie.png",
    [CustomNpcKeys.DotaFromZero]: "file://{images}/custom_game/credits/avatars/dota_from_zero.png",
    [CustomNpcKeys.DotaU]: "file://{images}/custom_game/credits/avatars/dota_university.png",
    [CustomNpcKeys.Liquipedia]: "file://{images}/custom_game/credits/avatars/liquipedia.png",
    [CustomNpcKeys.PurgePugna]: "file://{images}/custom_game/credits/avatars/purge.png",
    [CustomNpcKeys.RedditDota]: "file://{images}/custom_game/credits/avatars/redditdota2.png",
    [CustomNpcKeys.Awesomedota]: "file://{images}/custom_game/credits/avatars/Awesomedota.png",
    [CustomNpcKeys.Flam3s]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.Perry]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.PongPing]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.Shush]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.SinZ]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.SmashTheState]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.Tora]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.Toyoka]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.VicFrank]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.Yoyo]: "file://{images}/custom_game/credits/avatars/Yoyo.png",
    [CustomNpcKeys.ValkyrjaRuby]: "file://{images}/custom_game/credits/avatars/Ruby.png",
    [CustomNpcKeys.ZQ]: "file://{images}/custom_game/credits/avatars/ZQ.png",
    [CustomNpcKeys.Yodi]: "file://{images}/custom_game/credits/avatars/Yodi.png",
    [CustomNpcKeys.Dotabuff]: "file://{images}/custom_game/credits/avatars/Dotabuff.png",
    [CustomNpcKeys.DotaFire]: "file://{images}/custom_game/credits/avatars/DotaFire.png",
    [CustomNpcKeys.Torte]: "file://{images}/custom_game/credits/avatars/Torte.png",
    [CustomNpcKeys.Indiegogo]: "file://{images}/custom_game/credits/avatars/Indiegogo.png",
    [CustomNpcKeys.SlacksMudGolem]: "file://{images}/custom_game/credits/avatars/Slacks.png",
    [CustomNpcKeys.SunsFanMudGolem]: "file://{images}/custom_game/credits/avatars/Sunsfan.png",
    [CustomNpcKeys.Sniper]: "file://{images}/custom_game/credits/avatars/Jenkins.png",
    [CustomNpcKeys.Sheepsticked]: "file://{images}/custom_game/credits/avatars/Sheepsticked.png",
    [CustomNpcKeys.Mirana]: "file://{images}/custom_game/credits/avatars/Sheever.png",
    [CustomNpcKeys.ODPixel]: "file://{images}/custom_game/credits/avatars/ODPixel.png",
    [CustomNpcKeys.Kunkka]: "file://{images}/custom_game/credits/avatars/Mason.png",
    [CustomNpcKeys.Ursa]: "file://{images}/custom_game/credits/avatars/Capitalist.png",
    [CustomNpcKeys.EmberSpirit]: "file://{images}/custom_game/credits/avatars/Blitz.png",
    [CustomNpcKeys.Grimstroke]: "file://{images}/custom_game/credits/avatars/TrentPax.png",
    [CustomNpcKeys.Zuus]: "file://{images}/custom_game/credits/avatars/Lyrical.png",
    [CustomNpcKeys.Undying]: "file://{images}/custom_game/credits/avatars/Synderen.png",
    [CustomNpcKeys.Riki]: "file://{images}/custom_game/credits/avatars/Artour.png",
    [CustomNpcKeys.StormSpirit]: "file://{images}/custom_game/credits/avatars/PyrionFlax.png",
};

enum SocialType {
    Twitter = "Twitter",
    Youtube = "Youtube",
    Discord = "Discord",
    Website = "Website",
    Twitch = "Twitch",
}

function makeSocialUrl(name: string, socialType: SocialType): string {
    switch (socialType) {
        case "Twitter":
            return `https://twitter.com/${name}`;
        case "Youtube":
            return `https://youtube.com/${name}`;
        case "Discord":
            return `https://discord.gg/${name}`;
        case "Twitch":
            return `https://twitch.tv/${name}`;
        case "Website":
            return `https://${name}`;
    }

    throw new Error(`Unknown social type ${name}.`);
}

GameEvents.Subscribe("credits_interact", event => {
    // Set fields on interaction panel
    if (portraits[event.name]) {
        avatarPanel.SetImage(portraits[event.name]);
    } else {
        avatarPanel.SetImage("");
    }

    nameLabel.text = $.Localize("#" + event.name);
    if (event.description) {
        descriptionLabel.text = $.Localize("#" + event.description);
    } else {
        descriptionLabel.text = "";
    }

    socialsCol1.RemoveAndDeleteChildren();
    socialsCol2.RemoveAndDeleteChildren();

    let socialCount = 0;
    for (const social of Object.values(SocialType)) {
        if (addSocialIfExists(social, event.name, socialCount % 2 === 0 ? socialsCol1 : socialsCol2)) {
            socialCount++;
        }
    }

    // Show interaction panel
    $.GetContextPanel().AddClass("Visible");
});

GameEvents.Subscribe("credits_interact_stop", () => {
    $.GetContextPanel().RemoveClass("Visible");
});

GameEvents.Subscribe("section_started", () => {
    $.GetContextPanel().RemoveClass("Visible");
});

function addSocialIfExists(social: SocialType, unitName: string, container: Panel) {
    const linkLocalizationKey = `${unitName}_${social}`;
    const socialId = $.Localize(linkLocalizationKey);
    if (socialId && socialId !== linkLocalizationKey) {
        const socialContainer = $.CreatePanel("Panel", container, "");
        socialContainer.AddClass("SocialContainer");

        const iconPanel = $.CreatePanel("Panel", socialContainer, "");
        iconPanel.AddClass(social);

        const socialName = $.CreatePanel("Label", socialContainer, "");
        socialName.AddClass("SocialMedia");
        socialName.text = social === SocialType.Discord ? "Discord" : socialId;
        socialName.hittest = true;

        socialName.SetPanelEvent("onactivate", () => $.DispatchEvent("ExternalBrowserGoToURL", socialName, makeSocialUrl(socialId, social)));

        return true;
    }

    return false;
}
