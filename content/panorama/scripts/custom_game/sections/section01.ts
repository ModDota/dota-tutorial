GameUI.CustomUIConfig().SectionSelector.RegisterSection(
    SectionName.Opening,
    {
        panel: $.GetContextPanel(),
        onShow: () => {
            $.Msg("onShow section01");
        },
        onHide: () => {
            $.Msg("onHide Section01");
        }
    }
);