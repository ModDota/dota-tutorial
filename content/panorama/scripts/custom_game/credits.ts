const avatarPanel = $("#Avatar") as ImagePanel;
const nameLabel = $("#CreditsName") as LabelPanel;
const descriptionLabel = $("#CreditsDescriptionLabel") as LabelPanel;
const socialsContainer = $("#CreditsContainerContent");

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
    [CustomNpcKeys.Yoyo]: "file://{images}/custom_game/credits/avatars/moddota.png",
};

enum SocialType {
    Twitter = "Twitter",
    Youtube = "Youtube",
    Discord = "Discord",
    Website = "Website",
}

GameEvents.Subscribe("credits_interact", event => {
    // Set fields on interaction panel
    if (portraits[event.name]) {
        avatarPanel.SetImage(portraits[event.name]);
    }

    nameLabel.text = $.Localize(event.name);
    if (event.description) {
        descriptionLabel.text = $.Localize(event.description);
    } else {
        descriptionLabel.text = "";
    }

    socialsContainer.RemoveAndDeleteChildren();
    addSocialIfExists(SocialType.Twitter, event.name);
    addSocialIfExists(SocialType.Youtube, event.name);
    addSocialIfExists(SocialType.Discord, event.name);
    addSocialIfExists(SocialType.Website, event.name);

    // Show interaction panel
    $.GetContextPanel().AddClass("Visible");
});

GameEvents.Subscribe("credits_interact_stop", () => {
    $.GetContextPanel().RemoveClass("Visible");
});

function addSocialIfExists(social: SocialType, unitName: string) {
    const linkLocalizationKey = `${unitName}_${social}`;
    const link = $.Localize(linkLocalizationKey);
    if (link && link !== linkLocalizationKey) {
        const iconPanel = $.CreatePanel("Panel", socialsContainer, "");
        iconPanel.AddClass(social);

        const socialName = $.CreatePanel("Label", socialsContainer, "");
        socialName.AddClass("SocialMedia");
        socialName.text = link;

        // TODO: Manage rows/columns
        // TODO: Register link
    }
}
