GameUI.CustomUIConfig().SectionSelector.RegisterSection(
    SectionName.Section02,
    {
        panel: $.GetContextPanel(),
        onShow: () => {
            $.Msg("onShow section02");
        },
        onHide: () => {
            $.Msg("onHide Section02");
        }
    }
);