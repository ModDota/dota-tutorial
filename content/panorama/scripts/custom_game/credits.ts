const avatarPanel = $("#Avatar") as ImagePanel;
const nameLabel = $("#CreditsName") as LabelPanel;
const descriptionLabel = $("#CreditsDescriptionLabel") as LabelPanel;
const socialsContainer = $("#CreditsContainerContent");
const socialsCol1 = $("#CreditsSocialsColumn1");
const socialsCol2 = $("#CreditsSocialsColumn2");

const portraits: Record<string, string> = {
    [CustomNpcKeys.Tsunami]: "file://{images}/custom_game/credits/avatars/Tsunami.png",
    [CustomNpcKeys.Coccia]: "file://{images}/custom_game/credits/avatars/alexander_coccia.png",
    [CustomNpcKeys.BSJ]: "file://{images}/custom_game/credits/avatars/bsj.png",
    [CustomNpcKeys.Bowie]: "file://{images}/custom_game/credits/avatars/d2bowie.png",
    [CustomNpcKeys.DotaFromZero]: "file://{images}/custom_game/credits/avatars/dota_from_zero.png",
    [CustomNpcKeys.DotaU]: "file://{images}/custom_game/credits/avatars/dota_university.png",
    [CustomNpcKeys.Liquipedia]: "file://{images}/custom_game/credits/avatars/liquipedia.png",
    [CustomNpcKeys.PurgePugna]: "file://{images}/custom_game/credits/avatars/purge.png",
    [CustomNpcKeys.RedditDota]: "file://{images}/custom_game/credits/avatars/redditdota2.png",
    [CustomNpcKeys.Flam3s]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.Perry]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.PongPing]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.Shush]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.SinZ]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.SmashTheState]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.Tora]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.Toyoka]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.VicFrank]: "file://{images}/custom_game/credits/avatars/moddota.png",
    [CustomNpcKeys.Yoyo]: "file://{images}/custom_game/credits/avatars/moddota.png",
};

enum SocialType {
    Twitter = "Twitter",
    Youtube = "Youtube",
    Discord = "Discord",
    Website = "Website",
}

function makeSocialUrl(name: string, socialType: SocialType) {
    switch (socialType) {
        case "Twitter":
            return `https://twitter.com/${name}`;
            break;
        case "Youtube":
            return `https://youtube.com/${name}`;
            break;
        case "Discord":
            return `https://discord.gg/${name}`;
            break;
        case "Website":
            return `https://${name}`;
            break;
    }
}

GameEvents.Subscribe("credits_interact", event => {
    // Set fields on interaction panel
    if (portraits[event.name]) {
        avatarPanel.SetImage(portraits[event.name]);
    } else {
        avatarPanel.SetImage("");
    }

    nameLabel.text = $.Localize(event.name);
    if (event.description) {
        descriptionLabel.text = $.Localize(event.description);
    } else {
        descriptionLabel.text = "";
    }

    socialsCol1.RemoveAndDeleteChildren();
    socialsCol2.RemoveAndDeleteChildren();

    let socialCount = 0;
    for (const social of Object.values(SocialType)) {
        if (addSocialIfExists(social, event.name, socialCount < 2 ? socialsCol1 : socialsCol2)) {
            socialCount++;
        }
    }

    // Show interaction panel
    $.GetContextPanel().AddClass("Visible");
});

GameEvents.Subscribe("credits_interact_stop", () => {
    $.GetContextPanel().RemoveClass("Visible");
});



function addSocialIfExists(social: SocialType, unitName: string, container: Panel) {
    const linkLocalizationKey = `${unitName}_${social}`;
    const socialId = $.Localize(linkLocalizationKey);
    if (socialId && socialId !== linkLocalizationKey) {
        const iconPanel = $.CreatePanel("Panel", container, "");
        iconPanel.AddClass(social);

        const socialName = $.CreatePanel("Label", container, "");
        socialName.AddClass("SocialMedia");
        socialName.text = socialId;
        socialName.hittest = true;
        // TODO: Why does ExternalBrowserGoToURL not exist in ts defs?
        // socialName.SetPanelEvent("onactivate", () => ExternalBrowserGoToURL(makeSocialUrl(socialId, social)));

        return true;
    }

    return false;
}
