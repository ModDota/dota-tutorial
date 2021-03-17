const avatarPanel = $("#Avatar") as ImagePanel;
const nameLabel = $("#CreditsName") as LabelPanel;
const descriptionLabel = $("#CreditsDescriptionLabel") as LabelPanel;
const socialsContainer = $("#CreditsContainerContent");

GameEvents.Subscribe("credits_interact", event => {
    // Set fields on interaction panel
    // TODO: Use correct avatar based on event.name here?
    avatarPanel.SetImage("file://{images}/custom_game/credits/avatars/Tsunami.png");
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

enum SocialType {
    Twitter = "Twitter",
    Youtube = "Youtube",
    Discord = "Discord",
    Website = "Website",
}

function addSocialIfExists(social: SocialType, unitName: string) {
    const linkLocalizationKey = `${unitName}_${social}`;
    const link = $.Localize(linkLocalizationKey);
    if (link && link !== linkLocalizationKey) {
        const iconPanel = $.CreatePanel("Panel", socialsContainer, "");
        iconPanel.AddClass(social);

        const socialName = $.CreatePanel("Label", socialsContainer, "");
        socialName.AddClass("SocialMedia");
        socialName.text = social;

        // TODO: Manage rows/columns
        // TODO: Register link
    }
}