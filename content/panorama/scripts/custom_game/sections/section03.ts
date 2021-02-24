GameUI.CustomUIConfig().SectionSelector.RegisterSection(
    SectionName.Section03,
    {
        panel: $.GetContextPanel(),
        onShow: () => {
            $.Msg("onShow section03");
        },
        onHide: () => {
            $.Msg("onHide Section03");
        }
    }
);